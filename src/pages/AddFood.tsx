// Add Food Page Component
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { analyzeFoodDescription, analyzeFoodImage } from '@/services/openrouter';
import { Sparkles, Save, BookOpen, Utensils, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack / Otros' },
];

// Helper to get local current date YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddFood() {
  const navigate = useNavigate();
  const { addFoodEntry, customFoods, addCustomFood } = useStore();

  // AI analysis text & photo states
  const [aiText, setAiText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [meal, setMeal] = useState<string>('breakfast');
  const [saveAsCustom, setSaveAsCustom] = useState(false);

  // Selector state
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Compress and resize image using HTML5 Canvas to avoid high network payload sizes
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Procesando foto...');
    const reader = new FileReader();
    reader.onload = (event) => {
      // Create new browser image (use window.Image to avoid conflict with React component naming if any)
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        // Resize proportional calculation
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert canvas image to base64 JPEG format with 80% compression quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(compressedBase64);
        toast.success('¡Foto cargada y optimizada!', { id: toastId });
      };
      img.onerror = () => {
        toast.error('Error al procesar la imagen.', { id: toastId });
      };
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo.', { id: toastId });
    };
    reader.readAsDataURL(file);
  };

  // Helper to clear the loaded food photo
  const clearPhoto = () => {
    setImagePreview(null);
  };

  // Handle AI analysis (multimodal photo or description text)
  const handleAIAnalysis = async () => {
    if (!imagePreview && !aiText.trim()) {
      toast.error('Por favor escribe qué comiste o sube una foto para analizar.');
      return;
    }

    setAnalyzing(true);
    const toastId = toast.loading(
      imagePreview 
        ? 'Gemini está analizando la foto de tu comida...' 
        : 'Gemini está analizando tu descripción...'
    );

    try {
      let result;
      if (imagePreview) {
        // Use the multimodal API method with the base64 data and context text
        result = await analyzeFoodImage(imagePreview, aiText);
      } else {
        // Fall back to the text-only estimation description API
        result = await analyzeFoodDescription(aiText);
      }

      setName(result.name);
      setCalories(result.calories);
      setProtein(result.protein);
      setCarbs(result.carbs);
      setFat(result.fat);
      
      // Smart meal selection based on current time
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 11) setMeal('breakfast');
      else if (hour >= 11 && hour < 16) setMeal('lunch');
      else if (hour >= 19 && hour < 23) setMeal('dinner');
      else setMeal('snack');

      toast.success('¡Análisis completado!', { id: toastId });
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      toast.error(error.message || 'No se pudo analizar la comida. Inténtalo de forma manual.', { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre de la comida es obligatorio.');
      return;
    }

    const kcalVal = Number(calories) || 0;
    const protVal = Number(protein) || 0;
    const carbVal = Number(carbs) || 0;
    const fatVal = Number(fat) || 0;

    const todayStr = getTodayString();

    try {
      // 1. Save entry
      await addFoodEntry({
        name,
        calories: kcalVal,
        protein: protVal,
        carbs: carbVal,
        fat: fatVal,
        meal: meal as any,
        date: todayStr,
      });

      // 2. Conditionally save as custom quick food
      if (saveAsCustom) {
        await addCustomFood({
          name,
          calories: kcalVal,
          protein: protVal,
          carbs: carbVal,
          fat: fatVal,
        });
      }

      // Navigate back to Hoy (dashboard)
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  // Load custom food item into form
  const handleSelectCustomFood = (food: any) => {
    setName(food.name);
    setCalories(food.calories);
    setProtein(food.protein);
    setCarbs(food.carbs);
    setFat(food.fat);
    setShowCustomDrawer(false);
    toast.success(`Cargado: ${food.name}`);
  };

  const filteredCustomFoods = customFoods.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-5 p-5 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center mt-2">
        <div>
          <h2 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
            Cargar Alimento
          </h2>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
            ¿Qué comiste hoy? 🍎
          </h1>
        </div>
        
        <button
          onClick={() => setShowCustomDrawer(!showCustomDrawer)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-primary-600 dark:text-primary-400 transition-all tap-effect"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Mis Alimentos
        </button>
      </div>

      {/* AI Assistant Section */}
      <div className="bg-gradient-to-tr from-primary-600 to-indigo-500 dark:from-slate-900 dark:to-indigo-950/40 p-5 rounded-3xl text-white shadow-md shadow-primary-500/10 flex flex-col gap-3 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-indigo-200 dark:text-primary-400 animate-pulse" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-100 dark:text-slate-400">
            Analizar con Inteligencia Artificial
          </h3>
        </div>

        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder={
            imagePreview 
              ? "Opcional: Agrega contexto sobre la foto (ej: pechuga cocida a la plancha sin aceite, aderezo light)..." 
              : "Ej: 2 huevos revueltos con una rebanada de pan integral tostado y una taza de café negro con azúcar..."
          }
          rows={3}
          disabled={analyzing}
          className="w-full p-3 bg-white/15 dark:bg-slate-950/60 border border-white/10 dark:border-slate-800 rounded-2xl placeholder-white/55 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-indigo-500 text-white resize-none"
        />

        {/* Camera / Photo uploader with preview */}
        <div className="flex flex-col gap-2">
          {imagePreview ? (
            <div className="relative w-full aspect-video max-h-40 rounded-2xl overflow-hidden border border-white/20 bg-slate-950/40">
              <img
                src={imagePreview}
                alt="Foto de la comida"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={clearPhoto}
                disabled={analyzing}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white border border-white/10 transition-all tap-effect"
                title="Quitar foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-white/25 hover:border-white/40 bg-white/5 hover:bg-white/10 text-xs font-semibold text-indigo-100 dark:text-slate-300 cursor-pointer transition-all duration-150 select-none tap-effect">
              <Camera className="w-4 h-4 text-indigo-200" />
              <span>Tomar foto o subir imagen</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={analyzing}
              />
            </label>
          )}
        </div>

        <button
          onClick={handleAIAnalysis}
          disabled={analyzing}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150 tap-effect ${
            analyzing
              ? 'bg-white/20 text-white/50 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 dark:text-white shadow-sm'
          }`}
        >
          {analyzing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{imagePreview ? 'Analizar Foto con IA' : 'Analizar Descripción con IA'}</span>
            </>
          )}
        </button>
      </div>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          Detalles del Alimento
        </h3>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            Nombre del alimento
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Banana, Pechuga de pollo, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
          />
        </div>

        {/* Meal Type selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            Momento del día
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMeal(type.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all tap-effect ${
                  meal === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Macros & Calorie Inputs */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Calorías (kcal)
            </label>
            <input
              type="number"
              placeholder="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Proteína (g)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={protein}
              onChange={(e) => setProtein(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Carbohidratos (g)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Grasas (g)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={fat}
              onChange={(e) => setFat(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Custom food saving toggle */}
        <label className="flex items-center gap-3 mt-1.5 py-1 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsCustom}
            onChange={(e) => setSaveAsCustom(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Guardar en mis alimentos personalizados
          </span>
        </label>

        {/* Action Button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary-500/20 tap-effect"
        >
          <Save className="w-4 h-4" />
          <span>Registrar Alimento</span>
        </button>
      </form>

      {/* Drawer overlay for custom foods list */}
      {showCustomDrawer && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-end">
          {/* Overlay click closer */}
          <div className="absolute inset-0" onClick={() => setShowCustomDrawer(false)} />
          
          {/* Content container */}
          <div className="relative w-full max-w-mobile bg-white dark:bg-slate-900 rounded-t-[32px] p-5 shadow-2xl border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4 max-h-[70vh] overflow-y-auto z-10">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
            
            <div className="flex justify-between items-center mt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Mis Alimentos Personalizados
              </h3>
              <button
                onClick={() => setShowCustomDrawer(false)}
                className="text-xs font-bold text-primary-500"
              >
                Listo
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar alimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />

            <div className="flex flex-col gap-2.5 overflow-y-auto">
              {filteredCustomFoods.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No se encontraron alimentos personalizados.
                </div>
              ) : (
                filteredCustomFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleSelectCustomFood(food)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-primary-50/50 dark:bg-slate-950/40 dark:hover:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/60 rounded-2xl text-left transition-all tap-effect group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {food.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {food.calories} kcal • P: {food.protein}g • C: {food.carbs}g • G: {food.fat}g
                      </span>
                    </div>
                    <Utensils className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-primary-500" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
