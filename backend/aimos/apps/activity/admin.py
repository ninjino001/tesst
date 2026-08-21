from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'user', 'action', 'target_reference', 'description']
    list_filter = ['action', 'created_at']
    search_fields = ['description', 'target_reference']
    readonly_fields = ['created_at']
