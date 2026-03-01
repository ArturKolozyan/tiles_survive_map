from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login_page, name='login_page'),
    path('register/', views.register_page, name='register_page'),
    
    # Auth API
    path('api/auth/register/', views.register, name='register'),
    path('api/auth/login/', views.login, name='login'),
    path('api/auth/active-map/', views.get_active_map, name='get_active_map'),
    path('api/auth/active-map/set/', views.set_active_map, name='set_active_map'),
    
    # Maps API
    path('api/maps/', views.get_maps, name='get_maps'),
    path('api/maps/create/', views.create_map, name='create_map'),
    path('api/maps/<int:map_id>/', views.get_map, name='get_map'),
    path('api/maps/<int:map_id>/update/', views.update_map, name='update_map'),
    path('api/maps/<int:map_id>/delete/', views.delete_map, name='delete_map'),
]
