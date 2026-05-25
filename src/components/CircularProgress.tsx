// Circular Progress Ring Component

interface CircularProgressProps {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({
  current,
  goal,
  size = 190,
  strokeWidth = 12
}: CircularProgressProps) {
  const safeGoal = goal > 0 ? goal : 2000;
  const percentage = Math.min(100, Math.max(0, (current / safeGoal) * 100));
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const remaining = safeGoal - current;
  const isOver = remaining < 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* SVG Progress Circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Track Circle */}
        <circle
          className="text-slate-100 dark:text-slate-800"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        
        {/* Progress Circle with active transition */}
        <circle
          className="transition-all duration-1000 ease-out"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: percentage > 0 ? 'url(#glow)' : 'none',
          }}
        />
      </svg>

      {/* Central Content */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {isOver ? 'Exceso' : 'Restan'}
        </span>
        <span className={`text-3xl font-extrabold tracking-tight ${isOver ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
          kcal
        </span>
        <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-primary-600 dark:text-primary-400">
          {Math.round(percentage)}% del objetivo
        </div>
      </div>
    </div>
  );
}
