// Progress Page Component
import { useState } from 'react';
import { useStore, calculateUserTdee } from '@/store/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Scale, TrendingDown, Target, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WeightEntry } from '@/types';

// Helper to get local date string YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate linear regression trend line
const calculateTrend = (data: WeightEntry[]) => {
  if (data.length < 2) {
    return {
      points: data.map(item => ({ ...item, trend: item.weight })),
      slopePerWeek: 0
    };
  }

  // Sort weight entries by date ascending
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstTime = new Date(sorted[0].date).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  // x is days from start date, y is weight
  const parsed = sorted.map((item) => {
    const x = (new Date(item.date).getTime() - firstTime) / oneDay;
    const y = item.weight;
    return { x, y, original: item };
  });

  const n = parsed.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const p of parsed) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  
  // If all entries are on the same day, slope is 0
  if (denominator === 0) {
    return {
      points: sorted.map(item => ({ ...item, trend: item.weight })),
      slopePerWeek: 0
    };
  }

  const m = (n * sumXY - sumX * sumY) / denominator; // kg per day change
  const b = (sumY - m * sumX) / n;

  const points = sorted.map((item, idx) => {
    const x = parsed[idx].x;
    const trendWeight = m * x + b;
    return {
      ...item,
      // Human-readable date for chart label: e.g. "24 May"
      label: new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      trend: parseFloat(trendWeight.toFixed(2))
    };
  });

  return {
    points,
    slopePerWeek: parseFloat((m * 7).toFixed(2)) // kg per week
  };
};

