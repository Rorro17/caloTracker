// App Main Container and Router Assembly
import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { auth, onAuthStateChanged } from '@/services/firebase';
import { useStore } from '@/store/useStore';

// Components & Layout
import BottomNav from '@/components/BottomNav';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AddFood from '@/pages/AddFood';
import Weekly from '@/pages/Weekly';
import Progress from '@/pages/Progress';
import Settings from '@/pages/Settings';

export default function App() {
  const { user, fetchUserData, logout, setToken } = useStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setToken(token);
          
          // Async sync in the background
          await fetchUserData(
            firebaseUser.uid,
            firebaseUser.email || '',
            firebaseUser.displayName || '',
            firebaseUser.photoURL || '',
            token
          );
        } catch (error) {
          console.error('Error synchronizing auth state:', error);
        }
      } else {
        logout();
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [fetchUserData, logout, setToken]);

  // Initial spinner state when loading credentials
  if (checkingAuth) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4" />
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
          CaloTracker
        </span>
      </div>
    );
  }

  // Not authenticated? Show login screen
  if (!user) {
    return (
      <>
        <Login />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1e293b',
              color: '#fff',
              fontSize: '13px',
              borderRadius: '16px',
              fontWeight: 500,
            },
          }}
        />
      </>
    );
  }

  return (
    <HashRouter>
      <div className="w-full min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center items-start">
        {/* Centered Mobile viewport frame */}
        <div className="w-full max-w-mobile min-h-screen bg-slate-50 dark:bg-slate-900/60 shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col relative border-x border-slate-100/50 dark:border-slate-800/40">
          
          {/* Main Routing Area */}
          <main className="flex-1 flex flex-col overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/add" element={<AddFood />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Bottom Tabs navigation bar */}
          <BottomNav />
          
        </div>
      </div>

      {/* Global Notifications Handler */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#fff',
            fontSize: '13px',
            borderRadius: '16px',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </HashRouter>
  );
}
