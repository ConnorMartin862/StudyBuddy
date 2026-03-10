import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createClass, getMyProfile, updateMyProfile } from '@/app/student/utils/api';

const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  white:    '#ffffff',
  bg:       '#f5f5f5',
  card:     '#ffffff',
  border:   '#e0e0e0',
  textPri:  '#212121',
  textSec:  '#757575',
  red:      '#c62828',
};

export default function CreateClassScreen() {
  const router = useRouter();

  const [courseCode,  setCourseCode]  = useState('');
  const [name,        setName]        = useState('');
  const [professor,   setProfessor]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const handleSave = async () => {
    if (!courseCode.trim()) { setError('Course code is required.'); return; }
    if (!name.trim())       { setError('Class name is required.');  return; }
    setSaving(true);
    setError('');
    try {
      // Create the class in the database
      console.log('Creating class:', courseCode.trim(), name.trim());
      const newClass = await createClass(courseCode.trim(), name.trim(), professor.trim() || undefined);

      // Add it to the user's profile classes list
      const profile = await getMyProfile();
      const current = profile.classes ?? [];
      const label = `${courseCode.trim()} - ${name.trim()}`;
      if (!current.includes(label)) {
        await updateMyProfile({ classes: [...current, label] });
      }

      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to create class.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>

      <View style={s.header}>
        <Text style={s.headerTitle}>Create New Class</Text>
      </View>

      <View style={s.form}>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Text style={s.label}>Course Code <Text style={s.required}>*</Text></Text>
        <TextInput
          style={s.input}
          placeholder="e.g. EECS 441"
          placeholderTextColor="#aaa"
          value={courseCode}
          onChangeText={setCourseCode}
          autoCapitalize="characters"
        />

        <Text style={s.label}>Class Name <Text style={s.required}>*</Text></Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Mobile App Development"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={s.label}>Professor <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Prof. Smith"
          placeholderTextColor="#aaa"
          value={professor}
          onChangeText={setProfessor}
        />

      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.saveTxt}>Save</Text>
          }
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.headerBg,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '700' },
  form: { flex: 1, padding: 20, gap: 6 },
  label:    { fontSize: 14, fontWeight: '600', color: C.textPri, marginTop: 12 },
  required: { color: C.red },
  optional: { color: C.textSec, fontWeight: '400' },
  input: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12,
    fontSize: 15, color: C.textPri,
    backgroundColor: C.white,
  },
  error: {
    color: C.red, fontSize: 13,
    marginBottom: 8, fontWeight: '600',
  },
  footer: {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  cancelTxt: { color: C.textSec, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: C.accent, alignItems: 'center',
  },
  saveTxt: { color: C.white, fontSize: 15, fontWeight: '700' },
});