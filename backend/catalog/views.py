from decimal import Decimal, InvalidOperation

from django.db.models import Q
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class ProductPagination(PageNumberPagination):
    page_size = 24


class ProductViewSet(ReadOnlyModelViewSet):
    queryset = Product.objects.select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = ProductPagination
    filter_backends = [OrderingFilter]
    ordering_fields = ['price', 'name', 'created_at', 'stock']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        category = params.get('category')
        search = params.get('search')
        if category:
            queryset = queryset.filter(category__slug=category)
        if search:
            queryset = queryset.filter(name__icontains=search)

        min_price = params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=Decimal(min_price))
            except InvalidOperation:
                pass

        max_price = params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=Decimal(max_price))
            except InvalidOperation:
                pass

        if params.get('in_stock') == 'true':
            queryset = queryset.filter(stock__gt=0)

        return queryset


class CategoryViewSet(ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None
