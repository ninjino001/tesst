from rest_framework import serializers

from .models import Alert


class AlertListSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    sensor_name = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id',
            'reference',
            'equipment',
            'equipment_name',
            'equipment_reference',
            'sensor_name',
            'level',
            'status',
            'message',
            'measured_value',
            'threshold_value',
            'unit',
            'created_at',
            'acknowledged_at',
        ]

    def get_sensor_name(self, obj):
        return obj.sensor.name if obj.sensor else None


class AlertDetailSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    sensor_name = serializers.SerializerMethodField()
    acknowledged_by_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id',
            'reference',
            'equipment',
            'equipment_name',
            'equipment_reference',
            'sensor',
            'sensor_name',
            'level',
            'status',
            'message',
            'measured_value',
            'threshold_value',
            'unit',
            'created_at',
            'acknowledged_at',
            'acknowledged_by',
            'acknowledged_by_name',
            'resolved_at',
            'resolved_by',
            'resolved_by_name',
        ]

    def get_sensor_name(self, obj):
        return obj.sensor.name if obj.sensor else None

    def get_acknowledged_by_name(self, obj):
        if obj.acknowledged_by:
            return obj.acknowledged_by.get_full_name() or obj.acknowledged_by.username
        return None

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.username
        return None
