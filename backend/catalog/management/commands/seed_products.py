import random

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import Category, Product

# (name, category, price, stock, description) — hand-curated items
PRODUCTS = [
    ('Smartphone X12', 'Electronics', 699.99, 15,
     'Flagship phone with a 6.7" OLED display, triple camera and all-day battery.'),
    ('Ultrabook Pro 14', 'Electronics', 1299.00, 8,
     'Featherlight 14" laptop with a fast SSD, 16GB RAM and all-metal chassis.'),
    ('4K Action Camera', 'Electronics', 249.99, 20,
     'Waterproof action camera that shoots stabilized 4K60 video.'),
    ('Wireless Charging Pad', 'Electronics', 29.99, 50,
     'Slim 15W fast-charging pad compatible with all Qi phones.'),
    ('Smart Home Hub', 'Electronics', 99.99, 25,
     'Central hub that connects and automates all your smart devices.'),
    ('Portable Power Bank 20K', 'Electronics', 45.99, 40,
     '20000mAh power bank with USB-C PD that charges a phone three times.'),
    ('Pulse Wireless Headphones', 'Audio', 89.99, 30,
     'Over-ear wireless headphones with active noise cancelling and 30h battery.'),
    ('Aura Buds Mini', 'Audio', 49.99, 60,
     'Compact true-wireless earbuds with a pocketable charging case.'),
    ('BoomBox Bluetooth Speaker', 'Audio', 59.99, 35,
     'Rugged waterproof speaker with deep bass and 20 hours of playtime.'),
    ('Studio USB Microphone', 'Audio', 119.00, 18,
     'Cardioid condenser mic for podcasts, streaming and home recording.'),
    ('Soundbar Home Theater', 'Audio', 179.99, 12,
     '2.1-channel soundbar with wireless subwoofer for room-filling TV audio.'),
    ('FitTrack Smartwatch', 'Wearables', 199.00, 22,
     'GPS smartwatch with heart-rate tracking, sleep score and 7-day battery.'),
    ('Classic Leather Watch', 'Wearables', 149.50, 16,
     'Minimal analog watch with a genuine leather strap and sapphire glass.'),
    ('Fitness Band Lite', 'Wearables', 39.99, 55,
     'Lightweight activity tracker counting steps, calories and workouts.'),
    ('Minimal Backpack', 'Accessories', 74.99, 28,
     'Water-resistant 20L backpack with a padded 16" laptop sleeve.'),
    ('Ergo Mouse', 'Accessories', 34.99, 45,
     'Vertical ergonomic wireless mouse that reduces wrist strain.'),
    ('Mechanical Keyboard K1', 'Accessories', 129.00, 20,
     'Hot-swappable 75% mechanical keyboard with per-key RGB backlight.'),
    ('USB-C Hub 7-in-1', 'Accessories', 45.00, 38,
     'Aluminum hub adding HDMI, ethernet, SD and 100W passthrough charging.'),
    ('Laptop Sleeve 14"', 'Accessories', 24.99, 60,
     'Padded fleece-lined sleeve that fits 13-14" laptops.'),
    ('Desk Lamp Glow', 'Accessories', 39.99, 33,
     'LED desk lamp with adjustable color temperature and touch dimming.'),
    ('Travel Mug Steel', 'Accessories', 19.99, 70,
     'Vacuum-insulated 450ml mug that keeps drinks hot for 6 hours.'),
]

