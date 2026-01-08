from django.test import TestCase
from ..serializers import RegisterSerializer, GameSessionSerializer
from django.contrib.auth.models import User

class SerializerTestCase(TestCase):
    #Тест валидности формы регистрации с корректными данными
    def test_register_serializer_valid(self):
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'strongpassword123'
        }
        serializer = RegisterSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.username, 'newuser')

    #Тест невалидности формы (отсутствует пароль)
    def test_register_serializer_invalid(self):
        data = {
            'username': 'newuser',
            'email': 'new@test.com'
        }
        serializer = RegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    #Проверка валидации данных сессии
    def test_game_session_validation(self):
        data = {'level': 'invalid_level', 'score': 100} 
        serializer = GameSessionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('level', serializer.errors)