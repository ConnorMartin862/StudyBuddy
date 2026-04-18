import { StyleSheet, FlatList, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { logout, savePushToken } from '@/utils/api';
import { useTheme } from '@/context/theme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const SETTINGS = [
  { id: '1', name: 'Push Notifications' },
  { id: '2', name: 'Dark Mode' },
  { id: '3', name: 'Analytics' },
  { id: '4', name: 'Auto-Match' },
  { id: '5', name: 'Show Online Status' },
  { id: '6', name: 'Sound Effects' },
  { id: '7', name: 'Email Notifications' },
  { id: '8', name: 'Profile Visibility' },
  { id: '9', name: 'Data Sync' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dark, toggleDark, colors } = useTheme();
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.id, s.id === '2' ? dark : false]))
  );

  const handleToggle = async (id: string) => {
    if (id === '2') {
      toggleDark();
      setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
    } else if (id === '1') {
      const newVal = !toggles[id];
      setToggles((prev) => ({ ...prev, [id]: newVal }));
      if (newVal) {
        // Turning on — request permission and save token
        if (!Device.isDevice || Platform.OS === 'web') return;
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          setToggles((prev) => ({ ...prev, [id]: false }));
          return;
        }
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await savePushToken(token).catch(() => {});
      } else {
        // Turning off — clear token
        await savePushToken('').catch(() => {});
      }
    } else {
      setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: dark ? '#121212' : '#4466c9' }]}>
      <ThemedView style={[styles.header, { paddingTop: insets.top }, { backgroundColor: dark ? '#1565c0' : '#32a85e' }]}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <IconSymbol name="person.circle.fill" size={48} color='#fff' />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/recommendations' as any)}>
          <Image
            source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
            style={{ width: 60, height: 60 }}
          />
        </TouchableOpacity>
      </ThemedView>

      <ThemedText type="title" style={styles.title}>Settings:</ThemedText>

      <FlatList
        data={SETTINGS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView style={[styles.settingRow, { 
            borderWidth: dark ? 1 : 0, 
            borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' 
          }]}>
            <ThemedText style={{ color: '#ffffff', fontSize: 16 }}>{item.name}</ThemedText>
            <Switch
              value={toggles[item.id]}
              onValueChange={() => handleToggle(item.id)}
              trackColor={{ false: '#555', true: '#32a85e' }}
              thumbColor="#ffffff"
            />
          </ThemedView>
        )}
        ListFooterComponent={
        <>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <ThemedText style={styles.logoutTxt}>Log Out</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.privacyBtn} onPress={() => router.push('/privacy')}>
            <ThemedText style={styles.privacyTxt}>Privacy Policy</ThemedText>
          </TouchableOpacity>
        </>
}
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
  logoutBtn: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutTxt: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyBtn: { alignItems: 'center', paddingVertical: 16 },
  privacyTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
});