# category -> (brands, items) ; each item gets Lite/base/Pro/Ultra variants
GENERATED = {
    'Electronics': {
        'brands': ['Nimbus', 'Volta', 'Zephyr', 'Quanta'],
        'items': [
            ('Smartphone', 599, '5G smartphone with a fast OLED display and all-day battery.'),
            ('Tablet', 449, '11" tablet with a 120Hz screen and stylus support.'),
            ('Laptop', 899, 'Thin-and-light laptop with a modern CPU and solid-state storage.'),
            ('Monitor', 249, '27" QHD monitor with slim bezels and accurate color.'),
            ('Smart TV', 529, '4K smart TV with HDR and a voice remote.'),
            ('E-Reader', 139, 'Glare-free e-ink reader with weeks of battery life.'),
            ('Drone', 399, 'Compact camera drone with GPS hold and 4K video.'),
            ('Projector', 349, 'Portable 1080p projector with built-in streaming apps.'),
        ],
    },
    'Audio': {
        'brands': ['EchoWave', 'Sonicore', 'Auria', 'Bassline'],
        'items': [
            ('Headphones', 129, 'Over-ear headphones with active noise cancelling.'),
            ('Earbuds', 79, 'True-wireless earbuds with a fast charging case.'),
            ('Speaker', 69, 'Portable speaker with deep bass and waterproofing.'),
            ('Soundbar', 199, 'Soundbar with a wireless subwoofer for TV audio.'),
            ('Turntable', 159, 'Belt-drive turntable with a built-in phono preamp.'),
            ('Microphone', 99, 'Condenser microphone for streaming and recording.'),
            ('Receiver', 259, 'AV receiver with 5.2 channels and Bluetooth.'),
        ],
    },
    'Wearables': {
        'brands': ['PulseTech', 'Chrono', 'VitaTrack'],
        'items': [
            ('Smartwatch', 199, 'Smartwatch with GPS, heart-rate and sleep tracking.'),
            ('Fitness Band', 49, 'Slim band counting steps, calories and workouts.'),
            ('Sports Watch', 249, 'Multisport watch with detailed training metrics.'),
            ('Smart Ring', 179, 'Discreet ring tracking sleep, recovery and readiness.'),
            ('Kids Watch', 59, 'Kid-friendly watch with GPS and parental controls.'),
        ],
    },
    'Accessories': {
        'brands': ['CarryOn', 'GripMate', 'LinkLine'],
        'items': [
            ('Backpack', 69, 'Water-resistant backpack with a padded laptop sleeve.'),
            ('Charging Cable', 12, 'Braided fast-charging cable tested for 20,000 bends.'),
            ('Phone Case', 19, 'Drop-tested case with raised edges and soft touch.'),
            ('Laptop Stand', 34, 'Adjustable aluminum stand that improves posture.'),
            ('Wireless Mouse', 29, 'Silent-click wireless mouse with long battery life.'),
            ('Webcam', 49, '1080p webcam with auto light correction.'),
            ('Card Reader', 22, 'USB-C reader for SD and microSD cards.'),
        ],
    },
    'Gaming': {
        'brands': ['Raptor', 'NexPlay', 'HyperGrid'],
        'items': [
            ('Gaming Mouse', 49, 'Lightweight mouse with a 16K sensor and low latency.'),
            ('Mechanical Keyboard', 109, 'Hot-swappable keyboard with per-key RGB.'),
            ('Controller', 59, 'Wireless controller with hall-effect sticks.'),
            ('Gaming Headset', 89, 'Headset with 7.1 surround and a clear boom mic.'),
            ('VR Headset', 329, 'Standalone VR headset with inside-out tracking.'),
            ('Capture Card', 129, '4K passthrough capture card for streamers.'),
            ('Gaming Chair', 219, 'Ergonomic chair with lumbar support and recline.'),
        ],
    },
    'Home & Kitchen': {
        'brands': ['ChefMate', 'PureHome', 'BrewCraft'],
        'items': [
            ('Espresso Machine', 249, 'Semi-automatic espresso machine with a steam wand.'),
            ('Air Fryer', 99, 'Family-size air fryer with rapid convection.'),
            ('Robot Vacuum', 299, 'Self-emptying robot vacuum with LiDAR mapping.'),
            ('Blender', 79, '1000W blender with a shatterproof jug.'),
            ('Electric Kettle', 39, 'Variable-temperature kettle with hold function.'),
            ('Cookware Set', 129, 'Nonstick ceramic cookware set, oven safe.'),
            ('Air Purifier', 159, 'HEPA purifier for rooms up to 40m².'),
        ],
    },
    'Office': {
        'brands': ['DeskLine', 'WorkWell', 'Organix'],
        'items': [
            ('Standing Desk', 249, 'Height-adjustable desk with memory presets.'),
            ('Office Chair', 179, 'Ergonomic chair with adjustable lumbar support.'),
            ('Desk Lamp', 44, 'Flicker-free LED lamp with wireless charging base.'),
            ('Monitor Arm', 49, 'Full-motion gas-spring monitor arm.'),
            ('Label Maker', 29, 'Bluetooth label maker with a free template app.'),
            ('Paper Shredder', 89, 'Cross-cut shredder handling 12 sheets per pass.'),
            ('Cable Organizer', 15, 'Under-desk tray that hides cable clutter.'),
        ],
    },
    'Fitness': {
        'brands': ['FlexForge', 'PeakForm', 'IronCore'],
        'items': [
            ('Adjustable Dumbbells', 199, 'Dumbbells adjusting from 2.5 to 24kg each.'),
            ('Yoga Mat', 29, 'Non-slip 6mm mat with alignment lines.'),
            ('Resistance Bands', 19, 'Set of five latex bands with door anchor.'),
            ('Treadmill', 449, 'Folding treadmill with incline and app training.'),
            ('Exercise Bike', 349, 'Magnetic spin bike with a tablet holder.'),
            ('Foam Roller', 24, 'High-density roller for muscle recovery.'),
            ('Smart Jump Rope', 39, 'Counting jump rope that syncs to your phone.'),
        ],
    },
    'Photography': {
        'brands': ['Lumina', 'OptiPro', 'ShutterWorks'],
        'items': [
            ('Mirrorless Camera', 899, '24MP mirrorless camera with 4K60 video.'),
            ('Prime Lens', 199, 'Fast 50mm f/1.8 lens with creamy bokeh.'),
            ('Tripod', 79, 'Carbon-fiber tripod with a ball head.'),
            ('Gimbal', 129, '3-axis gimbal stabilizing phones and compact cameras.'),
            ('Ring Light', 39, 'Bi-color ring light with a phone holder.'),
            ('Memory Card', 29, '128GB V60 card rated for 4K recording.'),
            ('Camera Bag', 59, 'Weather-sealed sling bag with padded dividers.'),
        ],
    },
    'Beauty': {
        'brands': ['GlowUp', 'SilkTouch', 'DermaCare'],
        'items': [
            ('Hair Dryer', 89, 'Ionic hair dryer with heat damage protection.'),
            ('Electric Toothbrush', 59, 'Sonic toothbrush with pressure sensing.'),
            ('Cleansing Brush', 39, 'Waterproof facial cleansing brush.'),
            ('Beard Trimmer', 34, 'Cordless trimmer with 20 length settings.'),
            ('Hair Straightener', 49, 'Ceramic straightener heating up in 15 seconds.'),
            ('LED Face Mask', 129, 'Red-light therapy mask for home skincare.'),
        ],
    },
    'Outdoors': {
        'brands': ['TrailBlaze', 'SummitCo', 'WildPath'],
        'items': [
            ('Camping Tent', 129, '3-person tent with a fast clip-pole setup.'),
            ('Sleeping Bag', 79, 'Mummy bag rated to -5°C, packs down small.'),
            ('Hiking Backpack', 99, '45L backpack with a ventilated back panel.'),
            ('Portable Stove', 44, 'Piezo-ignition stove boiling water in 3 minutes.'),
            ('Headlamp', 24, 'Rechargeable headlamp with a red night mode.'),
            ('Cooler', 89, 'Rotomolded cooler keeping ice for 4 days.'),
            ('Hammock', 39, 'Parachute-silk hammock with tree straps included.'),
        ],
    },
    'Pets': {
        'brands': ['PawPal', 'FurryFriend', 'WhiskerWorks'],
        'items': [
            ('Dog Bed', 49, 'Orthopedic memory-foam bed with a washable cover.'),
            ('Cat Tree', 79, 'Multi-level cat tree with sisal scratch posts.'),
            ('Pet Camera', 59, 'Treat-tossing camera with night vision.'),
            ('Automatic Feeder', 45, 'Programmable feeder with portion control.'),
            ('Dog Leash', 19, 'Shock-absorbing leash with a padded handle.'),
            ('Grooming Kit', 39, 'Low-noise clipper kit with guide combs.'),
        ],
    },
}

