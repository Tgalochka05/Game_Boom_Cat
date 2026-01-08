from django.contrib.auth.models import User
from django.views.generic import TemplateView

from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.views import APIView

from django_filters.rest_framework import DjangoFilterBackend
from datetime import date

from .models import GameSession, Achievement, DailyQuest, UserDailyQuest
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    GameSessionSerializer,
    AchievementSerializer,
    DailyQuestSerializer,
    UserProfileSerializer,
    LeaderboardSerializer,
)

import random

# Регистрация
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

# API для пользователя (профиль)
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    #Получение и редактирование данных пользователя
    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Вывод достижений пользователя
    @action(detail=True, methods=['get'])
    def achievements(self, request, pk=None):
        user = self.get_object()
        achievements = user.achievements.all()
        serializer = AchievementSerializer(achievements, many=True)
        return Response(serializer.data)
#Игровые сессии
class GameSessionViewSet(viewsets.ModelViewSet):
    serializer_class = GameSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['level', 'is_completed']
    ordering_fields = ['score', 'created_at']

    def get_queryset(self):
        # Возвращаем только НЕ завершенные игры (чтобы их можно было доиграть)
        return GameSession.objects.filter(
            user=self.request.user, 
            is_completed=False
        ).order_by('-updated_at')

    def perform_create(self, serializer):
        # Сохраняем сессию
        instance = serializer.save(user=self.request.user)

        # Если игра завершена (is_completed=True), проверяем рейтинг
        if instance.is_completed:
            self.check_rank_achievements(self.request.user)
    def check_rank_achievements(self, user):
        # 1. Считаем текущий рейтинг (логика как в Leaderboard)
        all_sessions = GameSession.objects.order_by('-score', '-created_at')
        
        # Собираем уникальных пользователей и их лучшие очки
        best_scores = []
        seen_users = set()
        for s in all_sessions:
            if s.user_id not in seen_users:
                best_scores.append(s.user_id)
                seen_users.add(s.user_id)
        
        # Находим позицию нашего пользователя (индекс + 1)
        if user.id in best_scores:
            rank = best_scores.index(user.id) + 1
            
            # 2. Выдаем достижения
            if rank <= 10:
                self.grant_achievement(user, "В десятке!", "Попасть в топ 10 игроков.")
            if rank <= 5:
                self.grant_achievement(user, "Элита", "Попасть в топ 5 игроков.")
            if rank <= 3:
                self.grant_achievement(user, "Чемпион", "Попасть в топ 3 игроков.")

    def grant_achievement(self, user, title, desc):
        ach, _ = Achievement.objects.get_or_create(title=title, defaults={'description': desc})
        if user not in ach.users.all():
            ach.users.add(user)

    @action(detail=False, methods=['get'])
    def last(self, request):
        session = (
            self.get_queryset()
            .order_by('-created_at')
            .first()
        )
        if not session:
            return Response(
                {"detail": "No sessions found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(session)
        return Response(serializer.data)
#Таблица лидеров
class LeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardSerializer
    permission_classes = [permissions.AllowAny] # Таблицу могут видеть все

    def get_queryset(self):
        # Получаем уровень из запроса (если не прислали — считаем, что нужен 1-й)
        level_param = self.request.query_params.get('level', 1)
        
        # Фильтруем: берем только этот уровень и только завершенные игры
        return GameSession.objects.filter(
            level=level_param, 
            is_completed=True
        ).select_related('user').order_by('-score', '-created_at')

    def list(self, request, *args, **kwargs):
        # Получаем все сессии
        queryset = self.get_queryset()

        # Оставляем только первую (лучшую) запись для каждого юзера
        unique_sessions = []
        seen_users = set()
        
        for session in queryset:
            if session.user_id not in seen_users:
                unique_sessions.append(session)
                seen_users.add(session.user_id)
            
            # Ограничим список топ-50 игроками
            if len(unique_sessions) >= 50:
                break
        
        # Сериализуем отфильтрованный список
        serializer = self.get_serializer(unique_sessions, many=True)
        return Response(serializer.data)
#Достижения
class AchievementView(generics.ListAPIView):
    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Achievement.objects.filter(users=self.request.user)
#Ежедневные задания
class DailyQuestView(generics.ListAPIView):
    serializer_class = DailyQuestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        today = date.today()
        quests = DailyQuest.objects.filter(date_for=today)

        # Если заданий на сегодня нет — ГЕНЕРИРУЕМ ИХ!
        if not quests.exists():
            self.generate_daily_quests(today)
            quests = DailyQuest.objects.filter(date_for=today)
            
        return quests

    # Генерация заданий
    def generate_daily_quests(self, today_date):
        # Шаблоны заданий
        templates = [
            {"title": "Разминка", "score": 20, "reward": "Новичок"},
            {"title": "Набери обороты", "score": 50, "reward": "Опытный"},
            {"title": "Мастер клика", "score": 100, "reward": "Мастер"},
            {"title": "Невозможный", "score": 200, "reward": "Легенда"},
        ]
        
        # Выбираем 2 случайных задания на сегодня
        selected = random.sample(templates, 2)
        
        for t in selected:
            DailyQuest.objects.create(
                title=t["title"],
                target_score=t["score"],
                reward_description=t["reward"],
                date_for=today_date
            )
#Обработка прогресса ежедневного задания
class DailyQuestProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        score_delta = request.data.get('score', 0)
        today = date.today()

        quests = DailyQuest.objects.filter(date_for=today)

        for quest in quests:
            udq, created = UserDailyQuest.objects.get_or_create(
                user=request.user, 
                quest=quest,
                defaults={'progress': 0, 'completed': False} 
            )
            
            if not udq.completed:
                udq.progress += score_delta
                # Проверяем выполнение
                if udq.progress >= quest.target_score:
                    udq.completed = True
                udq.save()

        return Response({"status": "ok"})
#Указание основного шаблона
class IndexView(TemplateView):
    template_name = "index.html"