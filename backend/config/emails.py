import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape

logger = logging.getLogger(__name__)


def _send(subject, text_body, html_body, to_email):
    """Send in a background thread so SMTP latency never slows down the API
    response, and a mail failure never breaks registration or checkout."""
    if not to_email:
        return

    def task():
        try:
            msg = EmailMultiAlternatives(
                subject, text_body, settings.DEFAULT_FROM_EMAIL, [to_email]
            )
            if html_body:
                msg.attach_alternative(html_body, 'text/html')
            msg.send()
        except Exception:
            logger.exception('Failed to send "%s" to %s', subject, to_email)

    threading.Thread(target=task, daemon=True).start()


def send_welcome_email(user):
    name = user.first_name or user.username
    text = (
        f'Hi {name},\n\n'
        f'Welcome! Your account has been created successfully.\n'
        f'Start shopping: {settings.FRONTEND_URL}\n'
    )
    html = (
        f'<p>Hi {escape(name)},</p>'
        f'<p>Welcome! Your account has been created successfully.</p>'
        f'<p><a href="{escape(settings.FRONTEND_URL)}">Start shopping</a></p>'
    )
    _send('Welcome to our store', text, html, user.email)


def send_order_confirmation_email(order):
    # Build everything here (DB access) so the thread only does the sending.
    items = list(order.items.select_related('product'))
    name = order.user.first_name or order.user.username

    text_lines = [f'Hi {name},', '', f'Thanks for your purchase! Order #{order.id} is confirmed.', '']
    html_rows = ''
    for item in items:
        text_lines.append(
            f'- {item.quantity} x {item.product.name}  (${item.line_total:.2f})'
        )
        html_rows += (
            f'<tr><td>{escape(item.product.name)}</td>'
            f'<td align="center">{item.quantity}</td>'
            f'<td align="right">${item.line_total:.2f}</td></tr>'
        )
    text_lines += ['', f'Total: ${order.total:.2f}']

    html = (
        f'<p>Hi {escape(name)},</p>'
        f'<p>Thanks for your purchase! Order <b>#{order.id}</b> is confirmed.</p>'
        f'<table cellpadding="6" style="border-collapse:collapse">'
        f'<tr><th align="left">Item</th><th>Qty</th><th align="right">Price</th></tr>'
        f'{html_rows}'
        f'<tr><td colspan="2"><b>Total</b></td>'
        f'<td align="right"><b>${order.total:.2f}</b></td></tr></table>'
    )
    _send(f'Order #{order.id} confirmed', '\n'.join(text_lines), html, order.user.email)