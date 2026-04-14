import React, { useState, useEffect, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
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
import { getMyProfile, updateMyProfile, getAllClasses, dropClass } from '@/utils/api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/context/theme';


const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  accentLt: '#43a047',
  white:    '#ffffff',
  red:      '#e53935',
  amber:    '#ffa000',
  green:    '#43a047',
};

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Block = { day: number; hour: number; color: 'red' | 'green' };

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const TRIM_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function ScheduleGrid({ blocks, trimmed, cardBg }: { blocks: Block[], trimmed: boolean, cardBg: string }) {
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
            <View style={[sg.body, { backgroundColor: cardBg }]}>
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
  wrapper:   { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a2a' },
  headerRow: { flexDirection: 'row', backgroundColor: C.headerBg },
  timeCol:   { width: 32 },
  dayCol:    { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  dayLabel:  { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  body:      { flexDirection: 'row', backgroundColor: '#1e1e1e' },
  hourCell:  { height: 20, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 2 },
  hourLabel: { fontSize: 7, color: '#aaaaaa' },
  gridCell:  { height: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
});

export default function ProfileScreen() {
  const { colors, dark } = useTheme();
  const [loading, setLoading]   = useState(true);
  const [name,    setName]      = useState('');
  const [email,   setEmail]     = useState('');
  const [prefs,   setPrefs]     = useState<string[]>([]);
  const [classes, setClasses]   = useState<string[]>([]);
  const [blocks,  setBlocks]    = useState<Block[]>([]);
  const [sleepPrefDB, setSleepPrefDB] = useState<string | null>(null);
  const [assignmentStyle,   setAssignmentStyle]   = useState<string | null>(null);
  const [campusFrequency,   setCampusFrequency]   = useState<string | null>(null);
  const [meetingPref,       setMeetingPref]       = useState<string | null>(null);
  const [livingSituation,   setLivingSituation]   = useState<string | null>(null);
  const [trimmed, setTrimmed] = useState(false);

  const router = useRouter();



  // Edit preference modal
  const [editPrefVisible, setEditPrefVisible] = useState(false);
  const [editingPrefIdx,  setEditingPrefIdx]  = useState<number | null>(null);
  const [prefDraft,       setPrefDraft]       = useState('');

  // Add class modal
  const [addClassVisible, setAddClassVisible] = useState(false);
  const [classDraft,      setClassDraft]      = useState('');
  const [sleepPref, setSleepPref] = useState<0 | 1 | 2>(1); // 0=morning, 1=neither, 2=night owl


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
      if (data.sleep_preference === 'morning') setSleepPref(0);
      else if (data.sleep_preference === 'night_owl') setSleepPref(2);
      else setSleepPref(1);
      setClasses(data.classes ?? []);
      setBlocks(data.schedule ?? []);
      setSleepPrefDB(data.sleep_preference ?? null);
      setAssignmentStyle(data.assignment_style ?? null);
      setCampusFrequency(data.campus_frequency ?? null);
      setMeetingPref(data.meeting_preference ?? null);
      setLivingSituation(data.living_situation ?? null);
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

  const saveStudyPref = async (field: string, value: string) => {
    try {
      await updateMyProfile({ [field]: value });
    } catch (e) {
      console.error('Failed to save study pref', e);
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
    const label = classes[idx];
    const next = classes.filter((_, i) => i !== idx);
    setClasses(next);
    try {
      await updateMyProfile({ classes: next });
      // Find the matching class in the DB and drop enrollment
      const allClasses = await getAllClasses();
      const match = allClasses.find((c: any) =>
        `${c.course_code} - ${c.name}` === label ||
        c.course_code === label ||
        c.name === label
      );
      if (match) await dropClass(match.id);
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

  const handleSleepPrefChange = async (val: 0 | 1 | 2) => {
    setSleepPref(val);
    const label = val === 0 ? 'morning' : val === 2 ? 'night_owl' : 'neither';
    setSleepPrefDB(label);
    console.log('Saving sleep_preference:', label);
    try {
      const result = await updateMyProfile({ sleep_preference: label });
      console.log('Save result:', JSON.stringify(result));
    } catch (e) {
      console.error('Save failed:', e);
    }
    const filtered = prefs.filter((p: string) =>
      p !== 'Morning Person' && p !== 'Night Owl' && p !== 'Mostly Normal Schedule'
    );
    await savePrefs(filtered);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
          style={{ width: 60, height: 60 }}
        />
      </View>
      <View style={[s.header_two, { backgroundColor: dark ? '#121212' : C.headerBg }]}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>
        <Text style={s.name}>{name}</Text>
        <Text style={s.email}>{email}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Sleep Preference Slider */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Sleep Schedule</Text>
          </View>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textSec }}>Morning Person</Text>
              <Text style={{ fontSize: 12, color: colors.textSec }}>Night Owl</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[0, 1, 2].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => handleSleepPrefChange(val as 0 | 1 | 2)}
                  style={{
                    flex: 1,
                    marginHorizontal: 4,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: sleepPref === val ? C.accent : colors.border,
                  }}
                >
                  <Text style={{
                    color: sleepPref === val ? C.white : colors.textSec,
                    fontSize: 12,
                    fontWeight: sleepPref === val ? '700' : '400'
                  }}>
                    {val === 0 ? '🌅 Morning' : val === 1 ? '😐 Neither' : '🌙 Night Owl'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Assignment Style */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>When do you do assignments?</Text>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { val: 'first_thing', label: '⚡ Right Away' },
              { val: 'middle',      label: '😐 Middle' },
              { val: 'procrastinate', label: '😅 Last Min' },
            ].map(({ val, label }) => (
              <TouchableOpacity
                key={val}
                onPress={() => { setAssignmentStyle(val); saveStudyPref('assignment_style', val); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                  backgroundColor: assignmentStyle === val ? C.accent : colors.border,
                }}
              >
                <Text style={{ color: assignmentStyle === val ? C.white : colors.textSec, fontSize: 11, fontWeight: assignmentStyle === val ? '700' : '400', textAlign: 'center' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Campus Frequency */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>How often are you on campus?</Text>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { val: 'always',       label: '🏫 Always' },
              { val: 'classes_only', label: '📚 Classes Only' },
              { val: 'rarely',       label: '🏠 Rarely' },
            ].map(({ val, label }) => (
              <TouchableOpacity
                key={val}
                onPress={() => { setCampusFrequency(val); saveStudyPref('campus_frequency', val); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                  backgroundColor: campusFrequency === val ? C.accent : colors.border,
                }}
              >
                <Text style={{ color: campusFrequency === val ? C.white : colors.textSec, fontSize: 11, fontWeight: campusFrequency === val ? '700' : '400', textAlign: 'center' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meeting Preference */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>How do you prefer to meet?</Text>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { val: 'in_person', label: '🤝 In Person' },
              { val: 'both',      label: '🔄 Both' },
              { val: 'online',    label: '💻 Online' },
            ].map(({ val, label }) => (
              <TouchableOpacity
                key={val}
                onPress={() => { setMeetingPref(val); saveStudyPref('meeting_preference', val); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                  backgroundColor: meetingPref === val ? C.accent : colors.border,
                }}
              >
                <Text style={{ color: meetingPref === val ? C.white : colors.textSec, fontSize: 11, fontWeight: meetingPref === val ? '700' : '400', textAlign: 'center' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Living Situation */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Where do you live? (Non UMich Students Press Central for on Campus)</Text>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { val: 'off_campus',        label: '🏠 Off Campus' },
              { val: 'on_campus_central', label: '🏙️ Central' },
              { val: 'on_campus_north',   label: '🌲 North' },
            ].map(({ val, label }) => (
              <TouchableOpacity
                key={val}
                onPress={() => { setLivingSituation(val); saveStudyPref('living_situation', val); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                  backgroundColor: livingSituation === val ? C.accent : colors.border,
                }}
              >
                <Text style={{ color: livingSituation === val ? C.white : colors.textSec, fontSize: 11, fontWeight: livingSituation === val ? '700' : '400', textAlign: 'center' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Other Preferences</Text>
            <TouchableOpacity onPress={addPref} style={s.addBtn}>
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          {prefs.length === 0 && (
            <Text style={[s.emptyTxt, { color: colors.textSec }]}>No preferences yet — tap + to add one.</Text>
          )}
          {prefs.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => openEditPref(i)} style={[s.prefRow, { borderBottomColor: colors.border }]}>
              <View style={s.bullet} />
              <Text style={[s.prefText, { color: colors.textPri }]}>{p}</Text>
              <TouchableOpacity onPress={() => deletePref(i)}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textSec} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Schedule */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Schedule</Text>
            <TouchableOpacity onPress={() => router.push('/schedule')} style={s.addBtn}>
              <Ionicons name="pencil" size={14} color={C.white} />
            </TouchableOpacity>
          </View>
          {blocks.length === 0
            ? <Text style={[s.emptyTxt, { color: colors.textSec }]}>No schedule yet — tap the edit button to add one.</Text>
            : <ScheduleGrid blocks={blocks} trimmed={trimmed} cardBg={colors.card} />
          }
        </View>

        {/* Classes */}
        <View style={[s.card, { backgroundColor: colors.card, borderWidth: dark ? 1 : 0, borderColor: dark ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Classes</Text>
          </View>
          {classes.length === 0 && (
            <Text style={[s.emptyTxt, { color: colors.textSec }]}>No classes yet — tap + to add one.</Text>
          )}
          <View style={s.chipWrap}>
            {classes.map((c, i) => (
              <View key={i} style={[s.chip, { borderColor: colors.border }]}>
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
          <View style={[m.sheet, { backgroundColor: colors.card }]}>
            <Text style={[m.title, { color: colors.textPri }]}>Edit Preference</Text>
            <TextInput
              style={[m.input, { backgroundColor: colors.input, color: colors.inputTxt, borderColor: colors.border }]}
              value={prefDraft}
              onChangeText={setPrefDraft}
              autoFocus
              multiline
              placeholderTextColor={colors.textSec}
              placeholder="e.g. Night owl, likes quiet spaces..."
            />
            <View style={m.row}>
              <TouchableOpacity style={m.cancel} onPress={() => setEditPrefVisible(false)}>
                <Text style={[m.cancelTxt, { color: colors.textSec }]}>Cancel</Text>
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
          <View style={[m.sheet, { backgroundColor: colors.card }]}>
            <Text style={[m.title, { color: colors.textPri }]}>Add Class</Text>
            <TextInput
              style={[m.input, { backgroundColor: colors.input, color: colors.inputTxt, borderColor: colors.border }]}
              value={classDraft}
              onChangeText={setClassDraft}
              autoFocus
              placeholder="e.g. EECS 441"
              placeholderTextColor={colors.textSec}
              autoCapitalize="characters"
            />
            <View style={m.row}>
              <TouchableOpacity style={m.cancel} onPress={() => setAddClassVisible(false)}>
                <Text style={[m.cancelTxt, { color: colors.textSec }]}>Cancel</Text>
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
  safe:   { flex: 1 },
  scroll: { padding: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#32a85e',
    marginBottom: 20,
  },
  header_two: {
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
    borderBottomWidth: 1,
  },
  bullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.accent, marginRight: 10,
  },
  prefText: { flex: 1, fontSize: 13 },
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
  emptyTxt: { fontSize: 13, padding: 14, fontStyle: 'italic' },
  backBtn: { paddingRight: 10 },
  backTxt: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  sheet: {
    width: '80%',
    borderRadius: 14, padding: 20,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8, padding: 10, fontSize: 14,
    minHeight: 70, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  cancel: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelTxt: { fontSize: 14 },
  save: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  saveTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
});