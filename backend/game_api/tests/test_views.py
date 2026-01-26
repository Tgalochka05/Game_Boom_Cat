from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from django.urls import reverse
from ..models import GameSession

class ViewTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='player', password='password123')
        self.admin = User.objects.create_superuser(username='admin', password='adminpass')
        self.session_url = '/api/sessions/' # Проверь свой router в urls.py

    #Гость не имеет доступа к созданию сессий
    def test_guest_access_denied(self):
        response = self.client.post(self.session_url, {'score': 100})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    #Авторизованный пользователь может создать сессию
    def test_user_can_create_session(self):
        self.client.force_authenticate(user=self.user)
        data = {'score': 100, 'level': 1, 'time_played': 60, 'is_completed': True}
        response = self.client.post(self.session_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GameSession.objects.count(), 1)

    #Таблица лидеров доступна всем (AllowAny)
    def test_leaderboard_read_access(self):
        """"""
        url = reverse('leaderboard') # имя из urls.py
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_access(self):
        """Администратор имеет доступ к админ-панели (проверка статус-кода)"""
        self.client.force_login(self.admin)
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)