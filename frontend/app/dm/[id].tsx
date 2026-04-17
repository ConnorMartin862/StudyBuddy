import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { getMessages, sendMessage } from '@/utils/api';

const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  white:    '#ffffff',
  bg:       '#4466c9',
  card:     '#1c1c1e',
  border:   '#2a2a2e',
  textSec:  '#aaaaaa',
};

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  created_at: string;
  from_name: string;
};

export default function DMScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const { dark } = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(id);
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendMessage(id, input.trim());
      setInput('');
      await loadMessages();
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.from_user_id === user?.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        <View style={[
          styles.bubble,
          isMe
            ? styles.bubbleMe
            : { backgroundColor: dark ? '#2a2a2e' : '#3a3a3e', borderBottomLeftRadius: 4 }
        ]}>
          <Text style={styles.bubbleText}>{item.body}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#121212' : C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: dark ? '#121212' : C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{name}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color={C.white} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>No messages yet — say hi!</Text>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[
          styles.inputRow,
          {
            backgroundColor: dark ? '#1e1e1e' : C.card,
            borderTopColor: dark ? 'rgba(255,255,255,0.1)' : C.border,
          }
        ]}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: dark ? '#2a2a2e' : '#3a3a3e' }
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor={C.textSec}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.sendTxt}>Send</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:     { width: 60 },
  backTxt:     { color: C.white, fontSize: 16, fontWeight: '600' },
  headerName:  { color: C.white, fontSize: 17, fontWeight: '700' },
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow:      { marginBottom: 10 },
  msgRowMe:    { alignItems: 'flex-end' },
  msgRowThem:  { alignItems: 'flex-start' },
  bubble:      { maxWidth: '75%', borderRadius: 16, padding: 10 },
  bubbleMe:    { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleText:  { color: C.white, fontSize: 14, lineHeight: 20 },
  timestamp:   { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  empty:       { color: C.textSec, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  inputRow:    {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1,
  },
  input:       {
    flex: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, color: C.white,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn:     {
    backgroundColor: C.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  sendTxt:     { color: C.white, fontWeight: '700', fontSize: 14 },
});