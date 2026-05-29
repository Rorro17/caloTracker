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

  const prompt = `Analiza la siguiente descripción de comida en español y estima sus calorías y macronutrientes.
Descripción: "${description}"

INSTRUCCIONES DE ESTIMACIÓN DE PORCIONES:
- Si el usuario no especifica cantidades, usa estas porciones de referencia estándar:
  * Pechuga de pollo cocida = 150g (165 kcal, 31g P, 3g G, 0g C)
  * Bife de carne vacuna cocida = 150g (250 kcal, 35g P, 12g G, 0g C)
  * Huevo entero mediano = 50g (75 kcal, 6g P, 5g G, 0.5g C)
  * Taza de arroz blanco cocido = 150g (195 kcal, 4g P, 0.5g G, 42g C)
  * Rebanada de pan de molde = 30g (80 kcal, 3g P, 1g G, 15g C)
  * Cucharada de aceite (girasol/oliva) = 10g (90 kcal, 0g P, 10g G, 0g C)
  * Banana mediana = 120g (105 kcal, 1.3g P, 0.3g G, 27g C)
  * Aguacate/Palta mediana = 150g (240 kcal, 3g P, 22g G, 12g C)
- Ajusta proporcionalmente las cantidades si la descripción provee pistas claras (ej. "plato grande", "porción doble").
- Calcula las calorías totales multiplicando estrictamente: Calorías = (proteína * 4) + (carbohidratos * 4) + (grasa * 9).

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido que contenga exactamente estas llaves:
- "analysis": Explicación detallada en español identificando cada alimento, estimando su peso en gramos y calculando los macros individuales de forma analítica antes de sumarlos.
- "name": Nombre conciso del plato en español.
- "calories": Entero redondeado (calculado estrictamente con la fórmula 4-4-9).
- "protein": Gramos de proteína (número).
- "carbs": Gramos de carbohidratos (número).
- "fat": Gramos de grasa (número).

Ejemplo de respuesta esperada:
{
  "analysis": "Se identifica 1 plátano mediano (~120g, 105 kcal, 1.3g P, 27g C, 0.3g G) y 1 cucharada de mantequilla de maní (~16g, 95 kcal, 4g P, 3g C, 8g G). Sumando todo: Proteínas: 5.3g, Carbos: 30g, Grasas: 8.3g. Calorías = 5.3*4 + 30*4 + 8.3*9 = 21.2 + 120 + 74.7 = 215.9 kcal.",
  "name": "Plátano con mantequilla de maní",
  "calories": 216,
  "protein": 5.3,
  "carbs": 30,
  "fat": 8.3
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

  const prompt = `Analiza la imagen de la comida provista en español y estima sus calorías y macronutrientes.
${description ? `Información o descripción adicional provista por el usuario: "${description}"` : ''}

INSTRUCCIONES DE ESTIMACIÓN DE PORCIONES Y ESCALA:
- Identifica los alimentos en la imagen. Usa como referencia visual de escala los cubiertos, vasos, manos o asume que se sirve en un plato llano de tamaño estándar de 24 cm de diámetro.
- Si el tamaño del plato o porción no está claro, usa estas referencias estándar:
  * Pechuga de pollo cocida = 150g (165 kcal, 31g P, 3g G, 0g C)
  * Bife de carne vacuna cocida = 150g (250 kcal, 35g P, 12g G, 0g C)
  * Huevo entero mediano = 50g (75 kcal, 6g P, 5g G, 0.5g C)
  * Taza de arroz blanco cocido = 150g (195 kcal, 4g P, 0.5g G, 42g C)
  * Rebanada de pan de molde = 30g (80 kcal, 3g P, 1g G, 15g C)
  * Cucharada de aceite (girasol/oliva) = 10g (90 kcal, 0g P, 10g G, 0g C)
  * Papa/Patata cocida mediana = 150g (130 kcal, 3g P, 0.2g G, 30g C)
- Presta especial atención al aceite o aderezos visibles en la imagen que añaden grasa ("calorías invisibles").
- Calcula las calorías totales multiplicando estrictamente: Calorías = (proteína * 4) + (carbohidratos * 4) + (grasa * 9).

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido que contenga exactamente estas llaves:
- "analysis": Explicación detallada en español identificando cada alimento de la imagen, estimando su peso en gramos y calculando los macros individuales de forma analítica antes de sumarlos.
- "name": Nombre conciso del plato en español.
- "calories": Entero redondeado (calculado estrictamente con la fórmula 4-4-9).
- "protein": Gramos de proteína (número).
- "carbs": Gramos de carbohidratos (número).
- "fat": Gramos de grasa (número).

Ejemplo de respuesta esperada:
{
  "analysis": "Se observa un filete de pechuga de pollo asado de tamaño mediano (aprox. 150g, 31g P, 3g G), una porción moderada de arroz (aprox. 150g, 4g P, 42g C, 0.5g G) y ensalada verde de lechuga y tomate sin aderezos calóricos (aprox. 100g, 15 kcal, 1g P, 3g C). Sumando todo: Proteínas: 36g, Carbos: 45g, Grasas: 3.5g. Calorías = 36*4 + 45*4 + 3.5*9 = 144 + 180 + 31.5 = 355.5 kcal.",
  "name": "Pechuga de pollo con arroz y ensalada",
  "calories": 356,
  "protein": 36,
  "carbs": 45,
  "fat": 3.5
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
