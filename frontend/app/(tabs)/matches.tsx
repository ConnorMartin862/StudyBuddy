import { StyleSheet, FlatList, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMatches, getSentPushes, getReceivedPushes, pushStudent } from '@/utils/api';

type Person = { id: string; name: string };

export default function MatchesScreen() {
  const router = useRouter();

  const [incoming, setIncoming] = useState<Person[]>([]);
  const [matched,  setMatched]  = useState<Person[]>([]);
  const [sent,     setSent]     = useState<Person[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [matchingId, setMatchingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [matches, sentPushes, receivedPushes] = await Promise.all([
        getMatches(),
        getSentPushes(),
        getReceivedPushes(),
      ]);

      const matchIds = new Set(matches.map((m: Person) => m.id));

      // Incoming = received pushes that are NOT already matched
      setIncoming(receivedPushes.filter((p: Person) => !matchIds.has(p.id)));
      setMatched(matches);
      // Sent = sent pushes that are NOT already matched
      setSent(sentPushes.filter((p: Person) => !matchIds.has(p.id)));
    } catch (e) {
      console.error('Failed to load matches', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchBack = async (id: string) => {
    setMatchingId(id);
    try {
      await pushStudent(id);
      await loadAll(); // reload to move them to matched
    } catch (e) {
      console.error('Failed to match back', e);
    } finally {
      setMatchingId(null);
    }
  };

  const IncomingCard = ({ id, name }: Person) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <ThemedText style={styles.name}>{name}</ThemedText>
      <TouchableOpacity
        style={styles.matchBackBtn}
        onPress={() => handleMatchBack(id)}
        disabled={matchingId === id}
      >
        {matchingId === id
          ? <ActivityIndicator color="#fff" size="small" />
          : <ThemedText style={styles.matchBackTxt}>Match Back</ThemedText>
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const MatchedCard = ({ id, name }: Person) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={[styles.avatar, styles.matchedAvatar]}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <ThemedText style={styles.name}>{name}</ThemedText>
      <View style={styles.matchedTag}>
        <ThemedText style={styles.tagTxt}>Matched</ThemedText>
      </View>
    </TouchableOpacity>
  );

  const SentCard = ({ id, name }: Person) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={[styles.avatar, styles.sentAvatar]}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <ThemedText style={styles.name}>{name}</ThemedText>
      <View style={styles.sentTag}>
        <ThemedText style={styles.tagTxt}>Requested</ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerText}>Matches</ThemedText>
        </View>
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerText}>Matches</ThemedText>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Incoming requests */}
            {incoming.length > 0 && (
              <>
                <ThemedText type="subtitle" style={styles.sectionLabel}>
                  Incoming Requests
                </ThemedText>
                {incoming.map(p => <IncomingCard key={p.id} {...p} />)}
              </>
            )}

            {/* Matched */}
            <ThemedText type="subtitle" style={styles.sectionLabel}>Matched</ThemedText>
            {matched.length === 0
              ? <ThemedText style={styles.empty}>No matches yet.</ThemedText>
              : matched.map(p => <MatchedCard key={p.id} {...p} />)
            }

            {/* Sent requests */}
            {sent.length > 0 && (
              <>
                <ThemedText type="subtitle" style={styles.sectionLabel}>
                  Sent Requests
                </ThemedText>
                {sent.map(p => <SentCard key={p.id} {...p} />)}
              </>
            )}
          </>
        }
        contentContainerStyle={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4466c9',
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#32a85e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 10,
  },
  headerText: { color: '#ffffff' },
  sectionLabel: {
    color: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchedAvatar: { backgroundColor: '#32a85e' },
  sentAvatar:    { backgroundColor: '#ffa000' },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  name: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  matchBackBtn: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  matchBackTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  matchedTag: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sentTag: {
    backgroundColor: '#ffa000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginBottom: 10,
  },
});