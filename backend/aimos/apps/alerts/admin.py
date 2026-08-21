from django.contrib import admin

from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['reference', 'equipment', 'level', 'status', 'created_at']
    list_filter = ['level', 'status']
