from django.contrib import admin
from .models import Intervention


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = ['reference', 'equipment', 'intervention_type', 'priority', 'status', 'technician', 'created_at']
    list_filter = ['status', 'priority', 'intervention_type']
    search_fields = ['reference', 'equipment__name', 'description']
    date_hierarchy = 'created_at'
