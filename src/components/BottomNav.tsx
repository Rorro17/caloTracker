// Bottom Navigation Component
import { NavLink } from 'react-router-dom';
import { Home, BarChart3, Plus, TrendingUp, User } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { to: '/', label: 'Hoy', icon: Home },
    { to: '/weekly', label: 'Semana', icon: BarChart3 },
    { to: '/add', label: 'Agregar', icon: Plus, isAction: true },
    { to: '/progress', label: 'Progreso', icon: TrendingUp },
    { to: '/settings', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 z-50 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        if (item.isAction) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center -translate-y-4 tap-effect"
            >
              {({ isActive }) => (
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-tr from-primary-600 to-indigo-500 scale-110 shadow-primary-500/35 text-white'
                      : 'bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/20 hover:shadow-primary-500/30'
                  }`}
                >
                  <Plus className="w-6 h-6" />
                </div>
              )}
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 tap-effect ${
                isActive
                  ? 'text-primary-500 dark:text-primary-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[2px]'}`} />
                  <span className="text-[10px] mt-0.5 tracking-wide">{item.label}</span>
                </>
              );
            }}
          </NavLink>
        );
      })}
    </nav>
  );
}
