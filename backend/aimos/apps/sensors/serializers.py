from rest_framework import serializers
from .models import Sensor, SensorReading


class SensorSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    is_alert = serializers.ReadOnlyField()
    is_critical = serializers.ReadOnlyField()

    class Meta:
        model = Sensor
        fields = [
            'id', 'reference', 'name', 'sensor_type', 'unit',
            'equipment', 'equipment_name', 'equipment_reference',
            'protocol', 'host', 'port', 'register',
            'min_normal', 'max_normal', 'alert_threshold', 'critical_threshold',
            'status', 'last_value', 'last_reading_at',
            'is_alert', 'is_critical', 'created_at',
        ]
        read_only_fields = ['last_value', 'last_reading_at', 'created_at']


class SensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorReading
        fields = ['id', 'sensor', 'value', 'timestamp', 'is_anomaly', 'anomaly_score']


class SensorReadingCompactSerializer(serializers.ModelSerializer):
    """Lightweight serializer for chart data (no sensor FK, just value+timestamp)."""
    class Meta:
        model = SensorReading
        fields = ['value', 'timestamp', 'is_anomaly']
