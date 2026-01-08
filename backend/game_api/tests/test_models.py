from django.test import TestCase
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from ..models import UserProfile, GameSession, Achievement, DailyQuest, UserDailyQuest, Leaderboard
from django.utils import timezone
import datetime

class AllModelsTestCase(TestCase):
    def setUp(self):
        # При создании пользователя через create_user может сработать сигнал 
        # или логика сериализатора, создающая профиль.
        self.user = User.objects.create_user(username='tester', password='password123')
        
        # Проверяем, создался ли профиль автоматически. Если нет — создаем.
        # Это защищает от ошибки UniqueViolation.
        self.profile, created = UserProfile.objects.get_or_create(user=self.user)
    
    #Тест UserProfile
    def test_user_profile_creation(self):
        self.assertIsInstance(self.profile, UserProfile)
        self.assertEqual(self.profile.user.username, 'tester')
    
    #Тест GameSession
    def test_game_session_creation(self):
        session = GameSession.objects.create(user=self.user, score=150, level=2)
        self.assertEqual(session.user, self.user)
        self.assertIsNotNone(session.created_at)

    #Тест Achievement
    def test_achievement_creation(self):
        ach = Achievement.objects.create(title="Первая победа", description="Ура!")
        ach.users.add(self.user)
        self.assertIn(self.user, ach.users.all())

    #Тест DailyQuest (Валидация уникальности даты)
    def test_daily_quest_and_uniqueness(self):
        today = datetime.date.today()
        DailyQuest.objects.create(title="Квест 1", target_score=100, reward_description="R", date_for=today)
        
        # Теперь IntegrityError импортирован и NameError не будет
        with self.assertRaises(IntegrityError):
            DailyQuest.objects.create(title="Квест 2", target_score=50, reward_description="R", date_for=today)

    #Тест UserDailyQuest
    def test_user_daily_quest(self):
        quest = DailyQuest.objects.create(title="Квест X", target_score=100, reward_description="R", date_for=datetime.date.today())
        udq = UserDailyQuest.objects.create(user=self.user, quest=quest, progress=50)
        self.assertEqual(udq.progress, 50)

    #Тест Leaderboard
    def test_leaderboard_creation(self):
        lb_entry = Leaderboard.objects.create(user=self.user, score=500, level=3)
        self.assertEqual(lb_entry.score, 500)
    
    #Проверка связей
    def test_relationships(self):
        self.assertEqual(self.user.profile, self.profile)

    #Проверка автоматического заполнения created_at из абстрактной модели
    def test_abstract_timestamp_fields(self):
        session = GameSession.objects.create(user=self.user, score=100)
        self.assertIsNotNone(session.created_at)
        self.assertIsInstance(session.created_at, datetime.datetime)
        
        # Проверка updated_at
        old_time = session.updated_at
        session.score = 200
        session.save()
        self.assertNotEqual(session.updated_at, session.created_at)

    #Проверка связей ForeignKey и OneToOne
    def test_relationships(self):
        # OneToOne
        self.assertEqual(self.user.profile, self.profile)
        
        # ForeignKey
        session = GameSession.objects.create(user=self.user, score=50)
        self.assertEqual(session.user, self.user)
        self.assertIn(session, self.user.sessions.all()) # related_name='sessions'

    #Проверка связи ManyToMany
    def test_many_to_many_achievement(self):
        ach = Achievement.objects.create(title="Test Ach", description="Desc")
        ach.users.add(self.user)
        self.assertIn(self.user, ach.users.all())
        self.assertIn(ach, self.user.achievements.all()) # related_name='achievements'