from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('', views.splash_screen, name='splash'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('gis/', views.gis, name='gis'),
    path('analytics/', views.analytics, name='analytics'),
    path('layers/', views.layers, name='layers'),
    path('datasets/', views.datasets, name='datasets'),
    path('upload/', views.upload_data, name='upload'),
    path('settings/', views.settings, name='settings'),
    path('about/', views.about, name='about'),
    
    # API endpoints
    path('api/trees/', views.tree_data, name='tree_data'),
    path('api/trees/filter/<str:name>/', views.filter_trees, name='filter_trees'),
    path('api/analytics/data/', views.analytics_data, name='analytics_data'),
    path('api/settings/theme/', views.set_theme, name='set_theme'),
]
