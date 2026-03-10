import { StyleSheet, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getMyProfile, getMatches } from '@/app/student/utils/api';
import { BASE_URL } from '@/app/student/utils/api';

const CLASS_COLORS = ['#4A90D9', '#E07B53', '#5CB85C', '#9B59B6', '#E67E22', '#E74C3C'];

export default function ClassScreen() {
  const { id, name, color } = useLocalSearchParams<{ id: string; name: string; color: string }>();
  const router = useRouter();

  const [members,  setMembers]  = useState<{ id: string; name: string; matched: boolean }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [className, setClassName] = useState(name ?? 'Class');

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [name])
  );

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Get all users enrolled in classes with this name
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${BASE_URL}/classes/by-name/${encodeURIComponent(name ?? '')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Get current user's matches
      // const matches = await getMatches();
      // const matchIds = new Set(matches.map((m: any) => m.id));

      let matchIds = new Set<string>();
      try {
        const matches = await getMatches();
        matchIds = new Set(matches.map((m: any) => m.id));
      } catch (e) {
        console.warn('Could not load matches', e);
      }

      // Get current user's own profile to exclude self
      const me = await getMyProfile();

      const memberList = (data.students ?? [])
        .filter((s: any) => s.id !== me.id)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          matched: matchIds.has(s.id),
        }))
        .sort((a: any, b: any) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0));

      setMembers(memberList);
    } catch (e) {
      console.error('Failed to load class members', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top bar */}
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <IconSymbol name="person.circle.fill" size={48} color="#fff" />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
          style={{ width: 60, height: 60 }}
        />
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Class title */}
        <ThemedText type="title" style={styles.title}>{name}</ThemedText>

        {/* Members section */}
        <ThemedText style={styles.sectionHeader}>Members</ThemedText>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : members.length === 0 ? (
          <ThemedText style={styles.empty}>No other students in this class yet.</ThemedText>
        ) : (
          members.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.memberRow}
              onPress={() => router.push(`/student/${item.id}`)}
            >
              <View style={styles.memberInfo}>
                <View style={[styles.memberAvatar, item.matched && styles.matchedAvatar]}>
                  <ThemedText style={styles.avatarText}>
                    {item.name.charAt(0)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.memberName}>{item.name}</ThemedText>
              </View>
              {item.matched && (
                <View style={styles.matchBadge}>
                  <ThemedText style={styles.matchBadgeText}>Match</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#4466c9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#32a85e',
  },
  scroll: {
    paddingBottom: 30,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 20,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
  },
  empty: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    marginHorizontal: 20,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  matchedAvatar: {
    backgroundColor: '#32a85e',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    color: '#ffffff',
    fontSize: 15,
  },
  matchBadge: {
    backgroundColor: '#32a85e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});