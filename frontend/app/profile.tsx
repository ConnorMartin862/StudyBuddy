import React, { useState, useEffect, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getMyProfile, updateMyProfile } from '@/utils/api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const router = useRouter();

const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  accentLt: '#43a047',
  white:    '#ffffff',
  bg:       '#f5f5f5',
  card:     '#ffffff',
  border:   '#e0e0e0',
  textPri:  '#212121',
  textSec:  '#757575',
  red:      '#e53935',
  amber:    '#ffa000',
  green:    '#43a047',
};

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Block = { day: number; hour: number; color: 'red' | 'green' };

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const TRIM_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function ScheduleGrid({ blocks, trimmed }: { blocks: Block[], trimmed: boolean }) {
  const hours = trimmed ? TRIM_HOURS : ALL_HOURS;
  const { width } = useWindowDimensions();
  
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: width}}>
        <View style={sg.wrapper}>
          <View style={sg.headerRow}>
            <View style={sg.timeCol} />
            {DAYS.map(d => (
              <View key={d} style={sg.dayCol}>
                <Text style={sg.dayLabel}>{d}</Text>
              </View>
            ))}
          </View>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <View style={sg.body}>
              <View style={sg.timeCol}>
                {hours.map(h => (
                  <View key={h} style={sg.hourCell}>
                    <Text style={sg.hourLabel}>
                      {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                    </Text>
                  </View>
                ))}
              </View>
              {DAYS.map((d, di) => (
                <View key={d} style={sg.dayCol}>
                  {hours.map(h => {
                    const block = blocks.find(b => b.day === di && b.hour === h);
                    return (
                      <View
                        key={h}
                        style={[
                          sg.gridCell,
                          block?.color === 'red'   && { backgroundColor: '#ffcdd2' },
                          block?.color === 'green' && { backgroundColor: '#c8e6c9' },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

const sg = StyleSheet.create({
  wrapper:   { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  headerRow: { flexDirection: 'row', backgroundColor: C.headerBg },
  timeCol:   { width: 32 },
  dayCol:    { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  dayLabel:  { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  body:      { flexDirection: 'row', backgroundColor: C.card },
  hourCell:  { height: 20, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 2 },
  hourLabel: { fontSize: 7, color: C.textSec },
  gridCell:  { height: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
});

export default function ProfileScreen() {
  const [loading, setLoading]   = useState(true);
  const [name,    setName]      = useState('');
  const [email,   setEmail]     = useState('');
  const [prefs,   setPrefs]     = useState<string[]>([]);
  const [classes, setClasses]   = useState<string[]>([]);
  const [blocks,  setBlocks]    = useState<Block[]>([]);
  const [trimmed, setTrimmed] = useState(false);


  // Edit preference modal
  const [editPrefVisible, setEditPrefVisible] = useState(false);
  const [editingPrefIdx,  setEditingPrefIdx]  = useState<number | null>(null);
  const [prefDraft,       setPrefDraft]       = useState('');

  // Add class modal
  const [addClassVisible, setAddClassVisible] = useState(false);
  const [classDraft,      setClassDraft]      = useState('');

  // Load profile from API whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    console.log('loadProfile called');
    setLoading(true);
    try {
      const data = await getMyProfile();
      console.log('Profile data:', JSON.stringify(data));
      setName(data.name ?? '');
      setEmail(data.email ?? '');
      setPrefs(data.preferences ?? []);
      setClasses(data.classes ?? []);
      setBlocks(data.schedule ?? []);
      const t = Platform.OS === 'web'
        ? localStorage.getItem('scheduleTrim')
        : await SecureStore.getItemAsync('scheduleTrim');
      setTrimmed(t === 'true');
    } catch (e: any) {
      console.error('Failed to load profile:', e.message, JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  };

  // Save preferences to backend
  const savePrefs = async (newPrefs: string[]) => {
  setPrefs(newPrefs);
  try {
    await updateMyProfile({ preferences: newPrefs });
  } catch (e: any) {
    console.error('Failed to save prefs:', JSON.stringify(e?.response?.data));
  }
};

  // Save classes to backend
  const saveClasses = async (newClasses: string[]) => {
    setClasses(newClasses);
    try {
      await updateMyProfile({ preferences: prefs, schedule: blocks });
    } catch (e) {
      console.error('Failed to save classes', e);
    }
  };

  const openEditPref = (idx: number) => {
    setEditingPrefIdx(idx);
    setPrefDraft(prefs[idx]);
    setEditPrefVisible(true);
  };

  const savePref = async () => {
    if (editingPrefIdx === null) return;
    if (!prefDraft.trim()) {
    setEditPrefVisible(false);
      return;
    }
    const next = [...prefs];
    next[editingPrefIdx] = prefDraft;
    await savePrefs(next);
    setEditPrefVisible(false);
  };

  const addPref = () => {
    setEditingPrefIdx(prefs.length);
    setPrefDraft('');
    setEditPrefVisible(true);
  };

  const deletePref = async (idx: number) => {
    const next = prefs.filter((_, i) => i !== idx);
    await savePrefs(next);
  };

  const addClass = async () => {
    if (!classDraft.trim()) return;
    const next = [...classes, classDraft.trim()];
    setClasses(next);
    setClassDraft('');
    setAddClassVisible(false);
    try {
      await updateMyProfile({ classes: next });
    } catch (e) {
      console.error('Failed to save class', e);
    }
  };

  const removeClass = async (idx: number) => {
    const next = classes.filter((_, i) => i !== idx);
    setClasses(next);
    try {
      await updateMyProfile({ classes: next });
    } catch (e) {
      console.error('Failed to remove class', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.headerBg} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>
        <Text style={s.name}>{name}</Text>
        <Text style={s.email}>{email}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Preferences */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Preferences</Text>
            <TouchableOpacity onPress={addPref} style={s.addBtn}>
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          {prefs.length === 0 && (
            <Text style={s.emptyTxt}>No preferences yet — tap + to add one.</Text>
          )}
          {prefs.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => openEditPref(i)} style={s.prefRow}>
              <View style={s.bullet} />
              <Text style={s.prefText}>{p}</Text>
              <TouchableOpacity onPress={() => deletePref(i)}>
                <Ionicons name="close-circle-outline" size={18} color={C.textSec} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Schedule */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Schedule</Text>
            <TouchableOpacity
              onPress={() => router.push('/schedule')}
              style={s.addBtn}
            >
              <Ionicons name="pencil" size={14} color={C.white} />
            </TouchableOpacity>
          </View>
          {blocks.length === 0
            ? <Text style={s.emptyTxt}>No schedule yet — tap the edit button to add one.</Text>
            : <ScheduleGrid blocks={blocks} trimmed={trimmed} />
          }
        </View>

        {/* Classes */}
        <View style={[s.card, { marginBottom: 32 }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Classes</Text>
          </View>
          {classes.length === 0 && (
            <Text style={s.emptyTxt}>No classes yet — tap + to add one.</Text>
          )}
          <View style={s.chipWrap}>
            {classes.map((c, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipText}>{c}</Text>
                <TouchableOpacity onPress={() => removeClass(i)}>
                  <Ionicons name="close-circle" size={16} color={C.accentLt} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Edit preference modal */}
      <Modal visible={editPrefVisible} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <Text style={m.title}>Edit Preference</Text>
            <TextInput
              style={m.input}
              value={prefDraft}
              onChangeText={setPrefDraft}
              autoFocus
              multiline
              placeholder="e.g. Night owl, likes quiet spaces..."
            />
            <View style={m.row}>
              <TouchableOpacity style={m.cancel} onPress={() => setEditPrefVisible(false)}>
                <Text style={m.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.save} onPress={savePref}>
                <Text style={m.saveTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add class modal */}
      <Modal visible={addClassVisible} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <Text style={m.title}>Add Class</Text>
            <TextInput
              style={m.input}
              value={classDraft}
              onChangeText={setClassDraft}
              autoFocus
              placeholder="e.g. EECS 441"
              autoCapitalize="characters"
            />
            <View style={m.row}>
              <TouchableOpacity style={m.cancel} onPress={() => setAddClassVisible(false)}>
                <Text style={m.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.save} onPress={addClass}>
                <Text style={m.saveTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingTop: 8 },
  header: {
    backgroundColor: C.headerBg,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: C.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#90a4ae',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: C.white, fontSize: 28, fontWeight: '700' },
  name:  { color: C.white, fontSize: 20, fontWeight: '700' },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardTitle: { color: C.white, fontSize: 15, fontWeight: '700' },
  addBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  prefRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  bullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.accent, marginRight: 10,
  },
  prefText: { flex: 1, fontSize: 13, color: C.textPri },
  chipWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 12, gap: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderWidth: 1, borderColor: C.accentLt,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    gap: 6,
  },
  chipText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  emptyTxt: { color: C.textSec, fontSize: 13, padding: 14, fontStyle: 'italic' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  sheet: {
    width: '80%', backgroundColor: C.white,
    borderRadius: 14, padding: 20,
  },
  title: { fontSize: 16, fontWeight: '700', color: C.textPri, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 10, fontSize: 14,
    minHeight: 70, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  cancel: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelTxt: { color: C.textSec, fontSize: 14 },
  save: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  saveTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
});