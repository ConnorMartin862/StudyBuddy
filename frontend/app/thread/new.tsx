import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createThread } from '@/utils/api';

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
};

export default function NewThreadScreen() {
  const router = useRouter();
  const { classId, className } = useLocalSearchParams<{ classId: string; className: string }>();

  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await createThread(classId, title.trim(), body.trim() || undefined);
      router.back();
    } catch (e: any) {
      setError('Failed to create thread.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backTxt}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>New Thread</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={s.form}>
            <Text style={s.className}>{className}</Text>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Text style={s.label}>Title *</Text>
            <TextInput
              style={s.input}
              placeholder="What's on your mind?"
              placeholderTextColor="#555"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.label}>Body (optional)</Text>
            <TextInput
              style={[s.input, s.bodyInput]}
              placeholder="Add more details..."
              placeholderTextColor="#555"
              value={body}
              onChangeText={setBody}
              multiline
            />
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.saveTxt}>Post</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#4466c9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn:     { width: 60 },
  backTxt:     { color: '#ffffff', fontSize: 15 },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  form:        { flex: 1, padding: 20, gap: 6 },
  className:   { color: '#aaaaaa', fontSize: 13, marginBottom: 12 },
  label:       { fontSize: 14, fontWeight: '600', color: '#ffffff', marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#2a2a2e',
    borderRadius: 10, padding: 12,
    fontSize: 15, color: '#ffffff',
    backgroundColor: '#1c1c1e',
  },
  bodyInput:  { minHeight: 120, textAlignVertical: 'top' },
  error:      { color: '#e53935', fontSize: 13, fontWeight: '600' },
  footer: {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: '#1c1c1e',
    borderTopWidth: 1, borderTopColor: '#2a2a2e',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a2e', alignItems: 'center',
  },
  cancelTxt: { color: '#aaaaaa', fontSize: 15, fontWeight: '600' },
  saveBtn:   {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: '#2e7d32', alignItems: 'center',
  },
  saveTxt:   { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});