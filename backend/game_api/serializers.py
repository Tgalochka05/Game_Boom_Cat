from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, GameSession, Achievement, DailyQuest, Leaderboard, UserDailyQuest

#Сериализаторы для дальнейшей обработки данных регистрации/логина пользователя
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']

# Для регистрации
class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        
        # --- НОВАЯ ЛОГИКА: Выдача достижения при регистрации ---
        # 1. Создаем достижение, если его нет в базе
        ach, _ = Achievement.objects.get_or_create(
            title="Здравствуй, друг!",
            defaults={'description': "Зарегистрироваться в игре."}
        )
        # 2. Выдаем пользователю
        ach.users.add(user)
        # -------------------------------------------------------
        
        return user
#Игровые сессии
class GameSessionSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = GameSession
        # username попадет в __all__
        fields = '__all__'
        read_only_fields = ['user']
#Таблица лидеров
class LeaderboardSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Leaderboard
        fields = '__all__'
        read_only_fields = ['user']
#Достижения
class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'
#Ежедневные задания
class DailyQuestSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = DailyQuest
        fields = (
            'id',
            'title',
            'target_score',
            'reward_description',
            'completed',
            'progress'
        )

    def get_completed(self, obj):
        user = self.context['request'].user
        udq = UserDailyQuest.objects.filter(user=user, quest=obj).first()
        if udq:
            return udq.completed
        return False

    def get_progress(self, obj):
        user = self.context['request'].user
        udq = UserDailyQuest.objects.filter(user=user, quest=obj).first()
        if udq:
            return udq.progress
        return 0