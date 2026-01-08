from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, UserViewSet, GameSessionViewSet, LeaderboardView, AchievementView, DailyQuestView, DailyQuestProgressView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'sessions', GameSessionViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('achievement/', AchievementView.as_view(), name='achievement'),
    path('dailyquest/', DailyQuestView.as_view(), name='dailyquest'),
    path('dailyquest/progress/', DailyQuestProgressView.as_view()),
]