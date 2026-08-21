from rest_framework import serializers
from .models import EquipmentCategory, Equipment


class EquipmentCategorySerializer(serializers.ModelSerializer):
    equipment_count = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentCategory
        fields = ['id', 'name', 'description', 'icon', 'equipment_count']

    def get_equipment_count(self, obj):
        return obj.equipment.count()


class EquipmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    days_until_maintenance = serializers.ReadOnlyField()
    sensor_count = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = [
            'id', 'reference', 'name', 'model', 'status', 'criticality',
            'category', 'category_name', 'location',
            'last_maintenance', 'next_maintenance', 'days_until_maintenance',
            'sensor_count', 'image', 'created_at',
        ]

    def get_sensor_count(self, obj):
        return obj.sensors.count()


class EquipmentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/update."""
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    category_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    days_until_maintenance = serializers.ReadOnlyField()
    sensor_count = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = [
            'id', 'reference', 'name', 'model', 'serial_number', 'manufacturer',
            'description', 'image', 'category', 'category_name', 'category_input', 'location',
            'status', 'criticality',
            'installation_date', 'warranty_expiry', 'last_maintenance',
            'next_maintenance', 'maintenance_frequency_days',
            'days_until_maintenance', 'sensor_count',
            'created_at', 'updated_at', 'created_by',
        ]
        read_only_fields = ['reference', 'created_at', 'updated_at']
        extra_kwargs = {
            'category': {'required': False, 'allow_null': True},
        }

    def get_sensor_count(self, obj):
        return obj.sensors.count()

    def validate(self, data):
        """Resolve category from category_input (name) if category ID not provided."""
        category_input = data.pop('category_input', None)
        if category_input and not data.get('category'):
            try:
                cat = EquipmentCategory.objects.get(name=category_input)
                data['category'] = cat
            except EquipmentCategory.DoesNotExist:
                # Create category on-the-fly
                cat = EquipmentCategory.objects.create(name=category_input)
                data['category'] = cat
        return data

    def create(self, validated_data):
        # Auto-generate reference
        last = Equipment.objects.order_by('-id').first()
        next_num = (last.id + 1) if last else 1
        validated_data['reference'] = f"EQP-{next_num:04d}"
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        # Log activity
        from aimos.apps.activity.utils import log_activity
        user = request.user if request and request.user.is_authenticated else None
        log_activity(user, 'equipment_created', f"A ajouté l'équipement {instance.reference} – {instance.name}", 'equipment', instance.reference)
        return instance
