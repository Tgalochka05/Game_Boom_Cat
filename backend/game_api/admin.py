from django.contrib import admin
from django.http import HttpResponse
from .models import UserProfile, GameSession, Achievement, DailyQuest, Leaderboard, UserDailyQuest
import openpyxl

#Функция экспорта игровых сессий в XLSX
@admin.action(description='Экспорт выбранных в XLSX')
def export_to_xlsx(modeladmin, request, queryset):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Export"

    columns = ['ID', 'User', 'Score', 'Level', 'Date']
    ws.append(columns)

    for obj in queryset:
        date_str = obj.created_at.strftime("%Y-%m-%d %H:%M")
        ws.append([obj.id, obj.user.username, obj.score, obj.level, date_str])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename=export.xlsx'
    wb.save(response)
    return response
#Игровые сессии в админке регистрируем вместе с функцией
@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'score', 'level', 'created_at')
    list_filter = ('level', 'created_at')
    actions = [export_to_xlsx] # Добавляем действие

#Остальные зарегистрированные данные в админке
admin.site.register(UserProfile)
admin.site.register(Achievement)
admin.site.register(DailyQuest)
admin.site.register(UserDailyQuest)
admin.site.register(Leaderboard)