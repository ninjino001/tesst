from django.db import models
from django.conf import settings


class ActivityLog(models.Model):
    """Tracks all user actions in the system for the Supervisor's activity feed."""

    ACTION_CHOICES = [
        # Interventions
        ('intervention_created', 'Intervention créée'),
        ('intervention_assigned', 'Intervention affectée'),
        ('intervention_started', 'Intervention démarrée'),
        ('intervention_closed', 'Intervention clôturée'),
        # Alerts
        ('alert_acknowledged', 'Alerte prise en charge'),
        ('alert_resolved', 'Alerte résolue'),
        # Equipment
        ('equipment_created', 'Équipement ajouté'),
        ('equipment_updated', 'Équipement modifié'),
        # Sensors
        ('sensor_created', 'Capteur ajouté'),
        ('alert_triggered', 'Alerte déclenchée automatiquement'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()

    # Optional references to related objects
    target_type = models.CharField(max_length=30, blank=True)  # 'intervention', 'alert', 'equipment'
    target_reference = models.CharField(max_length=30, blank=True)  # INT-2026-001, ALR-2026-005, EQP-0011

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]

    def __str__(self):
        username = self.user.username if self.user else 'Système'
        return f"[{self.created_at:%d/%m %H:%M}] {username} — {self.get_action_display()}"
