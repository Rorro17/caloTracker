import { useState } from 'react';
import { loginWithGoogle } from '@/services/firebase';
import { useStore } from '@/store/useStore';
import { LogIn, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const fetchUserData = useStore((state) => state.fetchUserData);

  const handleLogin = async () => {
    setLoading(true);
    const toastId = toast.loading('Iniciando sesión con Google...');

    // 8-second safety fallback to prevent UI spinner hangs
    const loginTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        toast.dismiss(toastId);
        toast.error('La conexión está tardando demasiado. Reinténtalo.');
      }
    }, 8500);

    try {
      const user = await loginWithGoogle();
      const token = await user.getIdToken();
      
      // Fetch details from Firestore and populate Zustand store
      await fetchUserData(
        user.uid,
        user.email || '',
        user.displayName || '',
        user.photoURL || '',
        token
      );
      
      toast.success(`¡Bienvenido, ${user.displayName || 'Usuario'}!`, { id: toastId });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.dismiss(toastId);
      
      // Handle closed popup vs net errors
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Inicio de sesión cancelado por el usuario.');
      } else {
        toast.error('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      clearTimeout(loginTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* App Branding */}
      <div className="w-full flex flex-col items-center text-center max-w-sm mb-12 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-6 hover-scale">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-indigo-500 dark:from-primary-400 dark:to-indigo-300 bg-clip-text text-transparent">
          CaloTracker
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 max-w-[280px]">
          Tu compañero inteligente de nutrición y macros impulsado por IA.
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-100/50 dark:shadow-none animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">
          Comienza tu Cambio
        </h2>
        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mb-8">
          Registra tu peso, cuenta calorías de fotos o texto y analiza tu progreso semanal.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white transition-all duration-200 shadow-lg tap-effect ${
            loading
              ? 'bg-primary-400 cursor-not-allowed shadow-none'
              : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20 active:scale-95'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Entrar con Google</span>
            </>
          )}
        </button>

        <div className="mt-6 flex justify-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Acceso instantáneo con tu cuenta de Google.
        </div>
      </div>
    </div>
  );
}
