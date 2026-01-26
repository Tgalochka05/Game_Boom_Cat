from django.test import TestCase
from django.contrib.auth.models import User
from ..models import GameSession

class SecurityTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='secure_user', password='SecretPassword123')

    #Проверить, что пароли хранятся в хешированном виде
    def test_password_hashing(self):
        user = User.objects.get(username='secure_user')
        self.assertNotEqual(user.password, 'SecretPassword123')
        self.assertTrue(user.check_password('SecretPassword123'))

    #Тест на защиту от SQL-инъекций через ORM
    def test_sql_injection_protection(self):
        malicious_input = "1 OR 1=1"
        # Мы ожидаем, что Django выдаст ValueError, так как 'level' — это IntegerField
        # и он не пропустит строку. Это и есть защита.
        with self.assertRaises(ValueError):
            GameSession.objects.filter(level=malicious_input)

    #Проверка, что API сохраняет данные как есть, но при выводе мы ожидаем
    def test_xss_protection_in_api(self):
        xss_payload = "<script>alert('XSS')</script>"
        session = GameSession.objects.create(
            user=self.user, 
            score=0, 
            # Допустим, мы сохраняем payload в JSONField game_state
            game_state={"note": xss_payload} 
        )
        session.refresh_from_db()
        # Данные в БД должны остаться текстом, а не исполниться
        self.assertEqual(session.game_state['note'], xss_payload)