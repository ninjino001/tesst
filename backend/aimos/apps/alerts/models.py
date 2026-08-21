from django.conf import settings
from django.db import models
from django.utils import timezone


class Alert(models.Model):
    LEVEL_CHOICES = [
        ('critical', 'Critical'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]

    reference = models.CharField(max_length=20, unique=True)
    equipment = models.ForeignKey(
        'equipment.Equipment',
        on_delete=models.CASCADE,
        related_name='alerts',
    )
    sensor = models.ForeignKey(
        'sensors.Sensor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
    )
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='info')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    message = models.TextField()
    measured_value = models.FloatField(null=True, blank=True)
    threshold_value = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['equipment', '-created_at']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.get_level_display()} - {self.equipment}"

    def save(self, *args, **kwargs):
        if not self.reference:
            year = timezone.now().year
            last_alert = (
                Alert.objects.filter(reference__startswith=f'ALR-{year}-')
                .order_by('-reference')
                .first()
            )
            if last_alert:
                last_number = int(last_alert.reference.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.reference = f'ALR-{year}-{new_number:03d}'
        super().save(*args, **kwargs)


class Notification(models.Model):
    """Real-time notifications sent to maintenance managers when alerts are triggered."""

    TYPE_CHOICES = [
        ('alert_critical', 'Critical Alert'),
        ('alert_warning', 'Warning Alert'),
        ('intervention_assigned', 'Intervention Assigned'),
        ('intervention_closed', 'Intervention Closed'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    alert = models.ForeignKey(
        Alert,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"[{'✓' if self.is_read else '●'}] {self.title} → {self.recipient.username}"
