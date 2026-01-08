from django.db import models
from django.contrib.auth.models import User

# Абстрактная модель с датами 
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    class Meta:
        abstract = True

# Профиль пользователя 
class UserProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True, verbose_name="О себе")
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Дата рождения")

    def __str__(self):
        return f"Профиль {self.user.username}"

# Сохранение игры 
class GameSession(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    level = models.IntegerField(default=1)
    score = models.IntegerField(default=0)
    time_played = models.IntegerField(default=0, help_text="Время в секундах")
    is_completed = models.BooleanField(default=False)
    game_state = models.JSONField(default=dict, blank=True) 

    def __str__(self):
        return f"Игра {self.user.username} - Lvl {self.level}"

#Таблица лидеров
class Leaderboard(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leaderboard')
    level = models.IntegerField(default=1)
    score = models.IntegerField(default=0)
    time_played = models.IntegerField(default=0, help_text="Время в секундах")
    is_completed = models.BooleanField(default=False)
    game_state = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Игра {self.user.username} - Lvl {self.level}"

# Достижения 
class Achievement(TimeStampedModel):
    title = models.CharField(max_length=100)
    description = models.TextField()
    users = models.ManyToManyField(User, related_name='achievements', blank=True)

    def __str__(self):
        return self.title

# Доп. функционал: Ежедневные задания (Абстрактная модель для ежедневных заданий)
class DailyQuest(TimeStampedModel):
    title = models.CharField(max_length=100)
    target_score = models.IntegerField()
    reward_description = models.CharField(max_length=100)
    date_for = models.DateField(unique=True)

    def __str__(self):
        return f"{self.title} ({self.date_for})"
#Ежедневные задания конкретного пользователя
class UserDailyQuest(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quest = models.ForeignKey(DailyQuest, on_delete=models.CASCADE)
    progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'quest')

    def __str__(self):
        return f"{self.user.username} — {self.quest.title}"