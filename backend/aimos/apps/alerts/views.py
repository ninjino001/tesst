from django.utils import timezone
from rest_framework import generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Alert
from .serializers import AlertListSerializer, AlertDetailSerializer


class AlertListCreateView(generics.ListCreateAPIView):
    serializer_class = AlertListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['reference', 'equipment__name', 'message']

    def get_queryset(self):
        queryset = Alert.objects.select_related('equipment', 'sensor')
        status = self.request.query_params.get('status')
        level = self.request.query_params.get('level')
        equipment = self.request.query_params.get('equipment')

        if status:
            queryset = queryset.filter(status=status)
        if level:
            queryset = queryset.filter(level=level)
        if equipment:
            # Support both numeric ID and reference (EQP-0001)
            if equipment.startswith('EQP'):
                queryset = queryset.filter(equipment__reference=equipment)
            else:
                queryset = queryset.filter(equipment_id=equipment)

        return queryset


class AlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AlertDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Alert.objects.select_related(
        'equipment', 'sensor', 'acknowledged_by', 'resolved_by'
    )
    lookup_field = 'reference'


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def alert_stats(request):
    total = Alert.objects.count()
    active = Alert.objects.filter(status='active').count()
    acknowledged = Alert.objects.filter(status='acknowledged').count()
    resolved = Alert.objects.filter(status='resolved').count()
    critical = Alert.objects.filter(status='active', level='critical').count()

    return Response({
        'total': total,
        'active': active,
        'acknowledged': acknowledged,
        'resolved': resolved,
        'critical': critical,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def acknowledge_alert(request, reference):
    try:
        alert = Alert.objects.get(reference=reference)
    except Alert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=404)

    alert.status = 'acknowledged'
    alert.acknowledged_at = timezone.now()
    alert.acknowledged_by = request.user if request.user.is_authenticated else None
    alert.save()

    # Log activity
    from aimos.apps.activity.utils import log_activity
    user = request.user if request.user.is_authenticated else None
    log_activity(user, 'alert_acknowledged', f"A pris en charge l'alerte {reference} ({alert.equipment.name})", 'alert', reference)

    serializer = AlertDetailSerializer(alert)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resolve_alert(request, reference):
    try:
        alert = Alert.objects.get(reference=reference)
    except Alert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=404)

    alert.status = 'resolved'
    alert.resolved_at = timezone.now()
    alert.resolved_by = request.user if request.user.is_authenticated else None
    alert.save()

    # Log activity
    from aimos.apps.activity.utils import log_activity
    user = request.user if request.user.is_authenticated else None
    log_activity(user, 'alert_resolved', f"A résolu l'alerte {reference} ({alert.equipment.name})", 'alert', reference)

    serializer = AlertDetailSerializer(alert)
    return Response(serializer.data)



# ============================================================
# NOTIFICATIONS
# ============================================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def notification_list(request):
    """Get notifications for the current user. Returns unread count + recent notifications."""
    from .models import Notification

    if not request.user.is_authenticated:
        return Response({'unread_count': 0, 'notifications': []})

    notifications = Notification.objects.filter(recipient=request.user).order_by('-created_at')[:20]
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    data = []
    for notif in notifications:
        data.append({
            'id': notif.id,
            'type': notif.notification_type,
            'title': notif.title,
            'message': notif.message,
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat(),
            'alert_reference': notif.alert.reference if notif.alert else None,
        })

    return Response({
        'unread_count': unread_count,
        'notifications': data,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mark_notifications_read(request):
    """Mark specific notifications as read."""
    from .models import Notification

    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=401)

    ids = request.data.get('ids', [])
    if ids:
        Notification.objects.filter(recipient=request.user, id__in=ids).update(is_read=True)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the current user."""
    from .models import Notification

    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=401)

    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})
