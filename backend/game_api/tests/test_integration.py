from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from ..models import GameSession

class GameFlowIntegrationTest(APITestCase):
    #Полный цикл основной услуги: Регистрация -> Игра -> Результат
    def test_full_game_cycle(self):
        # Регистрация
        reg_data = {'username': 'gamer1', 'password': 'pass123', 'email': 'g@test.com'}
        response = self.client.post('/api/register/', reg_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Получаем пользователя из БД
        user = User.objects.get(username='gamer1')
        
        # Логин (получение токена, если используется JWT, но для теста можно использовать force_authenticate)
        self.client.force_authenticate(user=user)
        
        # Игровой процесс (сохранение результата, симулируем, что JS отправил данные после игры)
        game_data = {
            'level': 2,
            'score': 500,
            'time_played': 45,
            'is_completed': True
        }
        response = self.client.post('/api/sessions/', game_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверка изменения состояния системы
        self.assertTrue(GameSession.objects.filter(user=user, score=500).exists())
        
        # Проверка попадания в лидерборд (фильтрация)
        response = self.client.get('/api/leaderboard/?level=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['score'], 500)
        self.assertEqual(response.data[0]['username'], 'gamer1')