from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.EquipmentCategoryListView.as_view(), name='category-list'),
    path('', views.EquipmentListCreateView.as_view(), name='equipment-list'),
    path('stats/', views.equipment_stats, name='equipment-stats'),
    path('<str:reference>/', views.EquipmentDetailView.as_view(), name='equipment-detail'),
]
