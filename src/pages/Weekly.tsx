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

  const last7Days = getLast7Days();

  // Map logs to chart items
  const daysData = last7Days.map((dateStr) => {
    const dayEntries = foodLog.filter((entry) => entry.date === dateStr);
    const calories = dayEntries.reduce((sum, item) => sum + item.calories, 0);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const label = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    
    // Evaluate if "on goal" based on target plan
    let status: 'on_track' | 'off_track' = 'off_track';
    if (userGoal === 'lose_fat') {
      status = calories <= calorieGoal ? 'on_track' : 'off_track';
    } else if (userGoal === 'gain_muscle') {
      status = calories >= calorieGoal ? 'on_track' : 'off_track';
    } else {
      // maintain: within 150 kcal margin
      status = Math.abs(calories - calorieGoal) <= 150 ? 'on_track' : 'off_track';
    }

    return {
      date: dateStr,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      calories,
      status,
    };
  });

  // Calculate statistics
  const totalCalories = daysData.reduce((sum, day) => sum + day.calories, 0);
  const averageCalories = Math.round(totalCalories / 7);
  const daysOnGoal = daysData.filter((d) => d.status === 'on_track').length;
  
  // Weekly net balance based on actual maintenance TDEE
  const tdee = calculateUserTdee(user);
  const weeklyTdee = tdee * 7;
  const realWeeklyBalance = totalCalories - weeklyTdee;
  
  // Calculate fat change (7700 kcal = 1kg fat)
  const fatChangeGrams = Math.round(-realWeeklyBalance / 7.7);
  
  // Determine if it's favorable based on the user's goal (relative to maintenance TDEE)
  const isFavorable = 
    (userGoal === 'lose_fat' && realWeeklyBalance <= 0) || 
    (userGoal === 'gain_muscle' && realWeeklyBalance >= 0) ||
    (userGoal === 'maintain' && Math.abs(realWeeklyBalance) <= 1000);

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
      <div className={`p-5 rounded-3xl border flex flex-col gap-4.5 ${
        isFavorable 
          ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300'
          : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/60 dark:border-rose-900/30 text-rose-900 dark:text-rose-300'
      }`}>
        <div className="flex gap-3.5 items-start">
          <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isFavorable ? 'text-emerald-500' : 'text-rose-500'}`} />
          <div className="flex flex-col gap-1 w-full">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Balance Calórico Real Semanal
            </h3>
            
            <div className="flex justify-between items-baseline mt-1 border-b border-slate-100 dark:border-slate-800/50 pb-2">
              <span className="text-xl font-extrabold">
                {realWeeklyBalance < 0 ? (
                  <span>-{Math.abs(realWeeklyBalance)} kcal</span>
                ) : (
                  <span>+{realWeeklyBalance} kcal</span>
                )}
              </span>
              <span className="text-xs font-bold">
                {fatChangeGrams >= 0 ? (
                  <span>~{fatChangeGrams}g grasa perdida</span>
                ) : (
                  <span>~{Math.abs(fatChangeGrams)}g grasa ganada</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mt-2.5 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Gasto Estimado (TDEE x 7)</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{weeklyTdee} kcal</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Consumo Real (Comida)</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{totalCalories} kcal</span>
              </div>
              <div className="flex flex-col col-span-2 border-t border-slate-100 dark:border-slate-800/40 pt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-450">
                {userGoal === 'lose_fat' ? (
                  <span>• Objetivo semanal planificado: déficit de <strong className="text-emerald-600 dark:text-emerald-400">{Math.max(0, (tdee - calorieGoal) * 7)} kcal</strong> (~{Math.round(Math.max(0, (tdee - calorieGoal) * 7) / 7.7)}g). Tu comportamiento real te sitúa en un déficit de <strong className="text-emerald-600 dark:text-emerald-400">{realWeeklyBalance < 0 ? Math.abs(realWeeklyBalance) : 0} kcal</strong>.</span>
                ) : userGoal === 'gain_muscle' ? (
                  <span>• Objetivo semanal planificado: superávit de <strong className="text-primary-500">{Math.max(0, (calorieGoal - tdee) * 7)} kcal</strong>. Tu comportamiento real te sitúa en un {realWeeklyBalance >= 0 ? 'superávit' : 'déficit'} de <strong>{Math.abs(realWeeklyBalance)} kcal</strong>.</span>
                ) : (
                  <span>• Objetivo semanal planificado: mantenimiento (+/- 700 kcal). Tu comportamiento real es de <strong>{realWeeklyBalance < 0 ? `-${Math.abs(realWeeklyBalance)}` : `+${realWeeklyBalance}`} kcal</strong>.</span>
                )}
              </div>
            </div>
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
