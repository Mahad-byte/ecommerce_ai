from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

STRONG_PASSWORD = 'purple-elephant-42'


class AuthFlowTests(APITestCase):
    """Tests for registration, JWT login, and the /auth/me/ endpoint."""

    def setUp(self):
        self.register_url = reverse('auth-register')
        self.token_url = reverse('auth-token')
        self.me_url = reverse('auth-me')
        self.credentials = {
            'username': 'alice',
            'email': 'alice@example.com',
            'password': STRONG_PASSWORD,
        }

    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(self.register_url, self.credentials, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='alice').exists())
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'alice')

    def test_login_with_valid_credentials_returns_tokens(self):
        User.objects.create_user(
            username='alice', email='alice@example.com', password=STRONG_PASSWORD
        )

        response = self.client.post(
            self.token_url,
            {'username': 'alice', 'password': STRONG_PASSWORD},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_with_wrong_password_rejected(self):
        User.objects.create_user(
            username='alice', email='alice@example.com', password=STRONG_PASSWORD
        )

        response = self.client.post(
            self.token_url,
            {'username': 'alice', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user_for_valid_token(self):
        User.objects.create_user(
            username='alice', email='alice@example.com', password=STRONG_PASSWORD
        )
        login = self.client.post(
            self.token_url,
            {'username': 'alice', 'password': STRONG_PASSWORD},
            format='json',
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}"
        )

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')
        self.assertEqual(response.data['email'], 'alice@example.com')
