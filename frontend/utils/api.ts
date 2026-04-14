import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native';

//export const BASE_URL = Platform.OS === 'web' ? 'http://localhost:3000' : 'https://joseph-unneeded-straitly.ngrok-free.dev';
export const BASE_URL = "https://studybuddy-production-b48d.up.railway.app";

// ── Platform-aware storage ────────────────────────────────────────────────────
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);  // was AsyncStorage.getItem
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);  // was AsyncStorage.setItem
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);  // was AsyncStorage.removeItem
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

export async function updateMyProfile(data: { 
  name?: string; 
  preferences?: any[]; 
  schedule?: any[]; 
  classes?: any[];
  sleep_preference?: string | null;
  assignment_style?: string | null;
  campus_frequency?: string | null;
  meeting_preference?: string | null;
  living_situation?: string | null;
}) {  return await request('PUT', '/users/me', data);
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

// export async function enrollInClass(classId: string) {
//   return await request('POST', '/enrollments', { class_id: classId });
// }

export async function enrollInClass(classId: string) {
  console.log('enrollInClass called with:', classId);
  return await request('POST', '/enrollments', { class_id: classId });
}

export async function dropClass(class_id: string) {
  return await request('DELETE', `/enrollments/${class_id}`);
}

export async function createClass(course_code: string, name: string, description?: string) {
  return await request('POST', '/classes', { course_code, name, description });
}

export async function getEnrolledClasses() {
  return await request('GET', '/enrollments/me');
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

export async function getPushStatus(userId: string) {
  return await request('GET', `/pushes/status/${userId}`);
}

export async function getReceivedPushes() {
  return await request('GET', '/pushes/received');
}

// ── Threads ──────────────────────────────────────────────────────────

export async function getThreads(classId: string) {
  return await request('GET', `/classes/${classId}/threads`);
}

export async function createThread(classId: string, title: string, body?: string) {
  return await request('POST', `/classes/${classId}/threads`, { title, body });
}

export async function getThread(threadId: string) {
  return await request('GET', `/threads/${threadId}`);
}

export async function createComment(threadId: string, body: string) {
  return await request('POST', `/threads/${threadId}/comments`, { body });
}

export async function slapThread(threadId: string) {
  return await request('POST', `/threads/${threadId}/slap`);
}

export async function unslapThread(threadId: string) {
  return await request('DELETE', `/threads/${threadId}/slap`);
}

export async function slapComment(commentId: string) {
  return await request('POST', `/comments/${commentId}/slap`);
}

export async function unslapComment(commentId: string) {
  return await request('DELETE', `/comments/${commentId}/slap`);
}

export async function syncEnrollments() {
  try {
    const [profile, allClasses] = await Promise.all([getMyProfile(), getAllClasses()]);
    const myClassNames: string[] = profile.classes ?? [];
    
    // Get current enrollments
    const enrolled = await request('GET', '/enrollments/mine');
    const enrolledIds = new Set(enrolled.map((e: any) => e.class_id));

    // For each class in profile, enroll if not already enrolled
    for (const className of myClassNames) {
      const match = allClasses.find((c: any) =>
        `${c.course_code} - ${c.name}` === className ||
        c.course_code === className ||
        c.name === className
      );
      if (match && !enrolledIds.has(match.id)) {
        await enrollInClass(match.id);
      }
    }
  } catch (e) {
    console.warn('syncEnrollments failed', e);
  }
}