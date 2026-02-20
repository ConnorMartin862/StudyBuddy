import { StyleSheet, FlatList, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';

const SETTINGS = [
  { id: '1', name: 'Push Notifications' },
  { id: '2', name: 'Dark Mode' },
  { id: '3', name: 'Location Services' },
  { id: '4', name: 'Auto-Match' },
  { id: '5', name: 'Show Online Status' },
  { id: '6', name: 'Sound Effects' },
  { id: '7', name: 'Email Notifications' },
  { id: '8', name: 'Profile Visibility' },
  { id: '9', name: 'Data Sync' },
  { id: '10', name: 'Analytics' },
]

export default function SettingsScreen() {
  const router = useRouter();
  
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.id, false]))
  );

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/modal')}>
          <IconSymbol name="person.circle.fill" size={48} color='#fff' />
        </TouchableOpacity>
        <Image 
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')} 
          style={{ width: 60, height: 60 }} 
        />
      </ThemedView>
      <ThemedText type="title" style={styles.title}>Settings</ThemedText>
      <FlatList
        data={SETTINGS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView style={styles.settingRow}>
            <ThemedText style={{ color: '#ffffff', fontSize: 16 }}>{item.name}</ThemedText>
            <Switch
              value={toggles[item.id]}
              onValueChange={() => handleToggle(item.id)}
              trackColor={{ false: '#555', true: '#32a85e' }}
              thumbColor="#ffffff"
            />
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#4466c9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: '#32a85e',
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
  },
  list: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingLeft: 15,
    paddingRight: 15,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
  },
});