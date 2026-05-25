import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { logoutUser } from '@/services/firebase';
import { Settings, User, LogOut, Sun, Moon, Laptop, Calculator, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, theme, setTheme, updateUserProfile, logout } = useStore();

  // Personal metrics state
  const [age, setAge] = useState(user?.age || 30);
  const [height, setHeight] = useState(user?.height || 175);
  const [weight, setWeight] = useState(user?.weight || 70);
  const [sex, setSex] = useState<'male' | 'female'>('male'); // For MSJ equation
  const [goal, setGoal] = useState(user?.goal || 'maintain');
  
  // Advanced Activity Calculator states
  const [neatType, setNeatType] = useState<'sedentary' | 'light' | 'active' | 'very_active'>(user?.neatType || 'sedentary');
  const [workoutFrequency, setWorkoutFrequency] = useState<number>(user?.workoutFrequency ?? 3);
  const [workoutIntensity, setWorkoutIntensity] = useState<'light' | 'moderate' | 'intense'>(user?.workoutIntensity || 'moderate');

  // Nutritional goals state
  const [calorieGoal, setCalorieGoal] = useState(user?.calorieGoal || 2000);
  const [proteinGoal, setProteinGoal] = useState(user?.proteinGoal || 150);
  const [carbsGoal, setCarbsGoal] = useState(user?.carbsGoal || 200);
  const [fatGoal, setFatGoal] = useState(user?.fatGoal || 65);

  const [saving, setSaving] = useState(false);

  // Helper to compute TDEE dynamically based on NEAT + EAT inputs
  const getEstimatedTdee = () => {
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;
    const bmr = sex === 'male' ? baseBMR + 5 : baseBMR - 161;

    const neatBases: Record<string, number> = {
      sedentary: 1.15,
      light: 1.25,
      active: 1.35,
      very_active: 1.50,
    };
    const baseMultiplier = neatBases[neatType] || 1.15;

    const intensityFactors: Record<string, number> = {
      light: 0.025,
      moderate: 0.05,
      intense: 0.075,
    };
    const intensityFactor = intensityFactors[workoutIntensity] || 0.05;

    const calculatedMultiplier = baseMultiplier + (workoutFrequency * intensityFactor);
    return Math.round(bmr * calculatedMultiplier);
  };

  const tdee = getEstimatedTdee();

  // Keep state synced with user profile loaded later
  useEffect(() => {
    if (user) {
      setAge(user.age);
      setHeight(user.height);
      setWeight(user.weight);
      setGoal(user.goal);
      setCalorieGoal(user.calorieGoal);
      setProteinGoal(user.proteinGoal);
      setCarbsGoal(user.carbsGoal);
      setFatGoal(user.fatGoal);
      setNeatType(user.neatType || 'sedentary');
      setWorkoutFrequency(user.workoutFrequency ?? (user.activityLevel === 'sedentary' ? 0 : user.activityLevel === 'lightly_active' ? 3 : 5));
      setWorkoutIntensity(user.workoutIntensity || 'moderate');
    }
  }, [user]);

  // Calculate goals using Mifflin-St Jeor equation and standard sports science splits
  const handleAutoCalculate = () => {
    // MSJ Equation: BMR
    // Men: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
    // Women: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;
    const bmr = sex === 'male' ? baseBMR + 5 : baseBMR - 161;

    // Advanced Activity Multiplier calculation
    const neatBases: Record<string, number> = {
      sedentary: 1.15,
      light: 1.25,
      active: 1.35,
      very_active: 1.50,
    };
    const baseMultiplier = neatBases[neatType] || 1.15;

    const intensityFactors: Record<string, number> = {
      light: 0.025,
      moderate: 0.05,
      intense: 0.075,
    };
    const intensityFactor = intensityFactors[workoutIntensity] || 0.05;

    const calculatedMultiplier = baseMultiplier + (workoutFrequency * intensityFactor);
    const tdee = bmr * calculatedMultiplier;

    // Goal adjustment
    let targetCalories = Math.round(tdee);
    if (goal === 'lose_fat') {
      targetCalories = Math.round(tdee - 500);
    } else if (goal === 'gain_muscle') {
      targetCalories = Math.round(tdee + 300);
    }

    // Macro division:
    // Protein: 2.0g per kg of bodyweight
    // Fat: 1.0g per kg of bodyweight
    // Carbs: remaining calories / 4
    const calculatedProtein = Math.round(weight * 2.0);
    const calculatedFat = Math.round(weight * 0.9); // ~0.9g/kg is very healthy
    const remainingKcal = targetCalories - (calculatedProtein * 4) - (calculatedFat * 9);
    const calculatedCarbs = Math.max(50, Math.round(remainingKcal / 4));

    setCalorieGoal(targetCalories);
    setProteinGoal(calculatedProtein);
    setCarbsGoal(calculatedCarbs);
    setFatGoal(calculatedFat);

    toast.success(`¡Objetivos calculados! Multiplicador estimado: ${calculatedMultiplier.toFixed(3)}`);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const neatBases: Record<string, number> = {
      sedentary: 1.15,
      light: 1.25,
      active: 1.35,
      very_active: 1.50,
    };
    const baseMultiplier = neatBases[neatType] || 1.15;

    const intensityFactors: Record<string, number> = {
      light: 0.025,
      moderate: 0.05,
      intense: 0.075,
    };
    const intensityFactor = intensityFactors[workoutIntensity] || 0.05;
    const computedMultiplier = baseMultiplier + (workoutFrequency * intensityFactor);

    // Compute standard level matching the computed multiplier
    let computedLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' = 'sedentary';
    if (computedMultiplier >= 1.7) computedLevel = 'very_active';
    else if (computedMultiplier >= 1.5) computedLevel = 'moderately_active';
    else if (computedMultiplier >= 1.3) computedLevel = 'lightly_active';

    try {
      await updateUserProfile({
        age,
        height,
        weight,
        activityLevel: computedLevel,
        goal: goal as any,
        calorieGoal,
        proteinGoal,
        carbsGoal,
        fatGoal,
        neatType,
        workoutFrequency,
        workoutIntensity,
        activityMultiplier: parseFloat(computedMultiplier.toFixed(3)),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
    } catch (err) {
      toast.error('No se pudo cerrar la sesión.');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-5 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="mt-2">
        <h2 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          Configuraciones
        </h2>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
          Mi Perfil y Objetivos ⚙️
        </h1>
      </div>

      {/* User Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-14 h-14 rounded-full ring-2 ring-primary-500/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center font-bold text-lg text-primary-600 dark:text-primary-400">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
            {user?.displayName || 'Usuario'}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {user?.email || 'email@gmail.com'}
          </span>
        </div>
      </div>

      {/* Theme Toggles Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Tema de la aplicación
        </h3>
        
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
          {(['light', 'dark', 'system'] as const).map((t) => {
            const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Laptop;
            const labels = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' };
            const isSelected = theme === t;
            
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`py-2 px-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold transition-all tap-effect ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-primary-500 dark:text-primary-400 shadow-sm border border-slate-100/50 dark:border-slate-800/40'
                    : 'text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{labels[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile & Goals Form */}
      <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
        
        {/* Personal parameters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/60 pb-3">
            <User className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Parámetros Personales
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Edad (años)
              </label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(Math.max(1, parseInt(e.target.value, 10)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Altura (cm)
              </label>
              <input
                type="number"
                required
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value, 10)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Peso Actual (kg)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(Math.max(1, parseFloat(e.target.value)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Sexo Biológico
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              >
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Actividad Diaria (Ocupación / NEAT)
              </label>
              <select
                value={neatType}
                onChange={(e) => setNeatType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              >
                <option value="sedentary">Sedentario (Oficina, sentado la mayor parte del día)</option>
                <option value="light">Ligero (Maestro, cajero, de pie parte del día)</option>
                <option value="active">Activo (Mesero, cartero, movimiento constante)</option>
                <option value="very_active">Muy Activo (Construcción, esfuerzo físico pesado)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Días de Entrenamiento</span>
                <span className="text-primary-500 font-extrabold text-[11px]">{workoutFrequency} {workoutFrequency === 1 ? 'día' : 'días'} / semana</span>
              </div>
              <input
                type="range"
                min="0"
                max="7"
                value={workoutFrequency}
                onChange={(e) => setWorkoutFrequency(parseInt(e.target.value, 10))}
                className="w-full accent-primary-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Intensidad del Ejercicio
              </label>
              <select
                value={workoutIntensity}
                onChange={(e) => setWorkoutIntensity(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              >
                <option value="light">Suave (Caminar, Yoga, Estiramientos)</option>
                <option value="moderate">Moderado (Fuerza tradicional, Musculación, Ciclismo)</option>
                <option value="intense">Intenso (CrossFit, HIIT, Running intenso, Deportes rápidos)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Objetivo Personal
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
              >
                <option value="lose_fat">Perder grasa</option>
                <option value="maintain">Mantener peso</option>
                <option value="gain_muscle">Ganar músculo</option>
              </select>
            </div>
          </div>

          {/* Auto calculate values trigger */}
          <button
            type="button"
            onClick={handleAutoCalculate}
            className="w-full mt-2 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-indigo-100 dark:border-slate-850 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 tap-effect"
          >
            <Calculator className="w-4 h-4" />
            <span>Calcular Objetivos Automáticamente</span>
          </button>
        </div>

        {/* Nutritional goals config */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/60 pb-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Objetivos Nutricionales
            </h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Objetivo de Consumo Diario (kcal)
              </label>
              <input
                type="number"
                required
                value={calorieGoal}
                onChange={(e) => setCalorieGoal(Math.max(1, parseInt(e.target.value, 10)))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white font-semibold"
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col gap-1 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200">💡 ¿Qué significa esto?</span>
                <span>Es la cantidad de calorías que debes <strong>comer</strong> diariamente para lograr tu meta.</span>
                <span className="mt-1 font-semibold border-t border-slate-100 dark:border-slate-850/60 pt-1.5">
                  • Tu gasto diario estimado (mantenimiento): <strong className="text-slate-800 dark:text-white">{tdee} kcal</strong>
                </span>
                <span>
                  {goal === 'lose_fat' ? (
                    <span>• Para <strong>perder grasa</strong> (Déficit): debes consumir <strong className="text-emerald-600 dark:text-emerald-400">{tdee - 500} kcal</strong> (-500 kcal)</span>
                  ) : goal === 'gain_muscle' ? (
                    <span>• Para <strong>ganar músculo</strong> (Superávit): debes consumir <strong className="text-primary-500 dark:text-primary-400">{tdee + 300} kcal</strong> (+300 kcal)</span>
                  ) : (
                    <span>• Para <strong>mantener peso</strong> (Mantenimiento): debes consumir <strong className="text-slate-800 dark:text-white">{tdee} kcal</strong></span>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase text-center">
                  Proteína (g)
                </label>
                <input
                  type="number"
                  required
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(Math.max(1, parseInt(e.target.value, 10)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-center font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase text-center">
                  Carbos (g)
                </label>
                <input
                  type="number"
                  required
                  value={carbsGoal}
                  onChange={(e) => setCarbsGoal(Math.max(1, parseInt(e.target.value, 10)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-center font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase text-center">
                  Grasa (g)
                </label>
                <input
                  type="number"
                  required
                  value={fatGoal}
                  onChange={(e) => setFatGoal(Math.max(1, parseInt(e.target.value, 10)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-center font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit adjustments */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 tap-effect"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>

      </form>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 border border-rose-100 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-rose-500 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all tap-effect"
      >
        <LogOut className="w-4 h-4" />
        <span>Cerrar Sesión</span>
      </button>

    </div>
  );
}