TIERS = [
    ('Lite', 0.55, 'entry-level'),
    ('', 1.0, ''),
    ('Pro', 1.55, 'performance'),
    ('Ultra', 2.3, 'flagship'),
]


def make_price(base, multiplier, rng):
    raw = base * multiplier * rng.uniform(0.92, 1.08)
    return max(4.99, round(raw) - 0.01)


def make_stock(rng):
    roll = rng.random()
    if roll < 0.08:
        return 0
    if roll < 0.25:
        return rng.randint(1, 10)
    return rng.randint(11, 90)


class Command(BaseCommand):
    help = 'Seed the catalog with demo categories and products'

    def handle(self, *args, **options):
        rng = random.Random(42)

        category_names = list({p[1] for p in PRODUCTS} | set(GENERATED))
        categories = {}
        for name in category_names:
            categories[name] = Category.objects.get_or_create(
                name=name, defaults={'slug': slugify(name)},
            )[0]

        for name, category, price, stock, description in PRODUCTS:
            slug = name.lower().replace(' ', '-').replace('"', '').replace("'", '')
            Product.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'category': categories[category],
                    'price': price,
                    'stock': stock,
                    'description': description,
                    'image_url': f'https://picsum.photos/seed/{slug}/600/600',
                },
            )

        generated_count = 0
        for category_name, data in GENERATED.items():
            category = categories[category_name]
            category_slug = category.slug
            for index, (item, base_price, description) in enumerate(data['items']):
                brand = data['brands'][index % len(data['brands'])]
                for tier, multiplier, tier_label in TIERS:
                    full_name = f'{brand} {item} {tier}'.strip()
                    slug = f'{category_slug}-' + full_name.lower().replace(' ', '-')
                    price = make_price(base_price, multiplier, rng)
                    stock = make_stock(rng)
                    desc = f'{brand} {description}'
                    if tier_label:
                        desc = f'{tier_label.capitalize()} model. {desc}'
                    Product.objects.update_or_create(
                        slug=slug,
                        defaults={
                            'name': full_name,
                            'category': category,
                            'price': price,
                            'stock': stock,
                            'description': desc,
                            'image_url': f'https://picsum.photos/seed/{slug}/600/600',
                        },
                    )
                    generated_count += 1

        total = Product.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(categories)} categories, {generated_count} generated products. '
            f'Catalog now has {total} products.'
        ))
