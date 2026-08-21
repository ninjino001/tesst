from django.db import models
from django.conf import settings


class MaintenanceChecklist(models.Model):
    """
    A maintenance procedure template (gamme de maintenance).
    Linked to a category — all equipment of that category use this checklist.
    Can also be linked to a specific equipment or a specific intervention.
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        'equipment.EquipmentCategory', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='checklists',
        help_text='If set, this checklist applies to all equipment of this category'
    )
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='checklists',
        help_text='If set, this checklist applies only to this specific equipment'
    )
    intervention = models.ForeignKey(
        'interventions.Intervention', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='checklists',
        help_text='If set, this checklist is specific to this intervention only'
    )
    intervention_type = models.CharField(max_length=12, choices=[
        ('preventive', 'Preventive'),
        ('corrective', 'Corrective'),
        ('both', 'Both'),
    ], default='both')
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_checklists'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ChecklistItem(models.Model):
    """A single step in a maintenance checklist."""
    checklist = models.ForeignKey(
        MaintenanceChecklist, on_delete=models.CASCADE, related_name='items'
    )
    order = models.PositiveIntegerField(default=0)
    description = models.CharField(max_length=500)
    is_critical = models.BooleanField(default=False, help_text='If true, this step cannot be skipped')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"#{self.order} — {self.description}"


class InterventionChecklistProgress(models.Model):
    """
    Tracks which checklist items have been completed for a specific intervention.
    Created when a technician starts an intervention that has a linked checklist.
    """
    intervention = models.ForeignKey(
        'interventions.Intervention', on_delete=models.CASCADE, related_name='checklist_progress'
    )
    checklist = models.ForeignKey(
        MaintenanceChecklist, on_delete=models.CASCADE, related_name='progress_records'
    )
    item = models.ForeignKey(
        ChecklistItem, on_delete=models.CASCADE, related_name='progress_records'
    )
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['intervention', 'item']
        ordering = ['item__order']


class InterventionRequest(models.Model):
    """
    A request for intervention submitted by any employee.
    The maintenance manager reviews and either approves (creates an intervention) or rejects.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    reference = models.CharField(max_length=20, unique=True)  # DI-2026-001
    title = models.CharField(max_length=200)
    description = models.TextField()
    equipment = models.ForeignKey(
        'equipment.Equipment', on_delete=models.CASCADE, related_name='intervention_requests'
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    location = models.CharField(max_length=200, blank=True)

    # Who submitted
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='submitted_requests'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Review
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Link to created intervention (if approved)
    intervention = models.ForeignKey(
        'interventions.Intervention', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='source_request'
    )

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.reference} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.reference:
            from django.utils import timezone
            year = timezone.now().year
            last = InterventionRequest.objects.filter(
                reference__startswith=f'DI-{year}'
            ).order_by('-reference').first()
            if last:
                num = int(last.reference.split('-')[-1]) + 1
            else:
                num = 1
            self.reference = f"DI-{year}-{num:03d}"
        super().save(*args, **kwargs)
