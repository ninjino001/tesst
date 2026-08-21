from django.db import models
from django.conf import settings


class EquipmentCategory(models.Model):
    """Categories of equipment (HVAC, Power, Lighting, etc.)."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Equipment categories'

    def __str__(self):
        return self.name


class Equipment(models.Model):
    """Main equipment model representing a physical asset in this airport."""

    STATUS_CHOICES = [
        ('operational', 'Operational'),
        ('under_maintenance', 'Under Maintenance'),
        ('out_of_service', 'Out of Service'),
    ]

    CRITICALITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    # Identification
    reference = models.CharField(max_length=20, unique=True)  # EQP-0001
    name = models.CharField(max_length=250)
    model = models.CharField(max_length=200, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='equipment/', blank=True, null=True)

    # Classification
    category = models.ForeignKey(
        EquipmentCategory, on_delete=models.SET_NULL, null=True, related_name='equipment'
    )
    location = models.CharField(max_length=200, blank=True)  # e.g. "Terminal 1 – Roof", "Piste 09L"

    # Status & Criticality
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='operational')
    criticality = models.CharField(max_length=10, choices=CRITICALITY_CHOICES, default='medium')

    # Dates
    installation_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    last_maintenance = models.DateField(null=True, blank=True)
    next_maintenance = models.DateField(null=True, blank=True)
    maintenance_frequency_days = models.PositiveIntegerField(default=90)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_equipment'
    )

    class Meta:
        ordering = ['reference']

    def __str__(self):
        return f"{self.reference} – {self.name}"

    @property
    def days_until_maintenance(self):
        if not self.next_maintenance:
            return None
        from datetime import date
        return (self.next_maintenance - date.today()).days
