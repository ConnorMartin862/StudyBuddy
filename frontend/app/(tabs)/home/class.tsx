import { StyleSheet, TouchableOpacity, View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getMyProfile, getPushStatus, getClassById, getThreads } from '@/utils/api';

export default function ClassScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [members,  setMembers]  = useState<{ id: string; name: string; status: 'unmatched' | 'pushed' | 'matched' }[]>([]);
  const [threads,  setThreads]  = useState<any[]>([]);
  const [visibleThreads, setVisibleThreads] = useState(3);
  const [loading,  setLoading]  = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [id])
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [classData, me, threadData] = await Promise.all([
        getClassById(id),
        getMyProfile(),
        getThreads(id),
      ]);

      const memberList = await Promise.all(
        (classData.students ?? [])
          .filter((s: any) => s.id !== me.id)
          .map(async (s: any) => {
            const { status } = await getPushStatus(s.id);
            return { id: s.id, name: s.name, status };
          })
      );
      memberList.sort((a, b) => {
        const order: Record<string, number> = { matched: 0, pushed: 1, unmatched: 2 };
        return order[a.status] - order[b.status];
      });

      setMembers(memberList);
      setThreads(threadData);
    } catch (e) {
      console.error('Failed to load class', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top bar */}
      <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={styles.backTxt}>← Back</ThemedText>
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
          style={{ width: 60, height: 60 }}
        />
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Class title */}
        <ThemedText type="title" style={styles.title}>{name}</ThemedText>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Threads section */}
            <View style={styles.sectionRow}>
              <ThemedText style={styles.sectionHeader}>Threads</ThemedText>
              <TouchableOpacity
                style={styles.newThreadBtn}
                onPress={() => router.push({ pathname: '/thread/new', params: { classId: id, className: name } })}
              >
                <ThemedText style={styles.newThreadTxt}>+ New</ThemedText>
              </TouchableOpacity>
            </View>

            {threads.length === 0 ? (
              <ThemedText style={styles.empty}>No threads yet — start one!</ThemedText>
            ) : (
              <>
                {threads.slice(0, visibleThreads).map(thread => (
                  <TouchableOpacity
                    key={thread.id}
                    style={styles.threadCard}
                    onPress={() => router.push({ pathname: '/thread/[id]', params: { id: thread.id, classId: id } })}
                  >
                    <View style={styles.threadTop}>
                      <ThemedText style={styles.threadTitle}>{thread.title}</ThemedText>
                      <View style={styles.slapBadge}>
                        <ThemedText style={styles.slapTxt}>🤚 {thread.slap_count}</ThemedText>
                      </View>
                    </View>
                    {thread.top_comment ? (
                      <ThemedText style={styles.topComment} numberOfLines={1}>
                        {thread.top_comment_author}: {thread.top_comment}
                      </ThemedText>
                    ) : null}
                    <ThemedText style={styles.replyCount}>
                      {thread.comment_count} {thread.comment_count === '1' ? 'reply' : 'replies'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                {visibleThreads < threads.length && (
                  <TouchableOpacity
                    style={styles.loadMore}
                    onPress={() => setVisibleThreads(v => v + 3)}
                  >
                    <ThemedText style={styles.loadMoreTxt}>Show more threads</ThemedText>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Members section */}
            <View style={styles.sectionRow}>
              <ThemedText style={styles.sectionHeader}>Members</ThemedText>
            </View>
            {members.length === 0 ? (
              <ThemedText style={styles.empty}>No other students in this class yet.</ThemedText>
            ) : (
              members.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.memberRow}
                  onPress={() => router.push(`/student/${item.id}`)}
                >
                  <View style={styles.memberInfo}>
                    <View style={[
                      styles.memberAvatar,
                      item.status === 'matched' && styles.matchedAvatar,
                      item.status === 'pushed'  && styles.pushedAvatar,
                    ]}>
                      <ThemedText style={styles.avatarText}>
                        {item.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.memberName}>{item.name}</ThemedText>
                  </View>
                  {item.status === 'matched' && (
                    <View style={styles.matchBadge}>
                      <ThemedText style={styles.matchBadgeText}>Matched</ThemedText>
                    </View>
                  )}
                  {item.status === 'pushed' && (
                    <View style={styles.pushedBadge}>
                      <ThemedText style={styles.matchBadgeText}>Pending</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, paddingTop: 0, backgroundColor: '#4466c9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#32a85e',
    marginBottom: 20,
  },
  scroll:      { paddingBottom: 30 },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  newThreadBtn: {
    backgroundColor: '#32a85e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newThreadTxt: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  threadCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threadTitle:  { color: '#ffffff', fontSize: 15, fontWeight: '700', flex: 1 },
  slapBadge:    { backgroundColor: '#2a2a2e', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  slapTxt:      { color: '#ffffff', fontSize: 12 },
  topComment:   { color: '#aaaaaa', fontSize: 13, marginBottom: 4 },
  replyCount:   { color: '#555', fontSize: 12 },
  loadMore: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 10,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
  },
  loadMoreTxt:  { color: '#aaaaaa', fontSize: 14 },
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
  memberInfo:   { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#555',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  matchedAvatar: { backgroundColor: '#32a85e' },
  pushedAvatar:  { backgroundColor: '#ffa000' },
  avatarText:    { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  memberName:    { color: '#ffffff', fontSize: 15 },
  backBtn: { paddingHorizontal: 10 },
  backTxt: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  matchBadge: {
    backgroundColor: '#32a85e',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pushedBadge: {
    backgroundColor: '#ffa000',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  matchBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});