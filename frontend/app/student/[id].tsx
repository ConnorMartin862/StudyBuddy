import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// ── Colour tokens (matches app style) ───────────────────────────────────────
const C = {
  headerBg: '#1565c0',
  accent:   '#2e7d32',
  accentLt: '#43a047',
  white:    '#ffffff',
  bg:       '#4466c9',
  card:     '#1c1c1e',
  border:   '#2a2a2e',
  textPri:  '#ffffff',
  textSec:  '#aaaaaa',
  red:      '#e53935',
  amber:    '#ffa000',
  green:    '#43a047',
};

// ── Mock data (replace with API call using `id` later) ───────────────────────
const MOCK_STUDENTS: Record<string, {
  name: string;
  email: string;
  prefs: string[];
  blocks: { day: number; startHour: number; endHour: number; label: string; color: string }[];
  classes: string[];
}> = {
  p1: {
    name: 'Alex Johnson',
    email: 'alexj@umich.edu',
    prefs: ['Early bird', 'Prefers quiet study spaces', 'Works best solo then reviews with group'],
    classes: ['EECS 441', 'MATH 215', 'SI 206'],
    blocks: [
      { day: 1, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
      { day: 3, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
      { day: 2, startHour: 11, endHour: 12,   label: 'MATH 215', color: C.green },
      { day: 4, startHour: 13, endHour: 14.5, label: 'SI 206',   color: C.amber },
    ],
  },
  p2: {
    name: 'Maria Garcia',
    email: 'mariag@umich.edu',
    prefs: ['Night owl', 'Likes to talk through problems', 'Prefers library'],
    classes: ['EECS 376', 'MATH 215', 'EECS 281'],
    blocks: [
      { day: 1, startHour: 14, endHour: 15.5, label: 'EECS 376', color: C.red },
      { day: 3, startHour: 14, endHour: 15.5, label: 'EECS 376', color: C.red },
      { day: 2, startHour: 10, endHour: 11,   label: 'MATH 215', color: C.green },
    ],
  },
  p3: {
    name: 'James Lee',
    email: 'jameslee@umich.edu',
    prefs: ['Flexible schedule', 'Prefers working in groups', 'Does homework day-of'],
    classes: ['EECS 441', 'EECS 281', 'SI 339'],
    blocks: [
      { day: 1, startHour: 10, endHour: 11.5, label: 'EECS 441', color: C.red },
      { day: 4, startHour: 9,  endHour: 10,   label: 'SI 339',   color: '#8e24aa' },
    ],
  },
  m1: {
    name: 'Sarah Kim',
    email: 'sarahk@umich.edu',
    prefs: ['Morning person', 'Likes to outline before coding', 'Prefers coffee shops'],
    classes: ['EECS 441', 'MATH 216', 'SI 206'],
    blocks: [
      { day: 2, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
      { day: 4, startHour: 9,  endHour: 10.5, label: 'EECS 441', color: C.red },
      { day: 1, startHour: 13, endHour: 14,   label: 'MATH 216', color: C.green },
    ],
  },
  m2: {
    name: 'Tyler Brooks',
    email: 'tylerb@umich.edu',
    prefs: ['Afternoon studier', 'Tends to procrastinate', 'Works well under pressure'],
    classes: ['EECS 376', 'EECS 441', 'MATH 215'],
    blocks: [
      { day: 1, startHour: 15, endHour: 16.5, label: 'EECS 376', color: C.red },
      { day: 3, startHour: 15, endHour: 16.5, label: 'EECS 376', color: C.red },
      { day: 5, startHour: 11, endHour: 12,   label: 'MATH 215', color: C.green },
    ],
  },
};

const FALLBACK = {
  name: 'Unknown Student',
  email: 'unknown@umich.edu',
  prefs: [],
  classes: [],
  blocks: [],
};

// ── Schedule grid (read-only) ────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const CELL_H = 44;

function ScheduleGrid({ blocks }: { blocks: typeof MOCK_STUDENTS['p1']['blocks'] }) {
  return (
    <View style={sg.wrapper}>
      <View style={sg.headerRow}>
        <View style={sg.timeCol} />
        {DAYS.map(d => (
          <View key={d} style={sg.dayCol}>
            <Text style={sg.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={sg.body}>
        <View style={sg.timeCol}>
          {HOURS.map(h => (
            <View key={h} style={sg.hourCell}>
              <Text style={sg.hourLabel}>{h <= 12 ? `${h}a` : `${h - 12}p`}</Text>
            </View>
          ))}
        </View>
        {DAYS.map((d, di) => (
          <View key={d} style={sg.dayCol}>
            {HOURS.map(h => <View key={h} style={sg.gridCell} />)}
            {blocks
              .filter(b => b.day === di)
              .map((b, i) => {
                const top    = (b.startHour - 8) * CELL_H;
                const height = (b.endHour - b.startHour) * CELL_H - 2;
                return (
                  <View key={i} style={[sg.block, { top, height, backgroundColor: b.color }]}>
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
  wrapper:   { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  headerRow: { flexDirection: 'row', backgroundColor: C.headerBg },
  timeCol:   { width: 32 },
  dayCol:    { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  dayLabel:  { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  body:      { flexDirection: 'row', backgroundColor: '#1c1c1e' },
  hourCell:  { height: CELL_H, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 2 },
  hourLabel: { fontSize: 8, color: C.textSec },
  gridCell:  { height: CELL_H, borderBottomWidth: 1, borderBottomColor: '#2a2a2e' },
  block: {
    position: 'absolute', left: 1, right: 1,
    borderRadius: 4, paddingHorizontal: 2, paddingTop: 2, zIndex: 10,
  },
  blockText: { color: C.white, fontSize: 8, fontWeight: '700' },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = MOCK_STUDENTS[id as string] ?? FALLBACK;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>{student.name[0]}</Text>
          </View>
        </View>
        <Text style={s.name}>{student.name}</Text>
        <Text style={s.email}>{student.email}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Preferences */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Preferences</Text>
          </View>
          {student.prefs.length === 0
            ? <Text style={s.empty}>No preferences listed.</Text>
            : student.prefs.map((p, i) => (
              <View key={i} style={s.prefRow}>
                <View style={s.bullet} />
                <Text style={s.prefText}>{p}</Text>
              </View>
            ))
          }
        </View>

        {/* Schedule */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Schedule</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10 }}>
            <View style={{ width: 340 }}>
              <ScheduleGrid blocks={student.blocks} />
            </View>
          </ScrollView>
        </View>

        {/* Classes */}
        <View style={[s.card, { marginBottom: 32 }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Classes</Text>
          </View>
          <View style={s.chipWrap}>
            {student.classes.map((c, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
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
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    backgroundColor: C.headerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardTitle: { color: C.white, fontSize: 15, fontWeight: '700' },

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
    backgroundColor: '#2a2a2e',
    borderWidth: 1, borderColor: C.accentLt,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { color: C.accentLt, fontSize: 13, fontWeight: '600' },

  empty: { color: C.textSec, padding: 14, fontSize: 13 },
});