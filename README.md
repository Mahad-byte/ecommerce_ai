# ShopAI — Full-Stack Ecommerce Demo

A full-stack ecommerce application with a **Django + DRF** backend and a **Next.js** frontend, featuring JWT authentication, a product catalog, cart, checkout, an AI shopping assistant, and Stripe test-mode payments.

## Tech Stack

| Layer    | Technologies                                                              |
| -------- | ------------------------------------------------------------------------- |
| Backend  | Django 6, Django REST Framework, SimpleJWT, SQLite, Stripe, Groq           |
| Frontend | Next.js 16, Auth.js v5, React 19, Tailwind CSS v4, shadcn/ui, Axios        |
| AI       | Groq API (catalog-aware chatbot with price/keyword product retrieval)      |

## Project Structure

```
ecommerce_ai/
├── backend/           # Django project (config) + 5 apps
│   ├── accounts/      # Registration, JWT login, current-user endpoint
│   ├── catalog/       # Products & categories
│   ├── cart/          # Shopping cart
│   ├── orders/        # Orders & Stripe checkout
│   ├── chatbot/       # Groq-powered shopping assistant
│   └── config/        # Settings & URL routing
└── frontend/          # Next.js app (src/app, src/components, ...)
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser # optional, for /admin/
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000` (no `/api/` prefix).

Create a `backend/.env` file:

```env
SECRET_KEY=your-secret-key
DEBUG=1
STRIPE_SECRET_KEY=sk_test_...
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Auth.js credentials login talks to the Django endpoints above.

## API Overview

| Endpoint            | Method      | Auth | Description                          |
| ------------------- | ----------- | ---- | ------------------------------------ |
| `/auth/register/`   | POST        | ✗    | Create account, returns JWT pair     |
| `/auth/token/`      | POST        | ✗    | Login (`username`, `password`) → JWT |
| `/auth/refresh/`    | POST        | ✗    | Rotate access token                  |
| `/auth/me/`         | GET         | ✓    | Current user profile                 |
| `/products/`        | GET         | ✗    | Product catalog (+ detail route)     |
| `/categories/`      | GET         | ✗    | Product categories                   |
| `/cart/`            | GET         | ✓    | Current user's cart                  |
| `/cart/items/`      | GET/POST/…  | ✓    | Cart line items                      |
| `/orders/`          | GET/POST    | ✓    | Orders & Stripe checkout session     |
| `/chat/`            | POST        | ✗    | Chatbot (Groq)                       |
| `/admin/`           | —           | ✓    | Django admin                         |

Authenticated requests use `Authorization: Bearer <access_token>`.

## Running Tests

```bash
cd backend
venv\Scripts\python manage.py test accounts
```

Run all backend tests with `python manage.py test`.

## Payments (Stripe Test Mode)

Checkout uses Stripe test mode. Use the standard test card `4242 4242 4242 4242` with any future expiry and CVC.
