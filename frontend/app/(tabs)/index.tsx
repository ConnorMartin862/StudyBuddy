import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function Index() {
  const { token } = useAuth();

  if (!token) return <Redirect href="/login" />;
  return <Redirect href="/home" />;
}