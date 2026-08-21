from rest_framework import serializers
from .models_checklist import (
    MaintenanceChecklist, ChecklistItem,
    InterventionChecklistProgress, InterventionRequest
)


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ['id', 'order', 'description', 'is_critical']


class MaintenanceChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    equipment_name = serializers.CharField(source='equipment.name', read_only=True, default='')
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True, default='')
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceChecklist
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'equipment', 'equipment_name', 'equipment_reference',
            'intervention_type', 'estimated_duration_minutes',
            'items', 'items_count', 'created_at',
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class MaintenanceChecklistCreateSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True)

    class Meta:
        model = MaintenanceChecklist
        fields = [
            'id', 'name', 'description', 'category', 'equipment', 'intervention',
            'intervention_type', 'estimated_duration_minutes', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        checklist = MaintenanceChecklist.objects.create(**validated_data)
        for i, item_data in enumerate(items_data):
            item_data['order'] = i + 1
            ChecklistItem.objects.create(checklist=checklist, **item_data)
        return checklist


class ChecklistProgressSerializer(serializers.ModelSerializer):
    item_description = serializers.CharField(source='item.description', read_only=True)
    item_order = serializers.IntegerField(source='item.order', read_only=True)
    item_is_critical = serializers.BooleanField(source='item.is_critical', read_only=True)

    class Meta:
        model = InterventionChecklistProgress
        fields = [
            'id', 'item', 'item_description', 'item_order', 'item_is_critical',
            'is_completed', 'completed_at', 'notes',
        ]


class InterventionRequestListSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', read_only=True)
    equipment_reference = serializers.CharField(source='equipment.reference', read_only=True)
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InterventionRequest
        fields = [
            'id', 'reference', 'title', 'description',
            'equipment', 'equipment_name', 'equipment_reference',
            'priority', 'status', 'location',
            'submitted_by', 'submitted_by_name', 'submitted_at',
            'reviewed_at', 'rejection_reason', 'intervention',
        ]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            name = f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}".strip()
            return name or obj.submitted_by.username
        return None


class InterventionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionRequest
        fields = ['title', 'description', 'equipment', 'priority', 'location']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['submitted_by'] = request.user
        return super().create(validated_data)
