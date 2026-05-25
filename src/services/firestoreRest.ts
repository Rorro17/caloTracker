import type { UserProfile, FoodEntry, CustomFood, WeightEntry } from '@/types';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'coltracker-a53ff';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ID generator fallback
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Convert JS Value to Firestore REST format
export function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    } else {
      return { doubleValue: value };
    }
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(value)
      }
    };
  }
  return { stringValue: String(value) };
}

// Convert Firestore REST format to JS Value
export function fromFirestoreValue(fsValue: any): any {
  if (!fsValue) return null;
  if ('stringValue' in fsValue) return fsValue.stringValue;
  if ('integerValue' in fsValue) return parseInt(fsValue.integerValue, 10);
  if ('doubleValue' in fsValue) return parseFloat(fsValue.doubleValue);
  if ('booleanValue' in fsValue) return fsValue.booleanValue;
  if ('nullValue' in fsValue) return null;
  if ('arrayValue' in fsValue) {
    const values = fsValue.arrayValue?.values || [];
    return values.map(fromFirestoreValue);
  }
  if ('mapValue' in fsValue) {
    const fields = fsValue.mapValue?.fields || {};
    return fromFirestoreFields(fields);
  }
  return null;
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    obj[key] = fromFirestoreValue(val);
  }
  return obj;
}

export function logMessage(msg: string) {
  console.log(msg);
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.__caloTrackerLogs) {
      win.__caloTrackerLogs = [];
    }
    win.__caloTrackerLogs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (win.__caloTrackerLogs.length > 50) {
      win.__caloTrackerLogs.pop();
    }
    win.dispatchEvent(new CustomEvent('calotracker-log-added'));
  }
}

export function getDocId(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// Helper fetch wrapper
async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  token: string,
  body?: any
): Promise<any> {
  let url = `${BASE_URL}/${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  // For PATCH, we must supply the document name in the body and set the updateMask query parameters for partial edits
  if (method === 'PATCH' && body) {
    if (!body.name) {
      body.name = `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
    }
    if (body.fields) {
      const keys = Object.keys(body.fields);
      if (keys.length > 0) {
        const queryParams = keys.map(key => `updateMask.fieldPaths=${key}`).join('&');
        url += `?${queryParams}`;
      }
    }
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  logMessage(`API CALL: ${method} ${path}`);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    logMessage(`API RESP: ${method} ${path} -> Status ${response.status}`);

    if (!response.ok) {
      if (response.status === 404 && method === 'GET') {
        return null;
      }
      const errorText = await response.text();
      logMessage(`API ERR: ${method} ${path} -> ${response.status}: ${errorText}`);
      throw new Error(`Firestore REST API Error (${response.status}): ${errorText}`);
    }

    if (method === 'DELETE') {
      return true;
    }

    return response.json();
  } catch (err: any) {
    logMessage(`API EXCEPTION: ${method} ${path} -> ${err.message}`);
    throw err;
  }
}

// Document Operations
export const firestoreRest = {
  // Get user profile
  getUserProfile: async (uid: string, token: string): Promise<UserProfile | null> => {
    const data = await apiRequest(`users/${uid}`, 'GET', token);
    if (!data) return null;
    return fromFirestoreFields(data.fields) as UserProfile;
  },

  // Save/Update user profile (upsert)
  saveUserProfile: async (uid: string, profile: Partial<UserProfile>, token: string): Promise<UserProfile> => {
    const fields = toFirestoreFields(profile);
    const data = await apiRequest(`users/${uid}`, 'PATCH', token, { fields });
    return fromFirestoreFields(data.fields) as UserProfile;
  },

  // Get food logs
  getFoodEntries: async (uid: string, token: string): Promise<FoodEntry[]> => {
    const data = await apiRequest(`users/${uid}/foodLog`, 'GET', token);
    if (!data || !data.documents) return [];
    return data.documents.map((doc: any) => {
      const entry = fromFirestoreFields(doc.fields) as FoodEntry;
      entry.id = getDocId(doc.name); // Ensure the ID matches the doc name
      return entry;
    });
  },

  // Save/Update food entry (upsert using ID)
  saveFoodEntry: async (uid: string, entry: FoodEntry, token: string): Promise<FoodEntry> => {
    const fields = toFirestoreFields(entry);
    const data = await apiRequest(`users/${uid}/foodLog/${entry.id}`, 'PATCH', token, { fields });
    const saved = fromFirestoreFields(data.fields) as FoodEntry;
    saved.id = getDocId(data.name);
    return saved;
  },

  // Delete food entry
  deleteFoodEntry: async (uid: string, id: string, token: string): Promise<boolean> => {
    return apiRequest(`users/${uid}/foodLog/${id}`, 'DELETE', token);
  },

  // Get custom foods
  getCustomFoods: async (uid: string, token: string): Promise<CustomFood[]> => {
    const data = await apiRequest(`users/${uid}/customFoods`, 'GET', token);
    if (!data || !data.documents) return [];
    return data.documents.map((doc: any) => {
      const entry = fromFirestoreFields(doc.fields) as CustomFood;
      entry.id = getDocId(doc.name);
      return entry;
    });
  },

  // Save custom food
  saveCustomFood: async (uid: string, customFood: CustomFood, token: string): Promise<CustomFood> => {
    const fields = toFirestoreFields(customFood);
    const data = await apiRequest(`users/${uid}/customFoods/${customFood.id}`, 'PATCH', token, { fields });
    const saved = fromFirestoreFields(data.fields) as CustomFood;
    saved.id = getDocId(data.name);
    return saved;
  },

  // Delete custom food
  deleteCustomFood: async (uid: string, id: string, token: string): Promise<boolean> => {
    return apiRequest(`users/${uid}/customFoods/${id}`, 'DELETE', token);
  },

  // Get weight logs
  getWeightLog: async (uid: string, token: string): Promise<WeightEntry[]> => {
    const data = await apiRequest(`users/${uid}/weightLog`, 'GET', token);
    if (!data || !data.documents) return [];
    return data.documents.map((doc: any) => {
      const entry = fromFirestoreFields(doc.fields) as WeightEntry;
      entry.date = getDocId(doc.name); // The ID is the YYYY-MM-DD date
      return entry;
    });
  },

  // Save weight entry (date is the ID)
  saveWeightEntry: async (uid: string, weightEntry: WeightEntry, token: string): Promise<WeightEntry> => {
    const fields = toFirestoreFields(weightEntry);
    const data = await apiRequest(`users/${uid}/weightLog/${weightEntry.date}`, 'PATCH', token, { fields });
    const saved = fromFirestoreFields(data.fields) as WeightEntry;
    saved.date = getDocId(data.name);
    return saved;
  },
};