export default function Progress() {
  const { foodLog, weightLog, user, saveWeightEntry } = useStore();

  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(getTodayString());
  const [submitting, setSubmitting] = useState(false);

  // Parse weekly food deficit
  const currentWeight = user?.weight || 70;
  const userGoal = user?.goal || 'maintain';

  // Sum calories of the last 7 days
  const d = new Date();
  const last7DaysStrings = Array.from({ length: 7 }, (_, i) => {
    const temp = new Date();
    temp.setDate(d.getDate() - i);
    return `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`;
  });

  // Calculate dynamic deficit/surplus only on days that actually have logs
  const tdee = calculateUserTdee(user);
  let loggedDaysCount = 0;
  let accumulatedDeficitOrSurplus = 0; // positive = deficit achieved (for fat loss) or surplus achieved (for muscle gain)

  for (const dateStr of last7DaysStrings) {
    const dayEntries = foodLog.filter((entry) => entry.date === dateStr);
    const hasLogs = dayEntries.length > 0;
    if (hasLogs) {
      loggedDaysCount++;
      const calories = dayEntries.reduce((sum, item) => sum + item.calories, 0);
      if (userGoal === 'lose_fat') {
        accumulatedDeficitOrSurplus += (tdee - calories);
      } else if (userGoal === 'gain_muscle') {
        accumulatedDeficitOrSurplus += (calories - tdee);
      } else {
        accumulatedDeficitOrSurplus += (calories - tdee);
      }
    }
  }

  // Real weekly balance (negative = deficit relative to maintenance, positive = surplus)
  let weeklyBalance = 0;
  if (loggedDaysCount > 0) {
    if (userGoal === 'lose_fat') {
      weeklyBalance = -accumulatedDeficitOrSurplus;
    } else {
      weeklyBalance = accumulatedDeficitOrSurplus;
    }
  }

  // 7700 kcal deficit = 1kg of fat lost/gained
  const fatChangeGrams = Math.round(-weeklyBalance / 7.7);

  // Projections: estimate monthly projection assuming the logged days behaviour continues
  const averageDailyDeficit = loggedDaysCount > 0 ? (accumulatedDeficitOrSurplus / loggedDaysCount) : 0;
  
  // Projected fat change in 30 days (kg)
  let monthlyFatChangeKg = 0;
  if (userGoal === 'lose_fat') {
    monthlyFatChangeKg = parseFloat(((averageDailyDeficit * 30) / 7700).toFixed(2));
  } else if (userGoal === 'gain_muscle') {
    monthlyFatChangeKg = -parseFloat(((averageDailyDeficit * 30) / 7700).toFixed(2)); // negative means gain
  } else {
    monthlyFatChangeKg = parseFloat(((averageDailyDeficit * 30) / 7700).toFixed(2));
  }

  // Projected weight in 30 days
  const projectedWeight30Days = parseFloat((currentWeight - monthlyFatChangeKg).toFixed(1));

  // Regression trend line calculation
  const { points: chartData, slopePerWeek } = calculateTrend(weightLog);

  const handleWeightLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(weightInput);

    if (!weightInput || isNaN(weightVal) || weightVal <= 20 || weightVal > 300) {
      toast.error('Por favor ingresa un peso válido entre 20 y 300 kg.');
      return;
    }

    setSubmitting(true);
    try {
      await saveWeightEntry(weightVal, dateInput);
      setWeightInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-5 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="mt-2">
        <h2 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          Evolución Corporal
        </h2>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
          Progreso y Peso ⚖️
        </h1>
      </div>

      {/* Weight Logger Form */}
      <form onSubmit={handleWeightLogSubmit} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4.5 h-4.5 text-primary-500" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Registrar Peso Diario
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="Ej: 72.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Fecha
            </label>
            <input
              type="date"
              required
              value={dateInput}
              max={getTodayString()}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary-500/10 tap-effect"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Guardar Peso</span>
          )}
        </button>
      </form>

      {/* Weight Goal Progress Card */}
      {user?.targetWeight && (
        (() => {
          const sortedWeights = [...weightLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const initialWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : user.weight || 70;
          const currentW = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weight : user.weight || 70;
          const targetW = user.targetWeight;
          
          const totalToChange = initialWeight - targetW;
          const totalAchieved = initialWeight - currentW;
          
          let progressPercent = 0;
          if (totalToChange !== 0) {
            progressPercent = Math.min(100, Math.max(0, Math.round((totalAchieved / totalToChange) * 100)));
          } else {
            progressPercent = currentW === targetW ? 100 : 0;
          }
          
          const weightDiff = Math.abs(currentW - targetW).toFixed(1);
          const hasReachedGoal = currentW === targetW || 
            (user.goal === 'lose_fat' && currentW <= targetW) || 
            (user.goal === 'gain_muscle' && currentW >= targetW);
          
          return (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3.5">
              <div className="flex gap-3.5 items-start">
                <Target className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 w-full text-slate-800 dark:text-slate-100">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Objetivo de Peso Corporal
                  </h3>
                  
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Meta: <span className="text-indigo-500 font-extrabold">{targetW} kg</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {hasReachedGoal ? (
                        <span className="text-emerald-500 font-bold">¡Meta alcanzada! 🎉</span>
                      ) : (
                        <span>Faltan <strong className="text-slate-800 dark:text-white">{weightDiff} kg</strong></span>
                      )}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-550 font-bold mt-0.5">
                      <span>Inicio: {initialWeight} kg</span>
                      <span>{progressPercent}% completado</span>
                      <span>Actual: {currentW} kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Impact & Projection Cards */}
      <div className="grid grid-cols-1 gap-3.5">
        
        {/* Deficit Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-start gap-4">
          <TrendingDown className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Balance Calórico (7d)
            </span>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className={`text-lg font-extrabold ${weeklyBalance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {weeklyBalance <= 0 
                  ? `-${Math.abs(weeklyBalance)} kcal` 
                  : `+${weeklyBalance} kcal`}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {fatChangeGrams >= 0 
                  ? `~${fatChangeGrams}g grasa perdida` 
                  : `~${Math.abs(fatChangeGrams)}g grasa ganada`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
              Basado en el consumo alimentario real en los últimos 7 días versus tu objetivo de mantenimiento.
            </p>
          </div>
        </div>

        {/* Projection Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-start gap-4">
          <Target className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Proyección de Peso (30 días)
            </span>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-lg font-extrabold text-slate-800 dark:text-white">
                {projectedWeight30Days} kg
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {monthlyFatChangeKg >= 0 
                  ? `-${monthlyFatChangeKg} kg de grasa` 
                  : `+${Math.abs(monthlyFatChangeKg)} kg de grasa`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
              Tendencia matemática a 30 días asumiendo que sostienes la misma conducta nutricional.
            </p>
          </div>
        </div>
      </div>

      {/* Real Weight Chart and Trend Line */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          <span>Historial de Peso</span>
          {slopePerWeek !== 0 && (
            <span className={`font-extrabold ${slopePerWeek <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {slopePerWeek <= 0 ? `${slopePerWeek} kg/semana` : `+${slopePerWeek} kg/semana`}
            </span>
          )}
        </div>

        {weightLog.length < 2 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500">
            <Info className="w-6 h-6 mb-2 text-slate-300 dark:text-slate-600" />
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Registros insuficientes
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] mt-1">
              Agrega al menos 2 registros de peso en diferentes días para trazar la gráfica de tendencia lineal.
            </p>
          </div>
        ) : (
          <div className="w-full h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Line
                  name="Peso Real"
                  type="monotone"
                  dataKey="weight"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  name="Tendencia"
                  type="monotone"
                  dataKey="trend"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
