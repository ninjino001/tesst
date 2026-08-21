from django.contrib import admin
from .models import Sensor, SensorReading


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ['reference', 'name', 'sensor_type', 'equipment', 'status', 'last_value', 'last_reading_at']
    list_filter = ['sensor_type', 'status']
    search_fields = ['reference', 'name', 'equipment__name']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['sensor', 'value', 'timestamp', 'is_anomaly']
    list_filter = ['is_anomaly', 'sensor__sensor_type']
    date_hierarchy = 'timestamp'
