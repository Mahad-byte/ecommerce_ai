import re
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, Q
from groq import Groq
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Category, Product
from catalog.serializers import ProductSerializer

STOPWORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'our',
    'this', 'that', 'these', 'those', 'there', 'here', 'what', 'which', 'who',
    'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'should', 'would',
    'will', 'shall', 'may', 'might', 'must', 'am', 'not', 'no', 'yes',
    'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'about', 'into',
    'want', 'need', 'looking', 'look', 'show', 'get', 'give', 'tell', 'find',
    'any', 'some', 'all', 'one', 'two', 'very', 'really', 'just', 'also',
    'please', 'thanks', 'thank', 'hello', 'hi', 'hey', 'help', 'buy', 'purchase',
    'recommend', 'recommendation', 'suggest', 'suggestion', 'best', 'good',
    'great', 'cheap', 'cheaper', 'price', 'prices', 'cost', 'much', 'many',
    'how', 'more', 'less', 'than', 'under', 'over', 'below', 'above', 'around',
    'stock', 'available', 'availability', 'product', 'products', 'item', 'items',
    'something', 'anything', 'store', 'shop', 'dollars', 'dollar', 'budget',
    'option', 'options', 'kind', 'sort', 'type', 'new', 'nice',
    'between', 'max', 'maximum', 'min', 'minimum', 'cheapest', 'priciest',
    'expensive', 'affordable', 'tops', 'range', 'least', 'most', 'lowest',
    'highest', 'near', 'roughly', 'approx', 'approximately',
    'fall', 'falls', 'falling', 'within', 'dollors', 'dollars', 'usd', 'bucks',
    'priced', 'costs', 'costing', 'worth',
}

# A money amount: "$50", "1,200", "2k", "49.99" — group 1: digits, group 2: k-suffix
AMOUNT = r'\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?'

PRICE_BETWEEN_RE = re.compile(
    rf'(?:between|from)\s+{AMOUNT}\s*(?:and|to|until|through|-|–|—)\s*{AMOUNT}',
    re.IGNORECASE,
)
# "$20-$50" — first side must carry a $ so ranges like "5-6 items" don't match
PRICE_RANGE_RE = re.compile(
    r'\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?\s*[–—-]\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?',
    re.IGNORECASE,
)
# "100-150", "100 to 150" — only trusted when the message also talks about money
PRICE_PLAIN_RANGE_RE = re.compile(
    r'(?<![\d.])(\d[\d,]*(?:\.\d+)?)\s*(k\b)?\s*(?:-|–|—|to)\s*'
    r'(\d[\d,]*(?:\.\d+)?)\s*(k\b)?(?![\d])',
    re.IGNORECASE,
)
MONEY_HINT_RE = re.compile(
    r'\$|dollar|dollor|usd|buck|price|range|budget|cost|under|between|fall|within',
    re.IGNORECASE,
)
PRICE_AROUND_RE = re.compile(
    rf'(?:around|about|approx(?:imately)?|roughly|near)\s+{AMOUNT}',
    re.IGNORECASE,
)
PRICE_MAX_RE = re.compile(
    rf'(?:under|below|(?<!no )(?!not )less than|(?<!no )cheaper than|up to|at most|'
    rf'no more than|not more than|max(?:imum)?(?:\s*(?:of|:))?)\s*{AMOUNT}',
    re.IGNORECASE,
)
PRICE_MIN_RE = re.compile(
    rf'(?:over|above|(?<!no )(?!not )more than|at least|no less than|not less than|'
    rf'min(?:imum)?(?:\s*(?:of|:))?)\s*{AMOUNT}',
    re.IGNORECASE,
)
TRAILING_MAX_RE = re.compile(
    rf'{AMOUNT}\s*(?:or\s+(?:less|cheaper|under|below)|and\s+(?:under|below)|'
    rf'at\s+most|max(?:imum)?|tops|budget)\b\.?',
    re.IGNORECASE,
)
TRAILING_MIN_RE = re.compile(
    rf'{AMOUNT}\s*(?:or\s+(?:more|above)|and\s+(?:above|up)|'
    rf'at\s+least|min(?:imum)?)\b\.?',
    re.IGNORECASE,
)
BUDGET_RE = re.compile(
    rf'budget(?:\s+(?:of|is|around))?\s*[:=]?\s*{AMOUNT}',
    re.IGNORECASE,
)
# Bare "$50" with no comparison words — treated as a budget ceiling
PRICE_ANY_RE = re.compile(r'\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?')

CHEAPEST_TERMS = ('cheapest', 'least expensive', 'most affordable', 'lowest price')
PRICIEST_TERMS = ('most expensive', 'priciest', 'highest price')


def read_amount(match, index):
    value = Decimal(match.group(index).replace(',', ''))
    if match.group(index + 1):
        value *= 1000
    return value.quantize(Decimal('0.01'))


