from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db import models as db_models

from .models_checklist import (
    MaintenanceChecklist, ChecklistItem,
    InterventionChecklistProgress, InterventionRequest
)
from .models import Intervention
from .serializers_checklist import (
    MaintenanceChecklistSerializer, MaintenanceChecklistCreateSerializer,
    ChecklistProgressSerializer,
    InterventionRequestListSerializer, InterventionRequestCreateSerializer,
)


# ============================================================
# CHECKLISTS
# ============================================================

class ChecklistListCreateView(generics.ListCreateAPIView):
    queryset = MaintenanceChecklist.objects.select_related('category', 'equipment').prefetch_related('items')
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MaintenanceChecklistCreateSerializer
        return MaintenanceChecklistSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        equipment = self.request.query_params.get('equipment')
        if category:
            qs = qs.filter(category_id=category)
        if equipment:
            from aimos.apps.equipment.models import Equipment
            try:
                eq = Equipment.objects.get(reference=equipment)
                qs = qs.filter(db_models.Q(equipment=eq) | db_models.Q(category=eq.category, equipment__isnull=True))
            except Equipment.DoesNotExist:
                qs = qs.none()
        return qs


class ChecklistDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceChecklist.objects.prefetch_related('items')
    serializer_class = MaintenanceChecklistSerializer
    permission_classes = [permissions.AllowAny]


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def checklist_for_equipment(request, equipment_ref):
    """Get applicable checklists for an equipment (by category or specific)."""
    from aimos.apps.equipment.models import Equipment
    try:
        eq = Equipment.objects.select_related('category').get(reference=equipment_ref)
    except Equipment.DoesNotExist:
        return Response({'error': 'Equipment not found'}, status=404)

    checklists = MaintenanceChecklist.objects.filter(
        db_models.Q(equipment=eq) | db_models.Q(category=eq.category, equipment__isnull=True)
    ).prefetch_related('items')

    serializer = MaintenanceChecklistSerializer(checklists, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def intervention_checklist_progress(request, reference):
    """
    GET: Get checklist progress for an intervention.
    POST: Update item completion status.
    """
    try:
        intervention = Intervention.objects.select_related('equipment', 'equipment__category').get(reference=reference)
    except Intervention.DoesNotExist:
        return Response({'error': 'Intervention not found'}, status=404)

    if request.method == 'GET':
        progress = InterventionChecklistProgress.objects.filter(
            intervention=intervention
        ).select_related('item').order_by('item__order')

        # If no progress exists yet, create from applicable checklists
        if not progress.exists():
            eq = intervention.equipment
            # Priority: 1) checklist linked to this specific intervention, 2) linked to equipment, 3) linked to category
            checklists = MaintenanceChecklist.objects.filter(
                db_models.Q(intervention=intervention) |
                db_models.Q(equipment=eq, intervention__isnull=True) |
                db_models.Q(category=eq.category, equipment__isnull=True, intervention__isnull=True)
            ).prefetch_related('items').distinct()

            for checklist in checklists:
                for item in checklist.items.all():
                    InterventionChecklistProgress.objects.get_or_create(
                        intervention=intervention,
                        checklist=checklist,
                        item=item,
                    )

            progress = InterventionChecklistProgress.objects.filter(
                intervention=intervention
            ).select_related('item').order_by('item__order')

        serializer = ChecklistProgressSerializer(progress, many=True)
        return Response({
            'intervention': reference,
            'total_items': progress.count(),
            'completed_items': progress.filter(is_completed=True).count(),
            'items': serializer.data,
        })

    elif request.method == 'POST':
        item_id = request.data.get('item_id')
        is_completed = request.data.get('is_completed', True)
        notes = request.data.get('notes', '')

        try:
            progress_item = InterventionChecklistProgress.objects.get(
                intervention=intervention, item_id=item_id
            )
        except InterventionChecklistProgress.DoesNotExist:
            return Response({'error': 'Checklist item not found for this intervention'}, status=404)

        progress_item.is_completed = is_completed
        progress_item.notes = notes
        if is_completed:
            progress_item.completed_at = timezone.now()
            progress_item.completed_by = request.user if request.user.is_authenticated else None
        else:
            progress_item.completed_at = None
            progress_item.completed_by = None
        progress_item.save()

        return Response({'status': 'ok', 'item_id': item_id, 'is_completed': is_completed})


# ============================================================
# INTERVENTION REQUESTS (DI)
# ============================================================

class InterventionRequestListCreateView(generics.ListCreateAPIView):
    queryset = InterventionRequest.objects.select_related('equipment', 'submitted_by')
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InterventionRequestCreateSerializer
        return InterventionRequestListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        # If user is not maintenance manager, show only their own requests
        if self.request.user.is_authenticated:
            try:
                role = self.request.user.profile.role_title
            except Exception:
                role = ''
            if role not in ('Responsable maintenance', 'Maintenance Manager', 'Superviseur', 'Supervisor', ''):
                qs = qs.filter(submitted_by=self.request.user)
        return qs


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def approve_request(request, pk):
    """Approve a DI and create an intervention from it."""
    try:
        di = InterventionRequest.objects.get(pk=pk)
    except InterventionRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)

    if di.status != 'pending':
        return Response({'error': 'Request already processed'}, status=400)

    # Create intervention from the DI
    intervention = Intervention(
        equipment=di.equipment,
        intervention_type='corrective',
        priority=di.priority,
        description=di.description,
        status='planned',
    )
    intervention.save()

    # Update DI
    di.status = 'approved'
    di.reviewed_by = request.user if request.user.is_authenticated else None
    di.reviewed_at = timezone.now()
    di.intervention = intervention
    di.save()

    # Log activity
    from aimos.apps.activity.utils import log_activity
    user = request.user if request.user.is_authenticated else None
    log_activity(user, 'intervention_created', f"A approuvé la DI {di.reference} → Intervention {intervention.reference}", 'intervention', intervention.reference)

    # Notify the submitter
    from aimos.apps.alerts.models import Notification
    if di.submitted_by:
        Notification.objects.create(
            recipient=di.submitted_by,
            notification_type='intervention_assigned',
            title=f"Demande approuvée : {di.reference}",
            message=f"Votre demande d'intervention '{di.title}' a été approuvée. Intervention {intervention.reference} créée.",
        )

    return Response({
        'status': 'approved',
        'intervention_reference': intervention.reference,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reject_request(request, pk):
    """Reject a DI."""
    try:
        di = InterventionRequest.objects.get(pk=pk)
    except InterventionRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)

    if di.status != 'pending':
        return Response({'error': 'Request already processed'}, status=400)

    reason = request.data.get('reason', '')
    di.status = 'rejected'
    di.reviewed_by = request.user if request.user.is_authenticated else None
    di.reviewed_at = timezone.now()
    di.rejection_reason = reason
    di.save()

    # Notify the submitter
    from aimos.apps.alerts.models import Notification
    if di.submitted_by:
        Notification.objects.create(
            recipient=di.submitted_by,
            notification_type='intervention_closed',
            title=f"Demande rejetée : {di.reference}",
            message=f"Votre demande '{di.title}' a été rejetée. Raison : {reason or 'Non spécifiée'}",
        )

    return Response({'status': 'rejected'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def request_stats(request):
    """Stats for DI page."""
    total = InterventionRequest.objects.count()
    pending = InterventionRequest.objects.filter(status='pending').count()
    approved = InterventionRequest.objects.filter(status='approved').count()
    rejected = InterventionRequest.objects.filter(status='rejected').count()
    return Response({
        'total': total,
        'pending': pending,
        'approved': approved,
        'rejected': rejected,
    })
