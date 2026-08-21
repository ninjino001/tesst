from django.contrib.auth import get_user_model, authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import generics, permissions

from .serializers import UserSerializer

User = get_user_model()


class UserListCreateAPIView(generics.ListCreateAPIView):
    queryset = User.objects.filter(is_superuser=False).order_by('id').select_related('profile')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class UserRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(is_superuser=False).order_by('id').select_related('profile')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


# Session-based auth endpoints
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def login_view(request):
    # Accept either `username` or `email` from the client
    username = request.data.get('username') or request.data.get('email') or ''
    password = request.data.get('password', '')

    user = authenticate(request, username=username, password=password)
    # If authenticate failed and the client provided an email, try to resolve it
    if not user and '@' in (username or ''):
        try:
            possible = User.objects.filter(email__iexact=username).first()
            if possible:
                user = authenticate(request, username=possible.username, password=password)
        except Exception:
            user = None

    if user:
        login(request, user)
        try:
            user_data = UserSerializer(user).data
        except Exception:
            user_data = {
                'id': user.id,
                'username': user.username,
                'first_name': getattr(user, 'first_name', ''),
                'last_name': getattr(user, 'last_name', ''),
                'email': getattr(user, 'email', ''),
                'is_active': getattr(user, 'is_active', False),
                'last_login': getattr(user, 'last_login', None),
                'date_joined': getattr(user, 'date_joined', None),
            }
        return Response(user_data)

    return Response({'error': 'Invalid credentials'}, status=400)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    try:
        request.session.flush()
    except Exception:
        pass
    logout(request)
    return Response({'message': 'Logout successful'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def me_view(request):
    if request.user and request.user.is_authenticated:
        try:
            return Response(UserSerializer(request.user).data)
        except Exception:
            # Fallback: return a minimal, safe representation if serialization fails
            u = request.user
            return Response({
                'id': u.id,
                'username': u.username,
                'first_name': getattr(u, 'first_name', ''),
                'last_name': getattr(u, 'last_name', ''),
                'email': getattr(u, 'email', ''),
            })
    return Response({'user': None}, status=401)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def change_password_view(request):
    """Change password for the currently authenticated user."""
    if not request.user.is_authenticated:
        return Response({'error': 'Not authenticated'}, status=401)

    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not current_password or not new_password:
        return Response({'error': 'Current password and new password are required'}, status=400)

    if len(new_password) < 6:
        return Response({'error': 'New password must be at least 6 characters'}, status=400)

    # Verify current password
    if not request.user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=400)

    # Set new password
    request.user.set_password(new_password)
    request.user.save()

    # Keep the user logged in after password change
    login(request, request.user)

    return Response({'message': 'Password changed successfully'})
