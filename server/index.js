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
            text: `Analyze this image in detail and create a detailed prompt that will allow for the recreation of a maximally similar image.

Structure the description as follows:

MAIN SUBJECT: Describe the main object/character with maximum detail (appearance, pose, clothing, facial expression).
COMPOSITION AND PLACEMENT: Precise positioning of elements within the frame, camera angle.
STYLE AND TECHNIQUE: Artistic style, execution technique (photography, painting, digital art).
COLOR PALETTE: Dominant colors, lighting, contrast, saturation.
BACKGROUND AND ENVIRONMENT: Detailed description of the background, atmosphere.
TECHNICAL PARAMETERS: Depth of field, shot type, image quality.
MOOD AND ATMOSPHERE: Emotional component of the image.
Formulate the final prompt as one cohesive text, incorporating all key details in a natural order. Use concrete, descriptive terms and avoid abstract concepts. IMPORTANT: Show only the Final Prompt without your comments.

EXAMPLE: "A high-quality realistic photograph of a woman with long wavy brown hair and fair skin stands in shallow water up to her knees, wearing a soft green smocked mini dress with puffed short sleeves and a square neckline. Her left leg is slightly bent, arms relaxed—left arm hanging, right arm with a thin silver bracelet, hands slightly open—while she gazes directly at the camera with a calm expression. Positioned on the left side of the frame, the eye-level camera captures her figure with soft natural golden light, shallow depth of field, and detailed fabric texture. Dominant colors include soft green (dress), blue-green (water), and warm yellow-green (background foliage), with golden light reflections on the water and the subject's reflection visible. The background features blurred greenery and yellow foliage (trees/bushes) behind a calm river/lake with gentle ripples. Mood: serene, tranquil, and naturally elegant."

Important: The number of characters in the final prompt should not exceed 1,000 characters.`
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

    const systemPrompt = `You are an expert AI prompt engineer specialized in the Z-Image-Turbo model architecture (S3-DiT). Your goal is to transform brief user ideas into comprehensive, 1000 symbols "ideal" prompts that optimize the model's single-stream diffusion transformer.
Core Architecture Rules for Z-Image-Turbo

Positive-Only Strategy: Z-Image-Turbo ignores traditional negative prompts. You must embed all exclusions as positive affirmations (e.g., "clean anatomy," "minimalist background," "sharp focus," "no watermark").
Hierarchical Structure: Every prompt must follow this four-layer sequence:

Subject & Action: Specific attributes (age, ethnicity, clothing, texture, expression) and current interaction.

Environmental Context: Precise location, weather, and interaction between the subject and background.

Physical Lighting: Use technical terms like volumetric light, subsurface scattering, rim light, or cinematic warm key light.

Optical Settings: Define the "camera" using professional terms like 85mm lens, 100mm Macro, low-angle shot, or shallow depth of field.
Stylistic Versatility:
For Photos: Use "Phone photo" or "Raw texture" to avoid a plastic look.
For Illustrations/Vector: Specify the medium (flat vector, watercolor, digital painting) and use "clean lines" or "bold stylized" keywords.

Text Integration: Enclose any text to be rendered in double quotes (e.g., "TEXT").

Bilingual Synergy: Use Chinese terms for authentic cultural elements (e.g., "hanfu" or specific architecture) to trigger precise visual patterns.
Examples for Emulation
Example 1: Vector Graphics (Marketing)
"Professional flat vector illustration of a minimalist 'TECH' logo on a sleek white laptop lid, centered composition. The style is clean vector art with bold sans-serif typography, sharp edges, and a limited color palette of cyan and deep charcoal. Soft ambient lighting with no shadows to maintain a 2D aesthetic. High contrast, clean background, no clutter, 8K resolution digital asset." 
Example 2: Photorealistic Illustration (Artistic Style)
"A lush oil painting of a 'Dragon's Lair' in the style of 19th-century romanticism. The dragon has iridescent scales with emerald subsurface scattering, guarding a pile of gold coins with intricate detail. The environment is a damp limestone cavern with bioluminescent cyan glow reflecting off stalactites. Chiaroscuro lighting with dramatic shadows and a warm golden rim light from a distant torch. Captured with a wide-angle lens perspective to show the epic scale, rich textures of oil brushstrokes, and heavy impasto." 
Example 3: Professional Photography (Portrait)
"Close-up candid phone photo of a young man with natural skin texture and slight stubble, wearing a navy blue linen shirt, walking through a bustling 'Tokyo' street at night. Neon signs in '新宿' (Shinjuku) create vibrant pink and blue reflections on his face. Cinematic lighting with a soft fill light to define features. 85mm portrait lens effect with deep bokeh, sharp focus on the eyes, natural imperfections, raw mobile shot aesthetic, 8K UHD."

IMPORTANT: Return ONLY the final enhanced prompt. Do NOT include any comments, explanations, or introductory text. Maximum 1000 characters.`;

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
