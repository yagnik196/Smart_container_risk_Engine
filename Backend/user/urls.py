"""user/urls.py – Authentication URL Patterns"""
from django.urls import path
from .views import RegisterView, CustomTokenObtainPairView, CustomTokenRefreshView, ProfileView

urlpatterns = [
    # Registration
    path('register/', RegisterView.as_view(), name='register'),

    # Login – returns access + refresh token + user info
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # Refresh access token
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # Authenticated user profile
    path('profile/', ProfileView.as_view(), name='profile'),
]
