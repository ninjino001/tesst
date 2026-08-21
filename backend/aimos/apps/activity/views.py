from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ActivityLog


@api_view(['GET'])
@permission_classes([AllowAny])
def activity_log_list(request):
    """
    Returns the activity log feed.
    Query params:
      - action: filter by action type
      - limit: number of entries (default 50)
    """
    qs = ActivityLog.objects.select_related('user').order_by('-created_at')

    action = request.query_params.get('action')
    if action:
        qs = qs.filter(action=action)

    limit = int(request.query_params.get('limit', 50))
    qs = qs[:limit]

    data = []
    for log in qs:
        data.append({
            'id': log.id,
            'user': log.user.username if log.user else None,
            'user_full_name': f"{log.user.first_name} {log.user.last_name}".strip() if log.user else 'Système',
            'action': log.action,
            'action_display': log.get_action_display(),
            'description': log.description,
            'target_type': log.target_type,
            'target_reference': log.target_reference,
            'created_at': log.created_at.isoformat(),
        })

    return Response(data)
