import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Colour tokens (match your tab bar / home page) ──────────────────────────
const C = {
  headerBg: '#1565c0',   // deep blue header
  accent:   '#2e7d32',   // green (matches tab bar)
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

// ── Mock data ────────────────────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM – 9 PM

// Each block: { day (0-6), startHour, endHour, label, color }
const DEFAULT_BLOCKS = [
  { day: 1, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
  { day: 3, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
  { day: 1, startHour: 12, endHour: 13,   label: 'MATH 215', color: C.green },
  { day: 2, startHour: 14, endHour: 15.5, label: 'EECS 376', color: C.amber },
  { day: 4, startHour: 14, endHour: 15.5, label: 'EECS 376', color: C.amber },
  { day: 3, startHour: 11, endHour: 12,   label: 'MATH 215', color: C.green },
  { day: 5, startHour: 10, endHour: 11,   label: 'SI 339',   color: '#8e24aa' },
];

const DEFAULT_PREFS = [
  'Likes to do Homework Early',
  'Tends not to plan out problems.',
  'Night Owl',
];

const DEFAULT_CLASSES = ['EECS 441', 'EECS 376', 'MATH 215', 'SI 339'];

// ── Schedule grid ────────────────────────────────────────────────────────────
const CELL_H = 44;
const HOUR_RANGE = 14; // 8 AM to 10 PM

function ScheduleGrid({ blocks }: { blocks: typeof DEFAULT_BLOCKS }) {
  return (
    <View style={sg.wrapper}>
      {/* Day headers */}
      <View style={sg.headerRow}>
        <View style={sg.timeCol} />
        {DAYS.map(d => (
          <View key={d} style={sg.dayCol}>
            <Text style={sg.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid body */}
      <View style={sg.body}>
        {/* Hour labels */}
        <View style={sg.timeCol}>
          {HOURS.map(h => (
            <View key={h} style={[sg.hourCell]}>
              <Text style={sg.hourLabel}>
                {h <= 12 ? `${h}a` : `${h - 12}p`}
              </Text>
            </View>
          ))}
        </View>

        {/* Day columns with grid lines */}
        {DAYS.map((d, di) => (
          <View key={d} style={sg.dayCol}>
            {HOURS.map(h => (
              <View key={h} style={sg.gridCell} />
            ))}
            {/* Render blocks for this day */}
            {blocks
              .filter(b => b.day === di)
              .map((b, i) => {
                const top    = (b.startHour - 8) * CELL_H;
                const height = (b.endHour - b.startHour) * CELL_H - 2;
                return (
                  <View
                    key={i}
                    style={[sg.block, { top, height, backgroundColor: b.color }]}
                  >
                    <Text style={sg.blockText} numberOfLines={2}>{b.label}</Text>
                  </View>
                );
              })}
          </View>
        ))}
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  wrapper:    { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  headerRow:  { flexDirection: 'row', backgroundColor: C.headerBg },
  timeCol:    { width: 32 },
  dayCol:     { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  dayLabel:   { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  body:       { flexDirection: 'row', backgroundColor: C.card },
  hourCell:   { height: CELL_H, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 2 },
  hourLabel:  { fontSize: 8, color: C.textSec },
  gridCell:   { height: CELL_H, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  block: {
    position:     'absolute',
    left:         1,
    right:        1,
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingTop:   2,
    zIndex:       10,
  },
  blockText:  { color: C.white, fontSize: 8, fontWeight: '700' },
});

// ── Main profile screen ──────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [prefs,   setPrefs]   = useState(DEFAULT_PREFS);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [blocks]              = useState(DEFAULT_BLOCKS);

  // edit-preference modal
  const [editPrefVisible, setEditPrefVisible] = useState(false);
  const [editingPrefIdx,  setEditingPrefIdx]  = useState<number | null>(null);
  const [prefDraft,       setPrefDraft]       = useState('');

  const openEditPref = (idx: number) => {
    setEditingPrefIdx(idx);
    setPrefDraft(prefs[idx]);
    setEditPrefVisible(true);
  };
  const savePref = () => {
    if (editingPrefIdx === null) return;
    const next = [...prefs];
    next[editingPrefIdx] = prefDraft;
    setPrefs(next);
    setEditPrefVisible(false);
  };
  const addPref = () => {
    setPrefs(p => [...p, 'New preference']);
    openEditPref(prefs.length);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>C</Text>
          </View>
        </View>
        <Text style={s.name}>Connor Martin</Text>
        <Text style={s.email}>connormm@umich.edu</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Preferences card ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Preferences</Text>
            <TouchableOpacity onPress={addPref} style={s.addBtn}>
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          {prefs.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => openEditPref(i)} style={s.prefRow}>
              <View style={s.bullet} />
              <Text style={s.prefText}>{p}</Text>
              <Ionicons name="pencil-outline" size={14} color={C.textSec} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Schedule card ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Schedule</Text>
            <TouchableOpacity style={s.addBtn}>
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: 340 }}>
              <ScheduleGrid blocks={blocks} />
            </View>
          </ScrollView>
        </View>

        {/* ── Classes card ── */}
        <View style={[s.card, { marginBottom: 32 }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Classes</Text>
            <TouchableOpacity style={s.addBtn}>
              <Ionicons name="add" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          <View style={s.chipWrap}>
            {classes.map((c, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipText}>{c}</Text>
                <TouchableOpacity onPress={() => setClasses(cl => cl.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={16} color={C.accentLt} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Edit preference modal ── */}
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
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingTop: 8 },

  // Header
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

  // Cards
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

  // Preferences
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

  // Classes chips
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
});

// Modal styles
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