from django.urls import path
from . import views
from . import views_checklist

urlpatterns = [
    # Static paths FIRST (before <str:reference> which catches everything)
    path('', views.InterventionListCreateView.as_view(), name='intervention-list'),
    path('stats/', views.intervention_stats, name='intervention-stats'),
    path('my/', views.MyInterventionsView.as_view(), name='my-interventions'),

    # Checklists
    path('checklists/', views_checklist.ChecklistListCreateView.as_view(), name='checklist-list'),
    path('checklists/<int:pk>/', views_checklist.ChecklistDetailView.as_view(), name='checklist-detail'),
    path('checklists/equipment/<str:equipment_ref>/', views_checklist.checklist_for_equipment, name='checklist-for-equipment'),

    # Intervention Requests (DI)
    path('requests/', views_checklist.InterventionRequestListCreateView.as_view(), name='request-list'),
    path('requests/stats/', views_checklist.request_stats, name='request-stats'),
    path('requests/<int:pk>/approve/', views_checklist.approve_request, name='request-approve'),
    path('requests/<int:pk>/reject/', views_checklist.reject_request, name='request-reject'),

    # Dynamic reference paths LAST
    path('<str:reference>/', views.InterventionDetailView.as_view(), name='intervention-detail'),
    path('<str:reference>/start/', views.start_intervention, name='intervention-start'),
    path('<str:reference>/close/', views.close_intervention, name='intervention-close'),
    path('<str:reference>/checklist/', views_checklist.intervention_checklist_progress, name='intervention-checklist'),
]
