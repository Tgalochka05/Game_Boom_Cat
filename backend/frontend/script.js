// --- КОНФИГУРАЦИЯ БЭКЕНДА ---
const API_URL = '/api';
let authToken = localStorage.getItem('accessToken');
// Функция для связи с API
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('accessToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        console.warn('Unauthorized, redirect to auth');
        logoutUser();
        throw new Error('Unauthorized');
    }

    return response;
}

// Функция работы с экранами
const ScreenManager = (() => {
    const screens = [
        'auth-screen',
        'start-screen',
        'tutorial-screen',
        'game-screen',
        'end-screen',
        'leaderboard-screen',
        'achievement-screen',
        'gamesession-screen',
        'dailyquest-screen'
    ];

    function hideAll() {
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    function show(id) {
        hideAll();
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Screen not found: ${id}`);
            return;
        }
        el.classList.remove('hidden');
    }

    return { show };
})();

// --- АВТОРИЗАЦИЯ ---
// Функция перехода между формой логина
function toggleAuth(form) {
    if (form === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
    document.getElementById('auth-error').textContent = '';
}
// Функция авторизации
async function loginUser() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const text = await response.text();
        let data = {};

        try {
            data = JSON.parse(text);
        } catch {
            console.error('Ответ не JSON:', text);
            throw new Error('Invalid JSON');
        }

        if (response.ok) {
            authToken = data.access;
            localStorage.setItem('accessToken', authToken);
            localStorage.setItem('refreshToken', data.refresh);
            showStart();
        } else {
            document.getElementById('auth-error').textContent =
                data.detail || 'Ошибка входа';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('auth-error').textContent = 'Ошибка сети';
    }
}
// Функция регистрации
async function registerUser() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;

    try {
        const response = await fetch(`${API_URL}/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });

        if (response.ok) {
            alert('Успешно! Войдите.');
            toggleAuth('login');
        } else {
            const data = await response.json();
            document.getElementById('auth-error').textContent = 'Ошибка регистрации';
        }
    } catch (e) { document.getElementById('auth-error').textContent = 'Ошибка сети'; }
}
// Функция загрузки данных пользователя в профиль
async function loadUserProfile() {
    try {
        // Используем endpoint 'me', который уже есть в views.py
        const response = await apiFetch(`${API_URL}/users/me/`);
        if (!response.ok) return;

        const data = await response.json();
        
        // Обновляем HTML
        document.getElementById('user-name').textContent = `Имя: ${data.username}`;
        
        // Данные профиля вложены внутри объекта profile (см. UserSerializer)
        const bio = data.profile && data.profile.bio ? data.profile.bio : 'не указано';
        const dob = data.profile && data.profile.date_of_birth ? data.profile.date_of_birth : 'не указано';

        document.getElementById('user-bio').textContent = `Обо мне: ${bio}`;
        document.getElementById('user-dob').textContent = `Дата рождения: ${dob}`;
    } catch (e) {
        console.error("Ошибка загрузки профиля:", e);
    }
}
// Функция выхода из аккаунта
function logoutUser() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    authToken = null;

    toggleAuth('login');
    showAuth();
}

