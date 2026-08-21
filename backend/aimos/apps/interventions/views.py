from rest_framework import generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone

from .models import Intervention
from .serializers import InterventionListSerializer, InterventionDetailSerializer


class InterventionListCreateView(generics.ListCreateAPIView):
    queryset = Intervention.objects.select_related('equipment', 'technician').order_by('-created_at')
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['reference', 'equipment__name', 'description']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InterventionDetailSerializer
        return InterventionListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        intervention_type = self.request.query_params.get('type')
        technician = self.request.query_params.get('technician')
        equipment = self.request.query_params.get('equipment')

        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if intervention_type:
            qs = qs.filter(intervention_type=intervention_type)
        if technician:
            qs = qs.filter(technician_id=technician)
        if equipment:
            qs = qs.filter(equipment__reference=equipment)
        return qs


class InterventionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Intervention.objects.select_related('equipment', 'technician', 'created_by')
    serializer_class = InterventionDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'reference'


class MyInterventionsView(generics.ListAPIView):
    """List interventions assigned to the current user (for technicians)."""
    serializer_class = InterventionListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Intervention.objects.filter(technician=user).select_related('equipment').order_by('-created_at')
        return Intervention.objects.none()


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def start_intervention(request, reference):
    """Technician starts an intervention."""
    try:
        intervention = Intervention.objects.get(reference=reference)
    except Intervention.DoesNotExist:
        return Response({'error': 'Intervention not found'}, status=404)

    if intervention.status not in ('assigned', 'planned'):
        return Response({'error': 'Cannot start this intervention'}, status=400)

    intervention.status = 'in_progress'
    intervention.started_at = timezone.now()
    intervention.save(update_fields=['status', 'started_at', 'updated_at'])
    # Log activity
    from aimos.apps.activity.utils import log_activity
    user = request.user if request.user.is_authenticated else None
    log_activity(user, 'intervention_started', f"A démarré l'intervention {reference} sur {intervention.equipment.name}", 'intervention', reference)
    # Notify maintenance managers
    from aimos.apps.alerts.models import Notification
    from django.contrib.auth import get_user_model
    User = get_user_model()
    managers = User.objects.filter(is_active=True, profile__role_title='Responsable maintenance')
    tech_name = f"{request.user.first_name} {request.user.last_name}".strip() if request.user.is_authenticated else 'Technicien'
    for mgr in managers:
        Notification.objects.create(
            recipient=mgr,
            notification_type='intervention_assigned',
            title=f"{tech_name} a démarré {reference}",
            message=f"{tech_name} a démarré l'intervention {reference} sur {intervention.equipment.name}",
        )
    return Response(InterventionDetailSerializer(intervention).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def close_intervention(request, reference):
    """Technician closes an intervention with a report."""
    try:
        intervention = Intervention.objects.get(reference=reference)
    except Intervention.DoesNotExist:
        return Response({'error': 'Intervention not found'}, status=404)

    if intervention.status != 'in_progress':
        return Response({'error': 'Cannot close this intervention'}, status=400)

    report = request.data.get('report', '')
    intervention.status = 'closed'
    intervention.closed_at = timezone.now()
    intervention.report = report
    intervention.save(update_fields=['status', 'closed_at', 'report', 'updated_at'])
    # Log activity
    from aimos.apps.activity.utils import log_activity
    user = request.user if request.user.is_authenticated else None
    log_activity(user, 'intervention_closed', f"A clôturé l'intervention {reference} sur {intervention.equipment.name}", 'intervention', reference)
    # Notify maintenance managers
    from aimos.apps.alerts.models import Notification
    from django.contrib.auth import get_user_model
    User = get_user_model()
    managers = User.objects.filter(is_active=True, profile__role_title='Responsable maintenance')
    tech_name = f"{request.user.first_name} {request.user.last_name}".strip() if request.user.is_authenticated else 'Technicien'
    for mgr in managers:
        Notification.objects.create(
            recipient=mgr,
            notification_type='intervention_closed',
            title=f"{tech_name} a clôturé {reference}",
            message=f"{tech_name} a terminé l'intervention {reference} sur {intervention.equipment.name}",
        )
    return Response(InterventionDetailSerializer(intervention).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def intervention_stats(request):
    """Stats for the dashboard."""
    total = Intervention.objects.count()
    planned = Intervention.objects.filter(status='planned').count()
    assigned = Intervention.objects.filter(status='assigned').count()
    in_progress = Intervention.objects.filter(status='in_progress').count()
    closed = Intervention.objects.filter(status='closed').count()

    return Response({
        'total': total,
        'planned': planned,
        'assigned': assigned,
        'in_progress': in_progress,
        'closed': closed,
        'pending': planned + assigned,
    })
