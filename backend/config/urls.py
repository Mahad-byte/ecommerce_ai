from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import MeView, RegisterView
from cart.views import CartItemViewSet, CartView
from catalog.views import CategoryViewSet, ProductViewSet
from chatbot.views import ChatView
from orders.views import OrderViewSet

router = DefaultRouter()
router.register('products', ProductViewSet, basename='products')
router.register('categories', CategoryViewSet, basename='categories')
router.register('cart/items', CartItemViewSet, basename='cart-items')
router.register('orders', OrderViewSet, basename='orders')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='auth-token'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('cart/', CartView.as_view(), name='cart'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('', include(router.urls)),
]
