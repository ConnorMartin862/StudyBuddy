import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getThread, createComment, slapThread, unslapThread, slapComment, unslapComment } from '@/utils/api';

const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  white:    '#ffffff',
  bg:       '#4466c9',
  card:     '#1c1c1e',
  border:   '#2a2a2e',
  textPri:  '#ffffff',
  textSec:  '#aaaaaa',
  red:      '#c62828',
  amber:    '#ffa000',
};

export default function ThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [thread,       setThread]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [comment,      setComment]      = useState('');
  const [posting,      setPosting]      = useState(false);
  const [slapping,     setSlapping]     = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadThread();
    }, [id])
  );

  const loadThread = async () => {
    setLoading(true);
    try {
      const data = await getThread(id);
      setThread(data);
    } catch (e) {
      console.error('Failed to load thread', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await createComment(id, comment.trim());
      setComment('');
      await loadThread();
    } catch (e) {
      console.error('Failed to post comment', e);
    } finally {
      setPosting(false);
    }
  };

  const handleSlapThread = async () => {
    if (!thread) return;
    setSlapping('thread');
    try {
      if (thread.slapped) {
        await unslapThread(id);
      } else {
        await slapThread(id);
      }
      await loadThread();
    } catch (e) {
      console.error('Failed to slap thread', e);
    } finally {
      setSlapping(null);
    }
  };

  const handleSlapComment = async (commentId: string, slapped: boolean) => {
    setSlapping(commentId);
    try {
      if (slapped) {
        await unslapComment(commentId);
      } else {
        await slapComment(commentId);
      }
      await loadThread();
    } catch (e) {
      console.error('Failed to slap comment', e);
    } finally {
      setSlapping(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.white} />
      </SafeAreaView>
    );
  }

  if (!thread) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: C.white }}>Thread not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Thread</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={s.scroll}>

          {/* Thread body */}
          <View style={s.threadCard}>
            <Text style={s.threadTitle}>{thread.title}</Text>
            {thread.body ? <Text style={s.threadBody}>{thread.body}</Text> : null}
            <View style={s.threadMeta}>
              <Text style={s.metaTxt}>by {thread.author_name}</Text>
              <TouchableOpacity
                style={[s.slapBtn, thread.slapped && s.slapBtnActive]}
                onPress={handleSlapThread}
                disabled={slapping === 'thread'}
              >
                {slapping === 'thread'
                  ? <ActivityIndicator size="small" color={C.white} />
                  : <Text style={s.slapTxt}>🤚 {thread.slap_count} {thread.slapped ? 'Slapped' : 'Slap'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments */}
          <Text style={s.commentsHeader}>
            {thread.comments.length} {thread.comments.length === 1 ? 'Reply' : 'Replies'}
          </Text>

          {thread.comments.length === 0 ? (
            <Text style={s.empty}>No replies yet — be the first!</Text>
          ) : (
            thread.comments.map((c: any) => (
              <View key={c.id} style={s.commentCard}>
                <View style={s.commentTop}>
                  <View style={s.commentAvatar}>
                    <Text style={s.commentAvatarTxt}>{c.author_name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={s.commentAuthor}>{c.author_name}</Text>
                </View>
                <Text style={s.commentBody}>{c.body}</Text>
                <TouchableOpacity
                  style={[s.slapBtn, c.slapped && s.slapBtnActive]}
                  onPress={() => handleSlapComment(c.id, c.slapped)}
                  disabled={slapping === c.id}
                >
                  {slapping === c.id
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <Text style={s.slapTxt}>🤚 {c.slap_count} {c.slapped ? 'Slapped' : 'Slap'}</Text>
                  }
                </TouchableOpacity>
              </View>
            ))
          )}

        </ScrollView>

        {/* Comment input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Add a reply..."
            placeholderTextColor="#555"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={s.postBtn}
            onPress={handlePostComment}
            disabled={posting || !comment.trim()}
          >
            {posting
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={s.postTxt}>Post</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn:     { width: 60 },
  backTxt:     { color: C.white, fontSize: 15 },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: '700' },
  scroll:      { padding: 16, paddingBottom: 30 },

  threadCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  threadTitle: { color: C.white, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  threadBody:  { color: '#cccccc', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  threadMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTxt:     { color: C.textSec, fontSize: 12 },

  slapBtn: {
    backgroundColor: '#2a2a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  slapBtnActive: { backgroundColor: C.accent },
  slapTxt:       { color: C.white, fontSize: 12, fontWeight: '600' },

  commentsHeader: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },

  commentCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  commentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.headerBg,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
  commentAuthor:    { color: C.white, fontSize: 13, fontWeight: '600' },
  commentBody:      { color: '#cccccc', fontSize: 14, marginBottom: 10, lineHeight: 20 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2e',
    borderRadius: 10,
    padding: 10,
    color: C.white,
    fontSize: 14,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postTxt: { color: C.white, fontWeight: '700', fontSize: 14 },
});