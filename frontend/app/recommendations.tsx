import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useTheme } from '@/context/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecommendations } from '@/utils/api';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';

const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  white:    '#ffffff',
  bg:       '#4466c9',
  card:     '#1c1c1e',
  textSec:  '#aaaaaa',
};

type Recommendation = {
  id: string;
  name: string;
  username: string;
  score: number;
};

export default function RecommendationsScreen() {
  const { dark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRecs();
    }, [])
  );

  const loadRecs = async () => {
    setLoading(true);
    try {
      const data = await getRecommendations();
      setRecs(data);
    } catch (e) {
      console.error('Failed to load recommendations', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Recommendation }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: dark ? '#1e1e1e' : C.card },
        dark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }
      ]}
      onPress={() => router.push(`/student/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: dark ? '#2e7d32' : C.accent }]}>
        <Text style={styles.scoreText}>{Math.round(item.score * 100)}%</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#121212' : C.bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: dark ? '#1565c0' : '#32a85e' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Image
            source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
            style={{ width: 60, height: 60 }}
          />
        </View>

        <ThemedText type="title" style={styles.title}>Recommendations:</ThemedText>

        {loading ? (
          <ActivityIndicator color={C.white} style={{ marginTop: 40 }} />
        ) : recs.length === 0 ? (
          <Text style={styles.empty}>No recommendations yet — fill out your profile and classes to get matched!</Text>
        ) : (
          <FlatList
            data={recs}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  header:     {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 10,
  },
  backBtn:    { width: 60 },
  backTxt:    { color: C.white, fontSize: 16, fontWeight: '600' },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
  },
  list:       { paddingHorizontal: 20, paddingBottom: 30 },
  card:       {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 14,
    marginBottom: 10,
  },
  avatar:     {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#555',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.white, fontSize: 18, fontWeight: '700' },
  name:       { color: C.white, fontSize: 16, fontWeight: '600' },
  username:   { color: C.textSec, fontSize: 12, marginTop: 2 },
  scoreBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  scoreText:  { color: C.white, fontSize: 13, fontWeight: '700' },
  empty:      {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
    marginHorizontal: 30,
  },
});