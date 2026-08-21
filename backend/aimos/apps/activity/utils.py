"""
Helper function to log user activity.
Usage:
    from aimos.apps.activity.utils import log_activity
    log_activity(user, 'intervention_created', 'A créé l\'intervention INT-2026-001', 'intervention', 'INT-2026-001')
"""


def log_activity(user, action, description, target_type='', target_reference=''):
    """
    Create an ActivityLog entry.
    - user: User instance or None (for system actions)
    - action: one of the ACTION_CHOICES values
    - description: human-readable description
    - target_type: 'intervention', 'alert', 'equipment', 'sensor'
    - target_reference: e.g. 'INT-2026-001', 'ALR-2026-003', 'EQP-0011'
    """
    from .models import ActivityLog

    ActivityLog.objects.create(
        user=user if user and hasattr(user, 'pk') and user.pk else None,
        action=action,
        description=description,
        target_type=target_type,
        target_reference=target_reference,
    )
