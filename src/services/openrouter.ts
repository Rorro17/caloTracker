// OpenRouter AI Service for Food Analysis

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-lite-001';

export interface AIAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis?: string;
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
  * Dulce de leche / Mermelada = 1 cucharada sopera de 25g (80 kcal, 1.5g P, 0g G, 20g C)
  * Porción de torta rellena/cobertura dulce (ej. dulce de leche, crema) = 100g (350 kcal, 5g P, 15g G, 50g C)
  * Porción de bizcochuelo/torta simple sin relleno = 60g (200 kcal, 3g P, 5g G, 35g C)
- ¡IMPORTANTE! Las porciones de la tabla son únicamente de REFERENCIA. Debes ajustar proporcionalmente los gramos y los macronutrientes al tamaño o descripción real de la porción. No copies literalmente los valores de la tabla de referencia si la porción es visiblemente diferente (ej. si indica media porción o un pedazo chico, multiplica los macros de referencia por 0.5).
- Para alimentos dulces, pastelería y postres, ten en cuenta su altísima densidad calórica y estima con cuidado el peso y sus ingredientes.
- Calcula las calorías totales multiplicando estrictamente: Calorías = (proteína * 4) + (carbohidratos * 4) + (grasa * 9).

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido que contenga exactamente estas llaves:
- "analysis": Explicación detallada en español identificando cada alimento, estimando su peso en gramos, indicando la escala o proporción aplicada a la referencia, y calculando los macros individuales de forma analítica antes de sumarlos.
- "name": Nombre conciso del plato en español.
- "calories": Entero redondeado (calculado estrictamente con la fórmula 4-4-9).
- "protein": Gramos de proteína (número).
- "carbs": Gramos de carbohidratos (número).
- "fat": Gramos de grasa (número).

Ejemplo de respuesta esperada:
{
  "analysis": "Se describe media porción de torta con dulce de leche. Aplicamos un factor de escala de 0.5 a la referencia estándar de 100g (estimando 50g): Proteínas: 5g * 0.5 = 2.5g, Carbohidratos: 50g * 0.5 = 25g, Grasas: 15g * 0.5 = 7.5g. Calorías = 2.5*4 + 25*4 + 7.5*9 = 10 + 100 + 67.5 = 177.5 kcal.",
  "name": "Porción pequeña de torta con dulce de leche",
  "calories": 178,
  "protein": 2.5,
  "carbs": 25,
  "fat": 7.5
}`;

  // Se realiza la petición con temperature: 0.0 para garantizar consistencia y determinismo en el análisis
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
      response_format: { type: 'json_object' },
      temperature: 0.0
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
      analysis: String(result.analysis ?? result.analisis ?? result.análisis ?? ''),
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
- La hoja de un cuchillo de mesa estándar tiene un ancho de aprox. 1.5 a 2 cm y la parte metálica mide unos 10 a 12 cm de largo. Utiliza esto para calcular los centímetros, volumen tridimensional del alimento y estimar su peso real en gramos (por ejemplo, un pedazo pequeño de bizcochuelo/tarta al lado de un cuchillo puede pesar unos 50-60 gramos, no 100 gramos).
- Si el tamaño del plato o porción no está claro, usa estas referencias estándar:
  * Pechuga de pollo cocida = 150g (165 kcal, 31g P, 3g G, 0g C)
  * Bife de carne vacuna cocida = 150g (250 kcal, 35g P, 12g G, 0g C)
  * Huevo entero mediano = 50g (75 kcal, 6g P, 5g G, 0.5g C)
  * Taza de arroz blanco cocido = 150g (195 kcal, 4g P, 0.5g G, 42g C)
  * Rebanada de pan de molde = 30g (80 kcal, 3g P, 1g G, 15g C)
  * Cucharada de aceite (girasol/oliva) = 10g (90 kcal, 0g P, 10g G, 0g C)
  * Papa/Patata cocida mediana = 150g (130 kcal, 3g P, 0.2g G, 30g C)
  * Dulce de leche / Mermelada = 1 cucharada sopera de 25g (80 kcal, 1.5g P, 0g G, 20g C)
  * Porción de torta rellena/cobertura dulce (ej. dulce de leche, crema) = 100g (350 kcal, 5g P, 15g G, 50g C)
  * Porción de bizcochuelo/torta simple sin relleno = 60g (200 kcal, 3g P, 5g G, 35g C)
- ¡IMPORTANTE! Las porciones de la tabla son únicamente de REFERENCIA. Debes ajustar proporcionalmente los gramos y los macronutrientes al tamaño real observado en la imagen. No copies literalmente los valores de la tabla de referencia si el tamaño del plato o porción no coincide (ej. si el pedazo es la mitad de la porción estándar de 100g, multiplica los macros por 0.5).
- Presta especial atención al aceite o aderezos visibles en la imagen que añaden grasa ("calorías invisibles").
- Para alimentos dulces, repostería, pastelería y dulces (tales como bizcochuelos con dulce de leche, crema, chocolate), considera que su densidad calórica es muy elevada. Estima con cuidado el grosor de las capas de relleno (dulce de leche, crema, chocolate, etc.) y calcula el peso basándote en la escala visual.
- Calcula las calorías totales multiplicando estrictamente: Calorías = (proteína * 4) + (carbohidratos * 4) + (grasa * 9).

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido que contenga exactamente estas llaves:
- "analysis": Explicación detallada en español identificando cada alimento de la imagen, estimando su peso en gramos, explicando la escala aplicada a los valores de referencia y calculando los macros individuales de forma analítica antes de sumarlos.
- "name": Nombre conciso del plato en español.
- "calories": Entero redondeado (calculado estrictamente con la fórmula 4-4-9).
- "protein": Gramos de proteína (número).
- "carbs": Gramos de carbohidratos (número).
- "fat": Gramos de grasa (número).

Ejemplo de respuesta esperada:
{
  "analysis": "Se observa un trozo pequeño de tarta con dulce de leche. Comparado con la hoja del cuchillo (~12cm de largo), estimamos que el trozo mide unos 6cm y pesa aproximadamente 50g (la mitad de la referencia estándar de 100g). Por ende, multiplicamos los macros de referencia por 0.5: Proteínas: 5g * 0.5 = 2.5g, Carbohidratos: 50g * 0.5 = 25g, Grasas: 15g * 0.5 = 7.5g. Calorías = 2.5*4 + 25*4 + 7.5*9 = 10 + 100 + 67.5 = 177.5 kcal.",
  "name": "Porción pequeña de tarta con dulce de leche",
  "calories": 178,
  "protein": 2.5,
  "carbs": 25,
  "fat": 7.5
}`;

  // Se realiza la petición con temperature: 0.0 para garantizar consistencia y determinismo en el análisis
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
      response_format: { type: 'json_object' },
      temperature: 0.0
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
      analysis: String(result.analysis ?? result.analisis ?? result.análisis ?? ''),
    };
  } catch (e) {
    console.error('Error parsing AI response:', textContent, e);
    throw new Error('No se pudo interpretar el análisis de la IA sobre la foto. Inténtalo de nuevo o escribe una descripción.');
  }
}
