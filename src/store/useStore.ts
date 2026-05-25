// Zustand State Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile, FoodEntry, CustomFood, WeightEntry } from '@/types';
import { firestoreRest, generateId } from '@/services/firestoreRest';
import toast from 'react-hot-toast';

interface AppState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  syncing: boolean;
  foodLog: FoodEntry[];
  customFoods: CustomFood[];
  weightLog: WeightEntry[];
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  fetchUserData: (uid: string, email: string, displayName: string, photoURL: string, token: string) => Promise<void>;
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
  deleteFoodEntry: (id: string) => Promise<void>;
  addCustomFood: (food: Omit<CustomFood, 'id' | 'createdAt'>) => Promise<void>;
  deleteCustomFood: (id: string) => Promise<void>;
  saveWeightEntry: (weight: number, date: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

// Function to apply class to root HTML tag for Tailwind dark mode
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      syncing: false,
      foodLog: [],
      customFoods: [],
      weightLog: [],
      theme: 'system',

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      setToken: (token) => set({ token }),

      setLoading: (loading) => set({ loading }),

      // Sync and retrieve database profile/logs on login
      fetchUserData: async (uid, email, displayName, photoURL, token) => {
        set({ syncing: true, token });
        
        // Timeout handler for the Firestore REST sync - 8 seconds
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 8000)
        );

        try {
          // Wrap API operations with timeout
          const syncOperation = async () => {
            // 1. Get or Create user profile
            let profile = await firestoreRest.getUserProfile(uid, token);
            
            if (!profile) {
              // Create default profile if user has never logged in before
              const newProfile: UserProfile = {
                uid,
                email,
                displayName: displayName || 'Usuario',
                photoURL: photoURL || '',
                calorieGoal: 2000,
                proteinGoal: 150,
                carbsGoal: 200,
                fatGoal: 65,
                age: 30,
                height: 175,
                weight: 70,
                activityLevel: 'sedentary',
                goal: 'maintain',
                createdAt: new Date().toISOString(),
              };
              
              profile = await firestoreRest.saveUserProfile(uid, newProfile, token);
              toast.success('¡Perfil inicializado con éxito!');
            } else {
              // If the profile already exists, verify we don't wipe out details
              // Merge details from firebase auth if profile details are missing
              if (!profile.displayName && displayName) profile.displayName = displayName;
              if (!profile.photoURL && photoURL) profile.photoURL = photoURL;
            }

            // Enforce that the profile contains the correct UID
            if (profile) {
              profile.uid = uid;
            }

            // Set user profile in state BEFORE fetching subcollections to avoid blank screens
            set({ user: profile });

            // 2. Fetch subcollections in parallel
            const [foodEntries, customFoods, weightEntries] = await Promise.all([
              firestoreRest.getFoodEntries(uid, token),
              firestoreRest.getCustomFoods(uid, token),
              firestoreRest.getWeightLog(uid, token),
            ]);

            set({
              foodLog: foodEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
              customFoods: customFoods.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
              weightLog: weightEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
              syncing: false
            });
            
            toast.success('¡Datos sincronizados!');
          };

          // Race the sync operation against the 8s timeout
          await Promise.race([syncOperation(), timeoutPromise]);

        } catch (error: any) {
          set({ syncing: false });
          if (error.message === 'TIMEOUT') {
            console.warn('Sync timed out. Using local persistent storage values.');
            toast.error('La sincronización de la base de datos está demorando. Cargando copia local.');
          } else {
            console.error('Failed to sync user data with Firestore:', error);
            toast.error('Error al sincronizar datos. Trabajando en modo local.');
          }
        }
      },

      // Add Food Entry
      addFoodEntry: async (entry) => {
        const { user, token, foodLog } = get();
        if (!user || !token) {
          toast.error('Debes iniciar sesión para guardar comidas.');
          return;
        }

        const id = generateId();
        const timestamp = new Date().toISOString();
        const newEntry: FoodEntry = { ...entry, id, timestamp };

        // 1. Optimistic Update in State
        const updatedLog = [newEntry, ...foodLog];
        set({ foodLog: updatedLog });

        try {
          // 2. Fire and forget Firestore REST save
          await firestoreRest.saveFoodEntry(user.uid, newEntry, token);
          toast.success('Comida agregada con éxito');
        } catch (error) {
          console.error('Error writing food entry to Firestore REST:', error);
          toast.error('Comida guardada localmente. Error al sincronizar en la nube.');
          // We keep the local entry rather than rolling back to avoid annoying the user.
          // It will get synced on the next login / state load if it's stored in local Zustand.
        }
      },

      // Delete Food Entry
      deleteFoodEntry: async (id) => {
        const { user, token, foodLog } = get();
        if (!user) return;

        // 1. Optimistic Update
        const updatedLog = foodLog.filter((item) => item.id !== id);
        set({ foodLog: updatedLog });

        if (!token) return;

        try {
          // 2. Delete from Firestore REST
          await firestoreRest.deleteFoodEntry(user.uid, id, token);
          toast.success('Comida eliminada');
        } catch (error) {
          console.error('Error deleting food entry in Firestore REST:', error);
          toast.error('Comida eliminada localmente. Error al sincronizar con la nube.');
        }
      },

      // Add Custom Food
      addCustomFood: async (food) => {
        const { user, token, customFoods } = get();
        if (!user || !token) return;

        const id = generateId();
        const newFood: CustomFood = {
          ...food,
          id,
          createdAt: new Date().toISOString()
        };

        // 1. Optimistic Update
        set({ customFoods: [newFood, ...customFoods] });

        try {
          // 2. Save in Firestore REST
          await firestoreRest.saveCustomFood(user.uid, newFood, token);
          toast.success('Alimento personalizado guardado');
        } catch (error) {
          console.error('Error saving custom food in Firestore REST:', error);
          toast.error('Guardado localmente. Error al sincronizar con la nube.');
        }
      },

      // Delete Custom Food
      deleteCustomFood: async (id) => {
        const { user, token, customFoods } = get();
        if (!user) return;

        // 1. Optimistic Update
        set({ customFoods: customFoods.filter((f) => f.id !== id) });

        if (!token) return;

        try {
          await firestoreRest.deleteCustomFood(user.uid, id, token);
          toast.success('Alimento personalizado eliminado');
        } catch (error) {
          console.error('Error deleting custom food in Firestore REST:', error);
          toast.error('Eliminado localmente. Error al sincronizar.');
        }
      },

      // Save Weight Entry (one entry per day, upsert by date)
      saveWeightEntry: async (weight, date) => {
        const { user, token, weightLog } = get();
        if (!user || !token) return;

        const newEntry: WeightEntry = {
          date,
          weight,
          timestamp: new Date().toISOString()
        };

        // 1. Optimistic Update
        const filteredLog = weightLog.filter((w) => w.date !== date);
        const updatedLog = [...filteredLog, newEntry].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Also update user's current weight in their profile metrics
        const updatedProfile = { ...user, weight };

        set({
          weightLog: updatedLog,
          user: updatedProfile
        });

        try {
          // 2. Save in Firestore REST
          await Promise.all([
            firestoreRest.saveWeightEntry(user.uid, newEntry, token),
            firestoreRest.saveUserProfile(user.uid, { weight }, token)
          ]);
          toast.success('Peso registrado con éxito');
        } catch (error) {
          console.error('Error saving weight entry in Firestore REST:', error);
          toast.error('Registrado localmente. Error de red.');
        }
      },

      // Update User Profile/Goals
      updateUserProfile: async (profileUpdates) => {
        const { user, token } = get();
        if (!user) return;

        // 1. Optimistic Update
        const updatedUser = { ...user, ...profileUpdates };
        set({ user: updatedUser });

        if (!token) return;

        try {
          // 2. Save to Firestore REST
          await firestoreRest.saveUserProfile(user.uid, profileUpdates, token);
          toast.success('Objetivos actualizados');
        } catch (error) {
          console.error('Error saving profile updates in Firestore REST:', error);
          toast.error('Guardado localmente. Error de sincronización.');
        }
      },

      // Clear state on sign out
      logout: () => {
        set({
          user: null,
          token: null,
          foodLog: [],
          customFoods: [],
          weightLog: []
        });
        toast.success('Sesión cerrada correctamente');
      }
    }),
    {
      name: 'calotracker-storage',
      storage: createJSONStorage(() => localStorage),
      // Don't persist temporary variables
      partialize: (state) => ({
        user: state.user,
        foodLog: state.foodLog,
        customFoods: state.customFoods,
        weightLog: state.weightLog,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme after loading state from local storage
        if (state) {
          applyTheme(state.theme);
        }
      }
    }
  )
);
