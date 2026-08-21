from rest_framework import serializers
from .models import Intervention


class InterventionListSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = Intervention
        fields = [
            'id', 'reference', 'equipment', 'equipment_name', 'equipment_reference',
            'intervention_type', 'priority', 'status',
            'technician', 'technician_name', 'description',
            'planned_date', 'created_at', 'started_at', 'closed_at',
        ]

    def get_technician_name(self, obj):
        if obj.technician:
            return f"{obj.technician.first_name} {obj.technician.last_name}".strip() or obj.technician.username
        return None


class InterventionDetailSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    technician_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Intervention
        fields = [
            'id', 'reference', 'equipment', 'equipment_name', 'equipment_reference',
            'intervention_type', 'priority', 'status',
            'technician', 'technician_name',
            'created_by', 'created_by_name',
            'description', 'report',
            'planned_date', 'created_at', 'updated_at', 'started_at', 'closed_at',
        ]
        read_only_fields = ['reference', 'created_at', 'updated_at', 'created_by']

    def get_technician_name(self, obj):
        if obj.technician:
            return f"{obj.technician.first_name} {obj.technician.last_name}".strip() or obj.technician.username
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        # Log activity
        from aimos.apps.activity.utils import log_activity
        user = request.user if request and request.user.is_authenticated else None
        log_activity(user, 'intervention_created', f"A créé l'intervention {instance.reference} sur {instance.equipment.name}", 'intervention', instance.reference)
        # Notify technician if assigned
        if instance.technician:
            from aimos.apps.alerts.models import Notification
            Notification.objects.create(
                recipient=instance.technician,
                notification_type='intervention_assigned',
                title=f"Nouvelle intervention affectée",
                message=f"Vous êtes affecté à l'intervention {instance.reference} sur {instance.equipment.name}",
            )
        return instance
