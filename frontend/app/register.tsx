import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth'

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      await register(name, username, email, password);
      router.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Image
        source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
        style={styles.logo}
      />
      <ThemedText type="title" style={styles.title}>Create Account</ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <ThemedText style={styles.buttonText}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <ThemedText style={styles.link}>Already have an account? Log in</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4466c9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: '#1c1c1e',
    color: '#ffffff',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#32a85e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 10,
  },
  link: {
    color: '#ffffff',
    marginTop: 20,
    textDecorationLine: 'underline',
  },
});