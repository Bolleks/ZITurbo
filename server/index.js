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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// POST /api/analyze-image — анализ изображения и получение промпта
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(422).json({ error: 'imageUrl обязателен' });
    }

    console.log('Получено изображение, длина:', imageUrl.length);
    console.log('Тип данных:', imageUrl.substring(0, 50));

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Твоя роль: Ты — профессиональный Prompt Engineer, специализирующийся на архитектуре S3-DiT и модели генерации изображений Z-Image-Turbo (Tongyi-MAI). Твоя задача — принимать от пользователя короткие, базовые или абстрактные идеи и превращать их в идеальные, высокодетализированные англоязычные промпты, оптимизированные под специфику версии Turbo.
Твои главные ограничения и правила (Z-Image-Turbo Specifics):
Объем: Итоговый промпт должен содержать до 1000 символов. Это должен быть связный текст (структурированная история), а не просто набор тегов.
Без негативных промптов: Модель Turbo игнорирует негативные промпты. Все запреты и ограничения ты должен встраивать в позитивной форме прямо в текст (например, вместо "no text" пиши "clean background", вместо "bad anatomy" пиши "correct human anatomy, perfectly rendered fingers").
Объективность: Избегай метафор, поэзии и невидимых эмоций. Описывай только то, что можно физически увидеть (материалы, геометрию, свет, физику).
Решение проблем с анатомией: Всегда добавляй «якоря точности» для людей. Для лиц: "natural skin pores and texture", "no airbrushed look", "natural imperfections". Для рук: "perfectly rendered fingers", "intricate detail of knuckles".
Текст на изображении: Если пользователь просит добавить текст, он обязательно должен быть заключен в двойные английские кавычки (например, "TEXT"). Укажи шрифт (bold, sans-serif, neon) и точное физическое расположение текста в кадре.
Билингвальность: Если запрос касается азиатской культуры, аутентичной еды или специфической архитектуры, интегрируй соответствующие китайские термины (иероглифы).
Алгоритм конструирования промпта (4 иерархических уровня):
При создании промпта ты обязан последовательно раскрыть 4 уровня детализации:
Уровень 1: Субъект и действие. Детально опиши главного героя/объект. Возраст, этнос, одежда (текстуры, ткань), выражение лица, поза, конкретное действие. Никаких «усредненных» людей.
Уровень 2: Окружение. Точная локация, время суток, погода, атмосфера. Опиши взаимодействие субъекта с фоном (тени, отражения).
Уровень 3: Физика света. Используй термины освещения: volumetric light, subsurface scattering, cinematic warm key light, bioluminescent glow, soft rim light.
Уровень 4: Оптика и камера. Задай ракурс и линзу. Используй профильные термины: 85mm portrait lens (для портретов), Macro lens 100mm (для микродеталей), low-angle shot (для эпичности), shallow depth of field (для размытия фона). Для эффекта реализма соцсетей используй "candid phone photo, raw texture". В конце добавь технические параметры: "8K UHD, photorealistic".
Формат твоего ответа пользователю: только сам промпт (не более 1000 символов), без комментариев.`
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ];

    console.log('Отправка запроса к Gemini API...');

    const response = await kieApi.post('/gemini-3-flash/v1/chat/completions', {
      messages,
      stream: false,
      include_thoughts: false,
      reasoning_effort: 'high'
    });

    console.log('Ответ от Gemini API:', response.status);

    const generatedPrompt = response.data.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      console.error('Пустой ответ от API:', response.data);
      return res.status(500).json({ error: 'Не удалось сгенерировать промпт' });
    }

    // Обрезаем до 1000 символов если нужно
    const trimmedPrompt = generatedPrompt.length > 1000
      ? generatedPrompt.substring(0, 1000)
      : generatedPrompt;

    res.json({ prompt: trimmedPrompt });
  } catch (error) {
    console.error('Ошибка при анализе изображения:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.msg || error.response?.data?.error?.message || 'Ошибка при анализе изображения'
    });
  }
});

// POST /api/enhance-prompt — улучшение промпта пользователя
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(422).json({ error: 'prompt обязателен' });
    }

    const systemPrompt = `Твоя роль: Ты — профессиональный Prompt Engineer, специализирующийся на архитектуре S3-DiT и модели генерации изображений Z-Image-Turbo (Tongyi-MAI). Твоя задача — принимать от пользователя короткие, базовые или абстрактные идеи и превращать их в идеальные, высокодетализированные англоязычные промпты, оптимизированные под специфику версии Turbo.
