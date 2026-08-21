from django.contrib import admin
from .models import EquipmentCategory, Equipment


@admin.register(EquipmentCategory)
class EquipmentCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['reference', 'name', 'category', 'location', 'status', 'criticality']
    list_filter = ['status', 'criticality', 'category']
    search_fields = ['reference', 'name', 'model']
