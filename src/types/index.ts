// Global Type Definitions for CaloTracker

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  calorieGoal: number;
  proteinGoal: number; // grams
  carbsGoal: number; // grams
  fatGoal: number; // grams
  age: number;
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  goal: 'lose_fat' | 'maintain' | 'gain_muscle';
  createdAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: MealType;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
}

export interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number; // kg
  timestamp: string;
}
