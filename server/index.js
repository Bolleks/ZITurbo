require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const KIE_API_BASE = 'https://api.kie.ai';
const KIE_API_KEY = process.env.KIE_API_KEY;

if (!KIE_API_KEY) {
  console.error('Ошибка: Не указан KIE_API_KEY в .env файле');
  process.exit(1);
}

const kieApi = axios.create({
  baseURL: KIE_API_BASE,
  headers: {
    'Authorization': `Bearer ${KIE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

app.use(cors());
app.use(express.json());

// POST /api/generate — создание задачи генерации
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, aspect_ratio, nsfw_checker } = req.body;

    if (!prompt || !aspect_ratio) {
      return res.status(422).json({ error: 'prompt и aspect_ratio обязательны' });
    }

    if (prompt.length > 1000) {
      return res.status(422).json({ error: 'prompt не должен превышать 1000 символов' });
    }

    const validRatios = ['1:1', '4:3', '3:4', '16:9', '9:16'];
    if (!validRatios.includes(aspect_ratio)) {
      return res.status(422).json({ error: `Недопустимый aspect_ratio. Допустимые: ${validRatios.join(', ')}` });
    }

    const response = await kieApi.post('/api/v1/jobs/createTask', {
      model: 'z-image',
      input: {
        prompt,
        aspect_ratio,
        nsfw_checker: nsfw_checker !== undefined ? nsfw_checker : true
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка при создании задачи:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.msg || 'Ошибка при создании задачи'
    });
  }
});

// GET /api/status/:taskId — polling статуса задачи
app.get('/api/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const response = await kieApi.get('/api/v1/jobs/recordInfo', {
      params: { taskId }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка при получении статуса:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.msg || 'Ошибка при получении статуса задачи'
    });
  }
});

// POST /api/download-url — получение ссылки на скачивание
app.post('/api/download-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(422).json({ error: 'url обязателен' });
    }

    const response = await kieApi.post('/api/v1/common/download-url', { url });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка при получении ссылки:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.msg || 'Ошибка при получении ссылки для скачивания'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
