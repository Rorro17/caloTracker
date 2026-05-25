import { useStore } from '@/store/useStore';
import CircularProgress from '@/components/CircularProgress';
import { Trash2, Plus, RefreshCw, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack/Otros',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  lunch: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  dinner: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  snack: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
};

// Timezone-safe local YYYY-MM-DD generator
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { user, foodLog, deleteFoodEntry, syncing, fetchUserData, token } = useStore();

  const todayString = getTodayString();
  const todayEntries = foodLog.filter((entry) => entry.date === todayString);

  // Calculate totals
  const totals = todayEntries.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calorieGoal = user?.calorieGoal || 2000;
  const proteinGoal = user?.proteinGoal || 150;
  const carbsGoal = user?.carbsGoal || 200;
  const fatGoal = user?.fatGoal || 65;

  const handleSync = async () => {
    if (user && token) {
      await fetchUserData(user.uid, user.email, user.displayName, user.photoURL, token);
    }
  };

  // Helper macro progress bar renderer
  const renderMacroBar = (
    label: string,
    current: number,
    goal: number,
    colorClass: string,
    unit: string = 'g'
  ) => {
    const percentage = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-slate-700 dark:text-slate-200">
            {Math.round(current)} / {goal} {unit}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-5 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Profile Info */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-10 h-10 rounded-full ring-2 ring-primary-500/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <h2 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
              Resumen Diario
            </h2>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
              Hola, {user?.displayName ? user.displayName.split(' ')[0] : 'Usuario'} 👋
            </h1>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 tap-effect"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-primary-500' : ''}`} />
        </button>
      </div>

      {/* Ring Progress Display */}
      <div className="w-full flex justify-center py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
        <CircularProgress current={totals.calories} goal={calorieGoal} />
      </div>

      {/* Grid Specs summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Consumido
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mt-1">
            {totals.calories} <span className="text-[10px] font-normal">kcal</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Objetivo
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mt-1">
            {calorieGoal} <span className="text-[10px] font-normal">kcal</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Alimentos
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mt-1">
            {todayEntries.length} <span className="text-[10px] font-normal">items</span>
          </span>
        </div>
      </div>

      {/* Macros Progress Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          Distribución de Macros
        </h3>
        <div className="flex flex-col gap-4">
          {renderMacroBar('Proteínas', totals.protein, proteinGoal, 'bg-indigo-500 dark:bg-indigo-400')}
          {renderMacroBar('Carbohidratos', totals.carbs, carbsGoal, 'bg-amber-500 dark:bg-amber-400')}
          {renderMacroBar('Grasas', totals.fat, fatGoal, 'bg-rose-500 dark:bg-rose-400')}
        </div>
      </div>

      {/* Today Food Entries List */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Comidas de Hoy
            </h3>
          </div>
          <Link
            to="/add"
            className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 tap-effect"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Link>
        </div>

        {todayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
            <span className="text-2xl mb-1.5">🍽️</span>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No hay comidas registradas hoy
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] mt-1">
              Haz clic en Agregar para ingresar comida manualmente o con IA.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {todayEntries.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover-scale group"
              >
                <div className="flex flex-col gap-1 max-w-[70%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${MEAL_COLORS[item.meal]}`}>
                      {MEAL_NAMES[item.meal] || item.meal}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex gap-2">
                    <span>{item.calories} kcal</span>
                    <span>•</span>
                    <span>P: {Math.round(item.protein)}g</span>
                    <span>•</span>
                    <span>C: {Math.round(item.carbs)}g</span>
                    <span>•</span>
                    <span>G: {Math.round(item.fat)}g</span>
                  </span>
                </div>
                <button
                  onClick={() => deleteFoodEntry(item.id)}
                  className="p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all tap-effect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
