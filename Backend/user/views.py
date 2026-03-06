"""user/views.py – Authentication Views (Register, Login with JWT, Profile)"""
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import RegisterSerializer, UserProfileSerializer, CustomTokenObtainPairSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Registers a new user and returns user data.
    No authentication required.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'User registered successfully.', 'user': UserProfileSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Returns access + refresh JWT tokens along with user profile.
    Body: { "email": "...", "password": "..." }
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenRefreshView(TokenRefreshView):
    """
    POST /api/auth/token/refresh/
    Refreshes the access token using a valid refresh token.
    Body: { "refresh": "<refresh_token>" }
    """
    permission_classes = [permissions.AllowAny]


class ProfileView(APIView):
    """
    GET /api/auth/profile/
    Returns the authenticated user's profile.
    Requires: Authorization: Bearer <access_token>
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
