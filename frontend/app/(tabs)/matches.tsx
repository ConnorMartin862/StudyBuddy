import { StyleSheet, FlatList, TouchableOpacity, View, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMatches, getSentPushes, getReceivedPushes, pushStudent, getRecentMessages, searchUsers } from '@/utils/api';
import { useTheme } from '@/context/theme';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Person = { id: string; name: string; lastMessageAt?: string | null };

export default function MatchesScreen() {
  const { dark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [incoming, setIncoming] = useState<Person[]>([]);
  const [matched,  setMatched]  = useState<Person[]>([]);
  const [sent,     setSent]     = useState<Person[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; username: string; status: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [matches, sentPushes, receivedPushes, recentMsgs] = await Promise.all([
        getMatches(),
        getSentPushes(),
        getReceivedPushes(),
        getRecentMessages(),
      ]);

      const matchIds = new Set(matches.map((m: Person) => m.id));
      const recentMap = new Map(recentMsgs.map((r: any) => [r.other_user_id, r.last_message_at]));

      const matchedWithRecent = matches.map((m: Person) => ({
        ...m,
        lastMessageAt: recentMap.get(m.id) ?? null,
      }));

      matchedWithRecent.sort((a: Person, b: Person) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setIncoming(receivedPushes.filter((p: Person) => !matchIds.has(p.id)));
      setMatched(matchedWithRecent);
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

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(text);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const SearchResultCard = ({ id, name, username, status }: { id: string; name: string; username: string; status: string }) => (
    <TouchableOpacity
      style={[styles.card, dark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={[
        styles.avatar,
        status === 'matched' && styles.matchedAvatar,
        status === 'pushed' && styles.sentAvatar,
        status === 'incoming' && { backgroundColor: '#1565c0' },
      ]}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.name}>{name}</ThemedText>
        <ThemedText style={{ color: '#aaaaaa', fontSize: 12 }}>@{username}</ThemedText>
      </View>
      {status === 'matched' && <View style={styles.matchedTag}><ThemedText style={styles.tagTxt}>Matched</ThemedText></View>}
      {status === 'pushed' && <View style={styles.sentTag}><ThemedText style={styles.tagTxt}>Requested</ThemedText></View>}
      {status === 'incoming' && <View style={[styles.matchedTag, { backgroundColor: '#1565c0' }]}><ThemedText style={styles.tagTxt}>Incoming</ThemedText></View>}
    </TouchableOpacity>
  );

  const IncomingCard = ({ id, name }: Person) => (
    <TouchableOpacity
      style={[styles.card, dark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}
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
      style={[styles.card, dark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={[styles.avatar, styles.matchedAvatar]}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <ThemedText style={styles.name}>{name}</ThemedText>
      <TouchableOpacity
        style={styles.dmBtn}
        onPress={() => router.push({ pathname: '/dm/[id]' as any, params: { id, name } })}
      >
        <ThemedText style={styles.dmTxt}>💬</ThemedText>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const SentCard = ({ id, name }: Person) => (
    <TouchableOpacity
      style={[styles.card, dark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}
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
      <ThemedView style={[styles.container, { backgroundColor: dark ? '#121212' : '#4466c9' }]}>
        <View style={[styles.header, { paddingTop: insets.top }, { backgroundColor: dark ? '#1565c0' : '#32a85e' }]}>
          <ThemedText type="title" style={styles.title}>Matches</ThemedText>
        </View>
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: dark ? '#121212' : '#4466c9' }]}>
      <View style={[styles.header, { paddingTop: insets.top }, { backgroundColor: dark ? '#1565c0' : '#32a85e' }]}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <IconSymbol name="person.circle.fill" size={48} color='#fff' />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/recommendations' as any)}>
          <Image
            source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
            style={{ width: 60, height: 60 }}
          />
        </TouchableOpacity>
      </View>
      <ThemedText type="title" style={styles.title}>Matches:</ThemedText>
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#aaaaaa"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator color="#fff" style={{ marginLeft: 8 }} />}
      </View>

      {/* Search results */}
      {searchQuery.trim().length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          {searchResults.length === 0 && !searching
            ? <ThemedText style={styles.empty}>No users found.</ThemedText>
            : searchResults.map(r => <SearchResultCard key={r.id} {...r} />)
          }
        </View>
      )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 0,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
  },
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
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
  dmBtn: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dmTxt: {
    fontSize: 18,
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