def parse_price_intent(lowered):
    """Return (min_price, max_price) parsed from every common phrasing."""
    min_price = max_price = None

    if match := PRICE_BETWEEN_RE.search(lowered):
        min_price, max_price = sorted([read_amount(match, 1), read_amount(match, 3)])
    elif match := PRICE_RANGE_RE.search(lowered):
        min_price, max_price = sorted([read_amount(match, 1), read_amount(match, 3)])
    elif (match := PRICE_PLAIN_RANGE_RE.search(lowered)) and (
        MONEY_HINT_RE.search(lowered)
        or max(read_amount(match, 1), read_amount(match, 3)) >= 20  # "5-6 items" is not a price
    ):
        min_price, max_price = sorted([read_amount(match, 1), read_amount(match, 3)])
    elif match := PRICE_AROUND_RE.search(lowered):
        center = read_amount(match, 1)
        min_price = (center * Decimal('0.75')).quantize(Decimal('0.01'))
        max_price = (center * Decimal('1.25')).quantize(Decimal('0.01'))
    else:
        if match := PRICE_MAX_RE.search(lowered):
            max_price = read_amount(match, 1)
        elif match := TRAILING_MAX_RE.search(lowered):
            max_price = read_amount(match, 1)
        if match := PRICE_MIN_RE.search(lowered):
            min_price = read_amount(match, 1)
        elif match := TRAILING_MIN_RE.search(lowered):
            min_price = read_amount(match, 1)
        if max_price is None and min_price is None:
            if match := BUDGET_RE.search(lowered):
                max_price = read_amount(match, 1)
            elif match := PRICE_ANY_RE.search(lowered):
                max_price = read_amount(match, 1)

    return min_price, max_price


def extract_keywords(message):
    words = re.findall(r"[a-zA-Z][a-zA-Z']+", message.lower())
    return [w for w in words if w not in STOPWORDS][:8]


class ChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'detail': 'Message is required.'}, status=400)
        if not settings.GROQ_API_KEY or 'REPLACE_ME' in settings.GROQ_API_KEY:
            return Response(
                {'detail': 'Groq is not configured: set GROQ_API_KEY in backend/.env.'},
                status=503,
            )

        lowered = message.lower()
        min_price, max_price = parse_price_intent(lowered)
        wants_cheapest = any(term in lowered for term in CHEAPEST_TERMS)
        wants_priciest = any(term in lowered for term in PRICIEST_TERMS)

        queryset = Product.objects.select_related('category')
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if wants_priciest:
            queryset = queryset.order_by('-price')
        elif wants_cheapest:
            queryset = queryset.order_by('price')

        keywords = extract_keywords(message)

        matches = []
        if keywords:
            name_query = Q()
            any_query = Q()
            for keyword in keywords:
                name_query |= Q(name__icontains=keyword)
                any_query |= (
                    Q(name__icontains=keyword)
                    | Q(description__icontains=keyword)
                    | Q(category__name__icontains=keyword)
                )
            named = list(queryset.filter(name_query)[:8])
            if not named:
                # retry with naive singulars so "laptops" still finds "Laptop"
                singular = [
                    k[:-1] if k.endswith('s') and len(k) > 3 else k for k in keywords
                ]
                if singular != keywords:
                    for keyword in singular:
                        name_query |= Q(name__icontains=keyword)
                        any_query |= (
                            Q(name__icontains=keyword)
                            | Q(description__icontains=keyword)
                        )
                    named = list(queryset.filter(name_query)[:8])
            if named:
                seen = {p.id for p in named}
                rest = queryset.filter(any_query).exclude(id__in=seen)[:10 - len(named)]
                matches = named + list(rest)
            else:
                matches = list(queryset.filter(any_query)[:10])

        has_price_filter = max_price is not None or min_price is not None
        if not matches and has_price_filter:
            # keywords were noise (or matched nothing): answer from the price filter alone
            order = '-price' if wants_priciest else 'price'
            matches = list(queryset.order_by(order)[:10])
        elif not matches and not keywords:
            matches = list(Product.objects.select_related('category')[:8])

        total_in_filter = queryset.count() if has_price_filter else None

        catalog_lines = '\n'.join(
            f'- {p.name} | ${p.price} | category: {p.category.name} | '
            f'stock: {p.stock} | {p.description}'
            for p in matches
        ) or '- (no products matched this request)'
        if total_in_filter:
            catalog_lines += (
                f'\n(The store has {total_in_filter} products in this price range; '
                f'the list above shows {len(matches)} of them.)'
            )

        category_lines = '\n'.join(
            f'- {c.name} ({c.product_count} products)'
            for c in Category.objects.annotate(product_count=Count('products'))
        )

        rules = (
            'You are ShopAI, the friendly shopping assistant for an online store. '
            'Chat naturally: handle greetings, small talk and general questions '
            '(shipping, payments, returns — answer briefly and sensibly; for policy details '
            'you do not know, say support can help). '
            'For anything about products, use ONLY the product list below — never invent '
            'products or prices. Recommend specific products with their exact prices. When '
            'the customer asks for a suggestion or recommendation, give 3-4 fitting options '
            'as a short list (name and price each) rather than a single product. When the '
            'customer names a budget or a price range (under, over, between, around), only '
            'recommend products whose price fits it. Mention when something is out of stock '
            'or low on stock. If the list has no exact match, you may point to the store '
            'categories instead. Keep replies short (under 150 words).'
        )
        if wants_cheapest:
            rules += (
                ' The customer asked for the cheapest options — lead with the '
                'lowest-priced fitting products.'
            )
        elif wants_priciest:
            rules += (
                ' The customer asked for the most premium options — lead with the '
                'higher-end fitting products.'
            )

        system_prompt = (
            f'{rules}\n\n'
            f'Matching products:\n{catalog_lines}\n\n'
            f'The store also carries these categories:\n{category_lines}'
        )

        client = Groq(api_key=settings.GROQ_API_KEY)
        try:
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': message},
                ],
                temperature=0.4,
                max_completion_tokens=1024,
                reasoning_effort='low',
            )
        except Exception as exc:
            return Response({'detail': f'Chatbot error: {exc}'}, status=502)

        reply = completion.choices[0].message.content
        mentioned = [p for p in matches if p.name.lower() in reply.lower()]

        return Response(
            {
                'reply': reply,
                'products': ProductSerializer(mentioned, many=True).data,
            }
        )