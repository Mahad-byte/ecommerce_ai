import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from cart.models import Cart

from .models import Order, OrderItem, Payment
from .serializers import OrderSerializer


class OrderViewSet(ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related('items__product', 'payment')
        )

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        if not settings.STRIPE_SECRET_KEY or 'REPLACE_ME' in settings.STRIPE_SECRET_KEY:
            return Response(
                {'detail': 'Stripe is not configured: set STRIPE_SECRET_KEY in backend/.env.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_items = cart.items.select_related('product')
        if not cart_items.exists():
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        total = sum(item.product.price * item.quantity for item in cart_items)
        order = Order.objects.create(user=request.user, total=total)
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price,
            )

        line_items = [
            {
                'quantity': item.quantity,
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': int(item.product.price * 100),
                    'product_data': {
                        'name': item.product.name,
                        'images': ([item.product.image_url] if item.product.image_url else []),
                    },
                },
            }
            for item in cart_items
        ]

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.create(
                mode='payment',
                line_items=line_items,
                success_url=(
                    f'{settings.FRONTEND_URL}/checkout/success'
                    f'?orderId={order.id}&session_id={{CHECKOUT_SESSION_ID}}'
                ),
                cancel_url=f'{settings.FRONTEND_URL}/cart',
                metadata={'order_id': order.id},
            )
        except stripe.StripeError as exc:
            order.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        Payment.objects.create(order=order, stripe_session_id=session.id)
        return Response(
            {'checkout_url': session.url, 'order_id': order.id},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if not settings.STRIPE_SECRET_KEY or 'REPLACE_ME' in settings.STRIPE_SECRET_KEY:
            return Response(
                {'detail': 'Stripe is not configured: set STRIPE_SECRET_KEY in backend/.env.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        order = self.get_object()
        payment = getattr(order, 'payment', None)
        if payment is None:
            return Response(
                {'detail': 'No payment session for this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(payment.stripe_session_id)
        except stripe.StripeError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if session.payment_status == 'paid' and order.status != Order.Status.PAID:
            order.status = Order.Status.PAID
            order.save(update_fields=['status'])
            payment.status = Payment.Status.PAID
            payment.save(update_fields=['status'])
            for item in order.items.select_related('product'):
                product = item.product
                product.stock = max(0, product.stock - item.quantity)
                product.save(update_fields=['stock'])
            cart, _ = Cart.objects.get_or_create(user=request.user)
            cart.items.all().delete()

        return Response(OrderSerializer(order).data)
