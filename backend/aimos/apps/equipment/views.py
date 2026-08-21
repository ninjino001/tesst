from rest_framework import generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count

from .models import EquipmentCategory, Equipment
from .serializers import (
    EquipmentCategorySerializer,
    EquipmentListSerializer, EquipmentDetailSerializer,
)


class EquipmentCategoryListView(generics.ListCreateAPIView):
    queryset = EquipmentCategory.objects.all()
    serializer_class = EquipmentCategorySerializer
    permission_classes = [permissions.AllowAny]


class EquipmentListCreateView(generics.ListCreateAPIView):
    queryset = Equipment.objects.select_related('category').order_by('reference')
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['reference', 'name', 'model']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EquipmentDetailSerializer
        return EquipmentListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        criticality = self.request.query_params.get('criticality')
        category = self.request.query_params.get('category')

        if status:
            qs = qs.filter(status=status)
        if criticality:
            qs = qs.filter(criticality=criticality)
        if category:
            qs = qs.filter(category_id=category)
        return qs


class EquipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Equipment.objects.select_related('category')
    serializer_class = EquipmentDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'reference'


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def equipment_stats(request):
    """Dashboard stats for equipment."""
    total = Equipment.objects.count()
    operational = Equipment.objects.filter(status='operational').count()
    under_maintenance = Equipment.objects.filter(status='under_maintenance').count()
    out_of_service = Equipment.objects.filter(status='out_of_service').count()

    from datetime import date
    due_maintenance = Equipment.objects.filter(
        next_maintenance__lte=date.today()
    ).count()

    by_category = list(
        EquipmentCategory.objects.annotate(count=Count('equipment'))
        .values('name', 'count')
        .order_by('-count')
    )

    return Response({
        'total': total,
        'operational': operational,
        'under_maintenance': under_maintenance,
        'out_of_service': out_of_service,
        'due_maintenance': due_maintenance,
        'by_category': by_category,
    })
