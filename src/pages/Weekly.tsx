// Weekly Progress Page Component
import { useStore, calculateUserTdee } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Award, Flame, TrendingDown, Info } from 'lucide-react';

// Generate last 7 days date strings in local timezone YYYY-MM-DD
const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
};

export default function Weekly() {
  const { foodLog, user } = useStore();

  const calorieGoal = user?.calorieGoal || 2000;
  const userGoal = user?.goal || 'maintain';
  const tdee = calculateUserTdee(user);

  const last7Days = getLast7Days();

  let loggedDaysCount = 0;
  let accumulatedDeficitOrSurplus = 0; // positive = deficit achieved for fat loss, surplus for muscle gain

  // Map logs to chart items
  const daysData = last7Days.map((dateStr) => {
    const dayEntries = foodLog.filter((entry) => entry.date === dateStr);
    const hasLogs = dayEntries.length > 0;
    const calories = dayEntries.reduce((sum, item) => sum + item.calories, 0);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const label = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    
    // Evaluate if "on goal" based on target plan
    let status: 'on_track' | 'off_track' = 'off_track';
    if (hasLogs) {
      loggedDaysCount++;
      if (userGoal === 'lose_fat') {
        status = calories <= calorieGoal ? 'on_track' : 'off_track';
        accumulatedDeficitOrSurplus += (tdee - calories);
      } else if (userGoal === 'gain_muscle') {
        status = calories >= calorieGoal ? 'on_track' : 'off_track';
        accumulatedDeficitOrSurplus += (calories - tdee);
      } else {
        // maintain: within 150 kcal margin
        status = Math.abs(calories - calorieGoal) <= 150 ? 'on_track' : 'off_track';
        accumulatedDeficitOrSurplus += (calories - tdee);
      }
    }

    return {
      date: dateStr,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      calories,
      status: hasLogs ? status : 'on_track', // Unlogged days default to on_track visually
      hasLogs,
    };
  });

  // Calculate statistics
  const totalCalories = daysData.reduce((sum, day) => sum + day.calories, 0);
  const averageCalories = loggedDaysCount > 0 ? Math.round(totalCalories / loggedDaysCount) : 0;
  const daysOnGoal = daysData.filter((d) => d.hasLogs && d.status === 'on_track').length;
  
  // Weekly net balance based on actual maintenance TDEE (only on logged days)
  let realWeeklyBalance = 0;
  if (loggedDaysCount > 0) {
    if (userGoal === 'lose_fat') {
      realWeeklyBalance = -accumulatedDeficitOrSurplus;
    } else {
      realWeeklyBalance = accumulatedDeficitOrSurplus;
    }
  }
  
  // Calculate fat change (7700 kcal = 1kg fat)
  const fatChangeGrams = Math.round(-realWeeklyBalance / 7.7);

  // Expected planned weekly targets
  let targetWeeklyGoalVal = 0;
  let progressPercentage = 0;

  if (userGoal === 'lose_fat') {
    targetWeeklyGoalVal = Math.max(0, (tdee - calorieGoal) * 7);
    progressPercentage = targetWeeklyGoalVal > 0 ? Math.round((accumulatedDeficitOrSurplus / targetWeeklyGoalVal) * 100) : 0;
  } else if (userGoal === 'gain_muscle') {
    targetWeeklyGoalVal = Math.max(0, (calorieGoal - tdee) * 7);
    progressPercentage = targetWeeklyGoalVal > 0 ? Math.round((accumulatedDeficitOrSurplus / targetWeeklyGoalVal) * 100) : 0;
  } else {
    targetWeeklyGoalVal = 0;
    progressPercentage = 0;
  }

  const displayPercent = Math.max(0, progressPercentage);

  return (
    <div className="flex-1 flex flex-col gap-6 p-5 pb-24 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="mt-2">
        <h2 className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          Análisis Histórico
        </h2>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
          Resumen Semanal 📊
        </h1>
      </div>

      {/* Bar Chart Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          <span>Consumo de los últimos 7 días</span>
          <span className="text-primary-500 font-extrabold">{calorieGoal} kcal (Meta)</span>
        </div>
        
        <div className="w-full h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daysData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                }}
                formatter={(val: number) => [`${val} kcal`, 'Consumido']}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#818cf8' }}
              />
              <ReferenceLine
                y={calorieGoal}
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                {daysData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.calories === 0
                        ? '#cbd5e1'
                        : entry.status === 'on_track'
                        ? '#6366f1' // indigo
                        : '#f43f5e' // rose
                    }
                    className="transition-all duration-500"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-orange-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Promedio
          </span>
          <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
            {averageCalories} kcal
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <Award className="w-4 h-4 text-yellow-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            En Meta
          </span>
          <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
            {daysOnGoal} / 7 días
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
          <TrendingDown className="w-4 h-4 text-indigo-500 mb-1" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Objetivo
          </span>
          <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
            {calorieGoal} kcal
          </span>
        </div>
      </div>

      {/* Weekly Deficit/Surplus Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <div className="flex gap-3.5 items-start">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 w-full text-slate-800 dark:text-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Objetivo Semanal (Déficit / Superávit)
            </h3>
            
            {userGoal === 'lose_fat' && (
              <div className="flex flex-col gap-3 mt-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Meta: <span className="text-emerald-500 font-extrabold">-{targetWeeklyGoalVal} kcal</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Logrado: <span className="font-extrabold text-slate-800 dark:text-white">-{accumulatedDeficitOrSurplus} kcal</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, displayPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500 font-bold mt-0.5">
                    <span>{loggedDaysCount} de 7 días registrados</span>
                    <span>{progressPercentage}% de la meta de déficit</span>
                  </div>
                </div>

                <div className="border-t border-slate-50 dark:border-slate-800/40 pt-2 text-[11px] leading-relaxed text-slate-550 dark:text-slate-400">
                  <span>Has quemado un estimado neto de <strong className="text-emerald-600 dark:text-emerald-400">~{fatChangeGrams}g de grasa</strong> esta semana. Tu meta de pérdida de grasa te exige un promedio diario de <strong className="text-slate-700 dark:text-slate-300">{tdee - calorieGoal} kcal</strong> de déficit.</span>
                </div>
              </div>
            )}

            {userGoal === 'gain_muscle' && (
              <div className="flex flex-col gap-3 mt-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Meta: <span className="text-primary-500 font-extrabold">+{targetWeeklyGoalVal} kcal</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Logrado: <span className="font-extrabold text-slate-800 dark:text-white">+{accumulatedDeficitOrSurplus} kcal</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, displayPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500 font-bold mt-0.5">
                    <span>{loggedDaysCount} de 7 días registrados</span>
                    <span>{progressPercentage}% de la meta de superávit</span>
                  </div>
                </div>

                <div className="border-t border-slate-50 dark:border-slate-800/40 pt-2 text-[11px] leading-relaxed text-slate-550 dark:text-slate-400">
                  <span>Has acumulado un superávit neto equivalente a <strong className="text-primary-500">~{Math.max(0, Math.round(accumulatedDeficitOrSurplus / 7.7))}g de grasa/músculo</strong>. tu meta te exige un promedio diario de <strong className="text-slate-700 dark:text-slate-350">{calorieGoal - tdee} kcal</strong> de superávit.</span>
                </div>
              </div>
            )}

            {userGoal === 'maintain' && (
              <div className="flex flex-col gap-2 mt-1.5">
                <p className="text-xs font-bold text-slate-750 dark:text-slate-200">
                  Balance Real Acumulado: <span className={Math.abs(accumulatedDeficitOrSurplus) <= 700 ? 'text-emerald-500 font-extrabold' : 'text-rose-500 font-extrabold'}>
                    {accumulatedDeficitOrSurplus <= 0 ? `${accumulatedDeficitOrSurplus} kcal` : `+${accumulatedDeficitOrSurplus} kcal`}
                  </span>
                </p>
                <div className="text-[11px] leading-relaxed text-slate-550 dark:text-slate-400">
                  <span>Tu meta es mantener el peso (balance neutro). Llevas <strong>{loggedDaysCount} de 7 días</strong> registrados. Mantén tu balance acumulado entre -700 y +700 kcal para un control óptimo de tu peso.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Breakdown Progress Table */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          Desglose Diario
        </h3>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {daysData.map((day) => {
            const ratio = calorieGoal > 0 ? day.calories / calorieGoal : 0;
            const percentage = Math.min(100, ratio * 100);
            return (
              <div
                key={day.date}
                className={`flex flex-col gap-2 p-4 border-b border-slate-50 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-all`}
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">{day.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-200">{day.calories} kcal</span>
                    <span className={`w-2 h-2 rounded-full ${day.calories === 0 ? 'bg-slate-300' : day.status === 'on_track' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>
                </div>
                
                {/* Micro progress bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      day.calories === 0 
                        ? 'bg-slate-300' 
                        : day.status === 'on_track' 
                        ? 'bg-indigo-500 dark:bg-indigo-400' 
                        : 'bg-rose-500 dark:bg-rose-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
