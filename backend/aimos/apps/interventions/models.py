from django.db import models
from django.conf import settings


class Intervention(models.Model):
    """A maintenance intervention on an equipment."""

    TYPE_CHOICES = [
        ('corrective', 'Corrective'),
        ('preventive', 'Preventive'),
    ]

    PRIORITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('suspended', 'Suspended'),
        ('closed', 'Closed'),
    ]

    # Identification
    reference = models.CharField(max_length=20, unique=True, db_index=True)  # INT-2026-001

    # Links
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.CASCADE, related_name='interventions'
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_interventions'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_interventions'
    )

    # Classification
    intervention_type = models.CharField(max_length=12, choices=TYPE_CHOICES, default='corrective')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='planned')

    # Content
    description = models.TextField()
    report = models.TextField(blank=True)  # Technician's closing report

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    planned_date = models.DateField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['equipment', '-created_at']),
            models.Index(fields=['technician', 'status']),
        ]

    def __str__(self):
        return f"{self.reference} – {self.equipment.name} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        # Auto-generate reference if not set
        if not self.reference:
            from django.utils import timezone
            year = timezone.now().year
            last = Intervention.objects.filter(
                reference__startswith=f'INT-{year}'
            ).order_by('-reference').first()
            if last:
                num = int(last.reference.split('-')[-1]) + 1
            else:
                num = 1
            self.reference = f"INT-{year}-{num:03d}"
        super().save(*args, **kwargs)



# Import checklist and intervention request models
from .models_checklist import (
    MaintenanceChecklist, ChecklistItem,
    InterventionChecklistProgress, InterventionRequest
)