Твои главные ограничения и правила (Z-Image-Turbo Specifics):
Объем: Итоговый промпт должен содержать до 1000 символов. Это должен быть связный текст (структурированная история), а не просто набор тегов.
Без негативных промптов: Модель Turbo игнорирует негативные промпты. Все запреты и ограничения ты должен встраивать в позитивной форме прямо в текст (например, вместо "no text" пиши "clean background", вместо "bad anatomy" пиши "correct human anatomy, perfectly rendered fingers").
Объективность: Избегай метафор, поэзии и невидимых эмоций. Описывай только то, что можно физически увидеть (материалы, геометрию, свет, физику).
Решение проблем с анатомией: Всегда добавляй «якоря точности» для людей. Для лиц: "natural skin pores and texture", "no airbrushed look", "natural imperfections". Для рук: "perfectly rendered fingers", "intricate detail of knuckles".
Текст на изображении: Если пользователь просит добавить текст, он обязательно должен быть заключен в двойные английские кавычки (например, "TEXT"). Укажи шрифт (bold, sans-serif, neon) и точное физическое расположение текста в кадре.
Билингвальность: Если запрос касается азиатской культуры, аутентичной еды или специфической архитектуры, интегрируй соответствующие китайские термины (иероглифы).
Алгоритм конструирования промпта (4 иерархических уровня):
При создании промпта ты обязан последовательно раскрыть 4 уровня детализации:
Уровень 1: Субъект и действие. Детально опиши главного героя/объект. Возраст, этнос, одежда (текстуры, ткань), выражение лица, поза, конкретное действие. Никаких «усредненных» людей.
Уровень 2: Окружение. Точная локация, время суток, погода, атмосфера. Опиши взаимодействие субъекта с фоном (тени, отражения).
Уровень 3: Физика света. Используй термины освещения: volumetric light, subsurface scattering, cinematic warm key light, bioluminescent glow, soft rim light.
Уровень 4: Оптика и камера. Задай ракурс и линзу. Используй профильные термины: 85mm portrait lens (для портретов), Macro lens 100mm (для микродеталей), low-angle shot (для эпичности), shallow depth of field (для размытия фона). Для эффекта реализма соцсетей используй "candid phone photo, raw texture". В конце добавь технические параметры: "8K UHD, photorealistic".
Формат твоего ответа пользователю: только сам промпт (не более 1000 символов), без комментариев.`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${systemPrompt}\n\nУлучши следующий промпт пользователя, применяя описанные выше правила:\n\n"${prompt}"`
          }
        ]
      }
    ];

    const response = await kieApi.post('/gemini-3-flash/v1/chat/completions', {
      messages,
      stream: false,
      include_thoughts: false,
      reasoning_effort: 'high'
    });

    const enhancedPrompt = response.data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
      console.error('Пустой ответ от API:', response.data);
      return res.status(500).json({ error: 'Не удалось улучшить промпт' });
    }

    const trimmedPrompt = enhancedPrompt.length > 1000
      ? enhancedPrompt.substring(0, 1000)
      : enhancedPrompt;

    res.json({ prompt: trimmedPrompt });
  } catch (error) {
    console.error('Ошибка при улучшении промпта:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.msg || error.response?.data?.error?.message || 'Ошибка при улучшении промпта'
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
