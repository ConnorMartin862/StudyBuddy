import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BASE_URL = 'http://localhost:3000';

// ── Platform-aware storage ────────────────────────────────────────────────────
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    await AsyncStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await AsyncStorage.removeItem(key);
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────
async function request(method: string, path: string, body?: object) {
  const token = await storage.get('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw { response: { data } };
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function register(name: string, email: string, password: string) {
  const data = await request('POST', '/auth/register', { name, email, password });
  await storage.set('token', data.token);
  await storage.set('userId', data.user.id);
  return data;
}

export async function login(email: string, password: string) {
  const data = await request('POST', '/auth/login', { email, password });
  console.log('Saving token:', data.token); // add this
  await storage.set('token', data.token);
  await storage.set('userId', data.user.id);
  return data;
}

export async function logout() {
  await storage.remove('token');
  await storage.remove('userId');
}

export async function getToken() {
  return await storage.get('token');
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getMyProfile() {
  return await request('GET', '/users/me');
}

export async function updateMyProfile(data: { name?: string; preferences?: any[]; schedule?: any[]; classes?: any[] }) {
  return await request('PUT', '/users/me', data);
}

export async function getStudentProfile(id: string) {
  return await request('GET', `/users/${id}`);
}

// ── Classes ───────────────────────────────────────────────────────────────────
export async function getAllClasses() {
  return await request('GET', '/classes');
}

export async function getClassById(id: string) {
  return await request('GET', `/classes/${id}`);
}

export async function enrollInClass(class_id: string) {
  return await request('POST', '/enrollments', { class_id });
}

export async function dropClass(class_id: string) {
  return await request('DELETE', `/enrollments/${class_id}`);
}

// ── Pushes / Matches ──────────────────────────────────────────────────────────
export async function pushStudent(toUserId: string) {
  return await request('POST', `/pushes/${toUserId}`);
}

export async function unpushStudent(toUserId: string) {
  return await request('DELETE', `/pushes/${toUserId}`);
}

export async function getSentPushes() {
  return await request('GET', '/pushes/sent');
}

export async function getMatches() {
  return await request('GET', '/pushes/matches');
}