// --- ТАБЛИЦА ЛИДЕРОВ ---
async function showLeaderboard() {
    ScreenManager.show('leaderboard-screen');

    const list = document.getElementById('leaderboard-list');
    list.textContent = 'Загрузка...';

    try {
        const response = await apiFetch(`${API_URL}/leaderboard/`, {
            method: 'GET'
        });
        const data = await response.json();
        list.textContent = '';
        
        if (data.length === 0) {
            list.textContent = 'Пока пусто.';
            return;
        }

        data.forEach((entry, index) => {
            // 1. Красивое название уровня
            const levelNamesRun = { 1: 'Легкий', 2: 'Средний', 3: 'Сложный' };
            const levelText = levelNamesRun[entry.level] || 'Легкий';

            // 2. Добавляем строку
            const li = document.createElement('li');
            switch(index){
                case 0:
                    li.innerHTML = `${index + 1}.<b id="zoloto" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                case 1:
                    li.innerHTML = `${index + 1}.<b id="serebro" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                case 2:
                    li.innerHTML = `${index + 1}.<b id="bronze" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                default:
                    li.innerHTML = `${index + 1}.<b class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
            }
            list.appendChild(li);
        });
    } catch (e) { list.textContent = 'Ошибка загрузки.'; }
}
// Функция специально для обновления таблицы лидеров
async function updateLeaderboard(level = 1) {
    const list = document.getElementById('leaderboard-list');
    list.textContent = 'Загрузка...'; // Показываем, что процесс идет

    try {
        // Отправляем запрос с параметром уровня
        const response = await apiFetch(`${API_URL}/leaderboard/?level=${level}`);
        const data = await response.json();

        list.innerHTML = ''; // Очищаем список перед отрисовкой

        if (data.length === 0) {
            list.innerHTML = '<li style="text-align:center;">В этой категории пока пусто. Стань первым!</li>';
            return;
        }

        data.forEach((entry, index) => {
            const li = document.createElement('li');
            const levelNames = { 1: 'Легкий', 2: 'Средний', 3: 'Сложный' };
            const levelText = levelNames[entry.level] || 'Легкий';
            switch(index){
                case 0:
                    li.innerHTML = `${index + 1}.<b id="zoloto" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                case 1:
                    li.innerHTML = `${index + 1}.<b id="serebro" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                case 2:
                    li.innerHTML = `${index + 1}.<b id="bronze" class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
                default:
                    li.innerHTML = `${index + 1}.<b class="username"></b> — ${levelText} — Кол. очков: ${entry.score}`;
                    li.querySelector('.username').textContent = entry.username;
                    break;
            }
            list.appendChild(li);
        });

    } catch (error) {
        console.error(error);
        list.innerHTML = 'Ошибка загрузки данных';
    }
}
// Выход из таблицы лидеров
function hideLeaderboard() {
    if (authToken) {
        showStart()
    } else {
        showAuth();
    }
}

// --- ТАБЛИЦА ДОСТИЖЕНИЙ ---
async function showMyAchievement() {
    ScreenManager.show('achievement-screen');

    const list = document.getElementById('achievement-list');
    list.textContent = 'Загрузка...';

    try {
        const response = await apiFetch(`${API_URL}/achievement/`, {
            method: 'GET'
        });
        const data = await response.json();
        list.textContent = '';
        
        if (data.length === 0) {
            list.textContent = 'Пока пусто.';
            return;
        }

        data.forEach((ac, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>&ensp;<b id="ach_title">${ac.title}</b></span></br>
                <span>&emsp;&emsp;${ac.description}</span>
            `;
            list.appendChild(li);
        });
    } catch (e) { list.textContent = 'Ошибка загрузки.'; }
}
// Выход из таблицы лидеров
function hideAchievement() {
    if (authToken) {
        showStart()
    } else {
        showAuth();
    }
}

// --- ТАБЛИЦА ЕЖЕДНЕВНЫХ ЗАДАНИЙ ---
async function showDailyQuest() {
    ScreenManager.show('dailyquest-screen');

    const list = document.getElementById('dailyquest-list');
    list.textContent = 'Загрузка...';

    try {
        const response = await apiFetch(`${API_URL}/dailyquest/`, {
            method: 'GET'
        });
        const data = await response.json();
        list.textContent = '';
        
        if (data.length === 0) {
            list.textContent = 'Пока пусто.';
            return;
        }

        data.forEach(quest => {
            const li = document.createElement('li');
            li.className = quest.completed ? 'done' : '';

            li.innerHTML = `
                <span>${quest.title}</span>
                <span>
                    ${quest.progress} / ${quest.target_score}
                    ${quest.completed ? '✅' : ''}
                </span>
            `;

            list.appendChild(li);
        });
    } catch (e) { list.textContent = 'Ошибка загрузки.'; }
}
// Выход из окна ежедневных заданий
function hideDailyQuest() {
    if (authToken) {
        showStart()
    } else {
        showAuth();
    }
}
// Функция обновления прогресса выполнения ежедневных заданий
async function updateDailyQuestProgress(points) {
    if (!authToken) return;

    try {
        await apiFetch('/api/dailyquest/progress/', {
            method: 'POST',
            body: JSON.stringify({ score: points })
        });
    } catch (e) {
        console.warn('DailyQuest progress error', e);
    }
}

// ИГРОВЫЕ СЕССИИ (Сохранённые игры)
async function showMyGameSession() {
    ScreenManager.show('gamesession-screen');

    const list = document.getElementById('gamesession-list');
    list.textContent = 'Загрузка...';

    try {
        const response = await apiFetch(`${API_URL}/sessions/`);
        const data = await response.json();

        list.textContent = '';

        if (data.length === 0) {
            list.textContent = 'Нет сохранений';
            return;
        }
        const levelNames = {
            1: 'Легкий',
            2: 'Средний',
            3: 'Сложный'
        };
        data.forEach(session => {
            const namelevel = levelNames[session.level] || 'Лёгкий'; 
            const li = document.createElement('li');
            li.innerHTML = `
                <span>Очки: ${session.score}, время: ${session.time_played}, уровень: ${namelevel}</span>
                <button onclick='loadGameSession(${JSON.stringify(session)})'>
                    Продолжить
                </button>
            `;
            list.appendChild(li);
        });
    } catch {
        list.textContent = 'Ошибка загрузки';
    }
}
// Запуск сохранённой игры
function loadGameSession(session) {
    const levelNames = {
        1: 'easy',
        2: 'medium',
        3: 'hard'
    };
    gameState.level = levelNames[session.level] || 'easy'; 
    gameState.score = session.score;
    gameState.timeLeft = 60 - (session.time_played || 0);
    
    // Если время вышло или отрицательное (глюк), ставим 60
    if (gameState.timeLeft <= 0) gameState.timeLeft = 60;

    scoreValue.textContent = gameState.score;
    timeValue.textContent = gameState.timeLeft;
    
    // Обновляем текст уровня (по-русски)
    const ruLevels = { 'easy': 'Легкий', 'medium': 'Средний', 'hard': 'Сложный' };
    document.getElementById('levelValue').textContent = ruLevels[gameState.level] || 'Легкий';

    // Запускаем игру
    ScreenManager.show('game-screen');
    startGameFromSave();
}
// Функция управления редактирования профиля
function toggleProfileEdit(show) {
    const viewDiv = document.getElementById('profile-view');
    const editDiv = document.getElementById('profile-edit');
    
    if (show) {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
    } else {
        viewDiv.classList.remove('hidden');
        editDiv.classList.add('hidden');
    }
}
// Функция сохранения отредактированной информации
async function saveUserProfile() {
    const newBio = document.getElementById('edit-bio').value;
    const newDob = document.getElementById('edit-dob').value;

    // Формируем только те данные, которые не пустые
    const updateData = {};
    if (newBio) updateData.bio = newBio;
    if (newDob) updateData.date_of_birth = newDob;

    if (Object.keys(updateData).length === 0) {
        toggleProfileEdit(false);
        return;
    }

    try {
        const response = await apiFetch(`${API_URL}/users/me/`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            alert('Профиль обновлен!');
            loadUserProfile(); // Перезагружаем данные на экране
            toggleProfileEdit(false); // Скрываем форму
        } else {
            alert('Ошибка обновления');
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка соединения');
    }
}
// Запуск сохранённой игры
function startGameFromSave() {
    showGame();

    gameState.timerInterval = setInterval(updateTimer, 1000);
    gameState.gameInterval = setInterval(
        spawnTarget,
        difficultySettings[gameState.level].spawnInterval
    );
}
// Сохраненние игры в определённой момент времени (после нажатия кнопки "Сохранить")
function saveCurrentGame() {
    const timePlayed = 60 - gameState.timeLeft;
    
    saveGameResult(
        gameState.score,
        gameState.level,
        timePlayed, // Передаем время
        false
    );
}
// Выход из окна сохранённых игр
function hideGamesession(){
    if (authToken) {
        showStart()
    } else {
        showAuth();
    }
}

// Основная функция по сохранению игровых сессий ---
async function saveGameResult(finalScore, finalLevel, timePlayed, completed) {
    if (!authToken) return;
    const levelMap = {
        'easy': 1,
        'medium': 2,
        'hard': 3
    };
    const numericLevel = levelMap[finalLevel] || 1; // Если уровень не найден, по умолчанию ставим 1

    try {
        await apiFetch(`${API_URL}/sessions/`, {
            method: 'POST',
            body: JSON.stringify({
                score: finalScore,
                level: numericLevel,
                time_played: timePlayed,
                is_completed: completed
            })
        });
        
        if (!completed) alert('Игра сохранена!'); 
        

    } catch (e) { 
        console.error("Ошибка сохранения:", e); 
    }
}

// Инициализация Howler.js для звуков
const sounds = {
    click: new Howl({ src: [' /static/sounds/click.mp3'] }),
    success: new Howl({ src: ['/static/sounds/success.mp3'] }),
    background: new Howl({ 
        src: ['/static/sounds/background.mp3'],
        loop: true,
        volume: 0.3
    })
};

// Элементы DOM
const startScreen = document.getElementById('startScreen');
const tutorialScreen = document.getElementById('tutorialScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const startBtn = document.getElementById('startBtn');
const tutorialBtn = document.getElementById('tutorialBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const nameError = document.getElementById('nameError');
const difficultySelect = document.getElementById('difficulty');
const gameArea = document.getElementById('gameArea');
const scoreValue = document.getElementById('scoreValue');
const timeValue = document.getElementById('timeValue');
const levelValue = document.getElementById('levelValue');
const reactionValue = document.getElementById('reactionValue');
const finalScore = document.getElementById('finalScore');
const avgReaction = document.getElementById('avgReaction');
const secretMessage = document.getElementById('secretMessage');

// Игровые переменные
let gameState = {
    score: 0,
    timeLeft: 60,
    level: 'easy',
    targetsClicked: 0,
    totalReactionTime: 0,
    gameInterval: null,
    timerInterval: null,
    isPaused: false,
    soundOn: true,
    secretCode: [],
    secretCodeSequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
};

// Настройки уровней сложности
const difficultySettings = {
    easy: {
        targetSize: 'easy',
        spawnInterval: 1500,
        disappearTime: 3000,
        points: 10,
        levelName: 'Легкий'
    },
    medium: {
        targetSize: 'medium',
        spawnInterval: 1000,
        disappearTime: 2000,
        points: 20,
        levelName: 'Средний'
    },
    hard: {
        targetSize: 'hard',
        spawnInterval: 700,
        disappearTime: 1500,
        points: 30,
        levelName: 'Сложный'
    }
};

// Инициализация игры
function initGame() {
    // Настройка обработчиков событий
    setupEventListeners();
}
// Настройка всех обработчиков событий
function setupEventListeners() {
    startBtn.addEventListener('click', startGame);
    tutorialBtn.addEventListener('click', showTutorial);
    backToMenuBtn.addEventListener('click', showStart);
    pauseBtn.addEventListener('click', togglePause);
    soundBtn.addEventListener('click', toggleSound);
    restartBtn.addEventListener('click', startGame);
    menuBtn.addEventListener('click', showStart);
    
    // Обработка секретного кода
    document.addEventListener('keydown', handleSecretCode);
}
// Вход в окно с логином
function showAuth() {
    ScreenManager.show('auth-screen');
    toggleAuth('login');
}
// Вход в главное окно
function showStart() {
    ScreenManager.show('start-screen');
    sounds.background.stop();

    if (authToken) {
        loadUserProfile();
    }
}
// Вход в туториал
function showTutorial() {
    ScreenManager.show('tutorial-screen');
}
// Запукс экрана игры
function showGame() {
    ScreenManager.show('game-screen');
    if (gameState.soundOn) sounds.background.play();
}
// Окно окончания игры
function showEnd() {
    ScreenManager.show('end-screen');
    sounds.background.stop();
}


// Начать новую игру
function startGame() {
    
    // Сброс игрового состояния
    gameState.score = 0;
    gameState.timeLeft = 60;
    gameState.level = difficultySelect.value;
    gameState.targetsClicked = 0;
    gameState.totalReactionTime = 0;
    gameState.isPaused = false;
    gameState.secretCode = [];
    
    // Обновление UI
    scoreValue.textContent = '0';
    timeValue.textContent = '60';
    reactionValue.textContent = '-';
    levelValue.textContent = difficultySettings[gameState.level].levelName;
    
    // Очистка игровой области
    gameArea.innerHTML = '';
    
    // Показать игровой экран
    showGame();
    
    // Запуск таймера
    gameState.timerInterval = setInterval(updateTimer, 1000);
    
    // Запуск спавна целей
    gameState.gameInterval = setInterval(spawnTarget, difficultySettings[gameState.level].spawnInterval);
}
// Обновления таймера
function updateTimer() {
    if (gameState.isPaused) return;

    gameState.timeLeft--;
    timeValue.textContent = gameState.timeLeft;
    
    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

//Функция спавна котиков
function spawnTarget() {
    if (gameState.isPaused) return;
    
    const settings = difficultySettings[gameState.level];
    const target = document.createElement('div');
    target.className = `target ${settings.targetSize}`;
    
    //Пределы спавна
    const maxX = gameArea.offsetWidth - parseInt(target.style.width || 50);
    const maxY = gameArea.offsetHeight - parseInt(target.style.height || 50);
    
    // Случайная позиция в пределах игровой области
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    
    // Запоминаем время появления
    const appearTime = Date.now();
    
    // Обработчик клика
    target.addEventListener('click', function() {
        if (gameState.isPaused) return;
        
        const reactionTime = Date.now() - appearTime;
        gameState.totalReactionTime += reactionTime;
        gameState.targetsClicked++;
        
        // Обновление UI
        reactionValue.textContent = reactionTime;
        
        // Добавление очков
        const points = Math.max(1, Math.floor(settings.points * (1 - reactionTime / settings.disappearTime)));
        gameState.score += points;
        scoreValue.textContent = gameState.score;

        updateDailyQuestProgress(points);
        
        // Воспроизведение звука
        if (gameState.soundOn) {
            sounds.click.play();
        }
        
        // Анимация взрыва
        createExplosion(x, y);
        
        // Удаление цели
        target.remove();
    });
    
    gameArea.appendChild(target);
    
    // Автоматическое исчезновение цели через некоторое время
    setTimeout(() => {
        if (target.parentNode === gameArea) {
            target.remove();
        }
    }, settings.disappearTime);
}
//Генерация взрыва
function createExplosion(x, y) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = `${x}px`;
    explosion.style.top = `${y}px`;
    explosion.style.width = '100px';
    explosion.style.height = '100px';
    
    gameArea.appendChild(explosion);
    
    // Удаление взрыва после анимации
    setTimeout(() => {
        explosion.remove();
    }, 1000);
}
//Пауза
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    pauseBtn.textContent = gameState.isPaused ? 'Продолжить' : 'Пауза';
    
    if (gameState.isPaused) {
        sounds.background.pause();
    } else {
        sounds.background.play();
    }
}
//управление звуком
function toggleSound() {
    gameState.soundOn = !gameState.soundOn;
    soundBtn.textContent = gameState.soundOn ? 'Звук Вкл' : 'Звук Выкл';
    
    Howler.mute(!gameState.soundOn);
}
//Окончание игры
function endGame() {
    // Очистка интервалов
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.gameInterval);
    
    // Расчет средней реакции
    const avgReactionTime = gameState.targetsClicked > 0 
        ? Math.round(gameState.totalReactionTime / gameState.targetsClicked)
        : 0;
    
    // Обновление UI
    finalScore.textContent = gameState.score;
    avgReaction.textContent = avgReactionTime;
    
    // Показать экран окончания игры
    showEnd();
    // Считаем время
    const timePlayed = 60 - gameState.timeLeft;

    saveGameResult(
        gameState.score,
        gameState.level,
        timePlayed, // Передаем время
        true
    );
}
// Обработка секретного кода
function handleSecretCode(e) {
    gameState.secretCode.push(e.key);
    if (gameState.secretCode.length > gameState.secretCodeSequence.length) {
        gameState.secretCode.shift();
    }
    
    // Проверка совпадения с секретной последовательностью
    if (gameState.secretCode.join(',') === gameState.secretCodeSequence.join(',')) {
        secretMessage.textContent = 'Поздравляем! Вы нашли секретную пасхалку! +1000 очков!';
        gameState.score += 1000;
        scoreValue.textContent = gameState.score;
        
        // Очистка кода после активации
        gameState.secretCode = [];
        
        // Воспроизведение звука успеха
        if (gameState.soundOn) {
            sounds.success.play();
        }
    }
}
// Обработки загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    initGame();

    if (authToken) {
        showStart();
    } else {
        showAuth();
    }
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            ScreenManager.show('leaderboard-screen');
            updateLeaderboard(1); // Загружаем список для 1-го уровня сложности
        });
    }
});
