// OpenRouter AI Service for Food Analysis

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-lite-001';

export interface AIAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function analyzeFoodDescription(description: string): Promise<AIAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('La API Key de OpenRouter no está configurada en las variables de entorno.');
  }

  const prompt = `Analiza la siguiente descripción de comida en español y estima los macronutrientes correspondientes:
Descripción: "${description}"

Debes responder ÚNICAMENTE con un objeto JSON válido.
IMPORTANTE: No traduzcas las llaves del JSON. Deben ser exactamente "name", "calories", "protein", "carbs" y "fat".

Ejemplo de respuesta esperada:
{
  "name": "2 huevos fritos",
  "calories": 180,
  "protein": 13,
  "carbs": 1,
  "fat": 14
}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'CaloTracker',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content || '';

  // Clean markdown block wrappers if present
  let cleanJson = textContent.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  try {
    const result = JSON.parse(cleanJson);
    return {
      name: String(result.name ?? result.nombre ?? description),
      calories: Math.round(Number(result.calories ?? result.calorias ?? result.calorías ?? 0)),
      protein: Math.max(0, parseFloat(String(result.protein ?? result.proteina ?? result.proteinas ?? result.proteínas ?? 0))),
      carbs: Math.max(0, parseFloat(String(result.carbs ?? result.carbohidratos ?? result.hidratos ?? 0))),
      fat: Math.max(0, parseFloat(String(result.fat ?? result.grasa ?? result.grasas ?? 0))),
    };
  } catch (e) {
    console.error('Error parsing AI response:', textContent, e);
    throw new Error('No se pudo interpretar el análisis de la IA. Inténtalo con otra descripción o ingresa los datos a mano.');
  }
}

export async function analyzeFoodImage(
  base64Data: string,
  description: string = ''
): Promise<AIAnalysisResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('La API Key de OpenRouter no está configurada en las variables de entorno.');
  }

  const prompt = `Analiza la imagen de la comida provista en español y estima los macronutrientes correspondientes.
${description ? `Información adicional o descripción del usuario: "${description}"` : ''}

Debes responder ÚNICAMENTE con un objeto JSON válido.
IMPORTANTE: No traduzcas las llaves del JSON. Deben ser exactamente "name", "calories", "protein", "carbs" y "fat".

Ejemplo de respuesta esperada:
{
  "name": "Pechuga de pollo con arroz y brócoli",
  "calories": 450,
  "protein": 40,
  "carbs": 45,
  "fat": 8
}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'CaloTracker',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Data
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.choices?.[0]?.message?.content || '';

  // Clean markdown block wrappers if present
  let cleanJson = textContent.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  try {
    const result = JSON.parse(cleanJson);
    return {
      name: String(result.name ?? result.nombre ?? (description || 'Comida analizada por foto')),
      calories: Math.round(Number(result.calories ?? result.calorias ?? result.calorías ?? 0)),
      protein: Math.max(0, parseFloat(String(result.protein ?? result.proteina ?? result.proteinas ?? result.proteínas ?? 0))),
      carbs: Math.max(0, parseFloat(String(result.carbs ?? result.carbohidratos ?? result.hidratos ?? 0))),
      fat: Math.max(0, parseFloat(String(result.fat ?? result.grasa ?? result.grasas ?? 0))),
    };
  } catch (e) {
    console.error('Error parsing AI response:', textContent, e);
    throw new Error('No se pudo interpretar el análisis de la IA sobre la foto. Inténtalo de nuevo o escribe una descripción.');
  }
}
