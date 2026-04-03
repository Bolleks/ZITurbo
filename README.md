# Z-Image Генератор изображений

Веб-приложение для генерации изображений с помощью AI-модели **Z-Image** через API провайдера [Kie.ai](https://kie.ai).

## Возможности

- Генерация изображений по текстовому описанию (промпту)
- Выбор соотношения сторон: 1:1, 4:3, 3:4, 16:9, 9:16
- NSFW-фильтр
- Отслеживание статуса генерации в реальном времени
- Скачивание сгенерированного изображения

## Технологии

| Компонент | Стек |
|-----------|------|
| **Backend** | Node.js, Express, Axios |
| **Frontend** | React 18, Vite, Bootstrap 5 |

## Быстрый старт

### 1. Получите API-ключ

Зарегистрируйтесь на [kie.ai](https://kie.ai) и получите API-ключ на [странице управления ключами](https://kie.ai/api-key).

### 2. Настройте окружение

```bash
# Скопируйте пример .env файла
cp .env.example .env

# Вставьте свой API-ключ
# KIE_API_KEY=ваш_ключ
```

### 3. Установите зависимости

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 4. Запустите приложение

```bash
# Терминал 1 — Backend (порт 3001)
cd server && npm start

# Терминал 2 — Frontend (порт 3000)
cd client && npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## API-эндпоинты (Backend)

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/generate` | Создать задачу генерации |
| `GET`  | `/api/status/:taskId` | Получить статус задачи |
| `POST` | `/api/download-url` | Получить ссылку на скачивание |

### Пример запроса генерации

```json
POST /api/generate
{
  "prompt": "A photorealistic image of a cafe terrace in Paris",
  "aspect_ratio": "16:9",
  "nsfw_checker": true
}
```

### Ответ

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_z-image_1765174270120"
  }
}
```

## Структура проекта

```
ImageSearcher/
├── server/
│   ├── index.js           # Express сервер + API маршруты
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx        # Главный компонент
│   │   ├── main.jsx       # Точка входа React
│   │   └── components/
│   │       ├── PromptInput.jsx      # Форма ввода
│   │       ├── StatusTracker.jsx    # Статус задачи
│   │       └── ImageDisplay.jsx     # Отображение результата
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env.example
└── README.md
```

## Статусы задач

| Статус | Описание |
|--------|----------|
| `waiting` | Задача ожидает обработки |
| `queuing` | Задача в очереди |
| `generating` | Идёт генерация |
| `success` | Генерация завершена |
| `fail` | Ошибка генерации |

## Примечания

- Ссылки на скачивание действительны **20 минут**
- URL сгенерированных изображений истекают через **24 часа**
- Максимальная длина промпта: **1000 символов**
