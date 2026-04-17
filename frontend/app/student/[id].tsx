import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth';
import { getPushStatus, pushStudent, unpushStudent, getCompatibility, getMyProfile } from '@/utils/api';
// ── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  headerBg: '#1565c0',
  accent: '#2e7d32',
  accentLt: '#43a047',
  white: '#ffffff',
  bg: '#4466c9',
  card: '#1c1c1e',
  border: '#2a2a2e',
  textPri: '#ffffff',
  textSec: '#aaaaaa',
  red: '#e53935',
  amber: '#ffa000',
  green: '#43a047',
};

const BASE_URL = "https://studybuddy-production-b48d.up.railway.app";

  //Platform.OS === 'web'
  //  ? 'http://localhost:3000'
  //  : 'https://joseph-unneeded-straitly.ngrok-free.dev';

type ScheduleCell = {
  day: number;
  hour: number;
  color: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  preferences?: string[];
  classes?: string[];
  schedule?: ScheduleCell[];
  assignment_style?: string | null;
  campus_frequency?: string | null;
  meeting_preference?: string | null;
  living_situation?: string | null;
  sleep_preference?: string | null;
};

const FALLBACK: Student = {
  id: '',
  name: 'Unknown Student',
  email: 'unknown@umich.edu',
  preferences: [],
  classes: [],
  schedule: [],
};

// ── Schedule grid ────────────────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CELL_H = 28;

function formatHour(hour: number) {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function ScheduleGrid({ blocks }: { blocks: ScheduleCell[] }) {
  const cellMap = new Map(blocks.map((b) => [`${b.day}-${b.hour}`, b.color]));
  const { width } = useWindowDimensions();

  return (
    <View style={{ width: width}}>
      <View style={sg.wrapper}>
        <View style={sg.headerRow}>
          <View style={sg.timeCol} />
          {DAYS.map((d) => (
            <View key={d} style={sg.dayCol}>
              <Text style={sg.dayLabel}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={sg.body}>
          <View style={sg.timeCol}>
            {HOURS.map((h) => (
              <View key={h} style={sg.hourCell}>
                <Text style={sg.hourLabel}>{formatHour(h)}</Text>
              </View>
            ))}
          </View>

          {DAYS.map((d, di) => (
            <View key={d} style={sg.dayCol}>
              {HOURS.map((h) => {
                const color = cellMap.get(`${di}-${h}`);

                return (
                  <View
                    key={h}
                    style={[
                      sg.gridCell,
                      color === 'red' && { backgroundColor: C.red },
                      color === 'green' && { backgroundColor: C.green },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'unmatched' | 'pushed' | 'matched'>('unmatched');
  const [pushLoading, setPushLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [combinedBlocks, setCombinedBlocks] = useState<ScheduleCell[]>([]);


  const handlePush = async () => {
    setPushLoading(true);
    try {
      if (pushStatus === 'unmatched') {
        await pushStudent(id);
        setPushStatus('pushed');
      } else if (pushStatus === 'pushed') {
        await unpushStudent(id);
        setPushStatus('unmatched');
      }
    } catch (e) {
      console.error('Failed to push', e);
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    async function fetchStudent() {
      if (!id || !token) {
        setError('Missing user id or auth token.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${BASE_URL}/users/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load student.');
        }

        setStudent({
          id: data.id,
          name: data.name,
          email: data.email,
          preferences: Array.isArray(data.preferences) ? data.preferences : [],
          classes: Array.isArray(data.classes) ? data.classes : [],
          schedule: Array.isArray(data.schedule) ? data.schedule : [],
          assignment_style: data.assignment_style ?? null,
          campus_frequency: data.campus_frequency ?? null,
          meeting_preference: data.meeting_preference ?? null,
          living_situation: data.living_situation ?? null,
          sleep_preference: data.sleep_preference ?? null,
        });

        const statusRes = await getPushStatus(id);
        setPushStatus(statusRes.status);

        const compatData = await getCompatibility();
        const match = compatData.find((c: any) => c.user_b_id === id);
        setScore(match ? Math.round(match.score * 100) : null);
        const me = await getMyProfile();
        const myBlocks: ScheduleCell[] = me.schedule ?? [];
        const theirBlocks: ScheduleCell[] = Array.isArray(data.schedule) ? data.schedule : [];

        const combined: ScheduleCell[] = [];

        // Green only where both are green
        theirBlocks.forEach(b => {
          if (b.color === 'green') {
            const iAlsoGreen = myBlocks.some(m => m.day === b.day && m.hour === b.hour && m.color === 'green');
            if (iAlsoGreen) combined.push({ day: b.day, hour: b.hour, color: 'green' });
          }
        });

        // Red where either has red
        const allBlocks = [...myBlocks, ...theirBlocks];
        allBlocks.forEach(b => {
          if (b.color === 'red') {
            const alreadyAdded = combined.some(c => c.day === b.day && c.hour === b.hour);
            if (!alreadyAdded) combined.push({ day: b.day, hour: b.hour, color: 'red' });
          }
        });

        setCombinedBlocks(combined);
      } catch (err: any) {
        setError(err.message || 'Something went wrong.');
        setStudent(FALLBACK);
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [id, token]);

  if (loading) {
    return (
      <SafeAreaView style={s.safeCenter}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={s.statusText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error && !student) {
    return (
      <SafeAreaView style={s.safeCenter}>
        <Text style={s.statusText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const currentStudent = student ?? FALLBACK;
  const prefs = currentStudent.preferences ?? [];
  const classes = currentStudent.classes ?? [];
  const blocks = currentStudent.schedule ?? [];
  const STUDY_PREF_LABELS: Record<string, string> = {
    first_thing: '⚡ Right Away',
    middle: '😐 Middle',
    procrastinate: '😅 Last Minute',
    always: '🏫 Always on Campus',
    classes_only: '📚 Classes Only',
    rarely: '🏠 Rarely on Campus',
    in_person: '🤝 In Person',
    both: '🔄 In Person & Online',
    online: '💻 Online',
    on_campus: '🏠 On Campus',
    off_campus: '🏙️ Off Campus',
    on_campus_central: '🏙️ Central Campus Area',
    on_campus_north: '🌲 North Campus Area',
    morning: '🌅 Morning Person',
    neither: '😐 Neither',
    night_owl: '🌙 Night Owl',
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarInitial}>
              {currentStudent.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        </View>
        <Text style={s.name}>{currentStudent.name}</Text>
        <Text style={s.email}>{currentStudent.email}</Text>

        {score !== null && (
          <Text style={s.scoreText}>{score}% Match</Text>
        )}

        {pushLoading ? (
          <ActivityIndicator color={C.white} style={{ marginTop: 12 }} />
        ) : pushStatus === 'matched' ? (
          <View style={s.matchedBtn}>
            <Text style={s.matchedTxt}>✓ Matched</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={pushStatus === 'pushed' ? s.pushedBtn : s.matchBtn}
            onPress={handlePush}
          >
            <Text style={s.matchBtnTxt}>
              {pushStatus === 'pushed' ? 'Pending — Undo' : 'Match'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Preferences</Text>
          </View>

          {/* Structured study preferences */}
          {[
            { label: 'Sleep Schedule', value: currentStudent.sleep_preference },
            { label: 'Assignments', value: currentStudent.assignment_style },
            { label: 'On Campus', value: currentStudent.campus_frequency },
            { label: 'Meeting', value: currentStudent.meeting_preference },
            { label: 'Lives', value: currentStudent.living_situation },
          ].filter(item => item.value).map(({ label, value }) => (
            <View key={label} style={s.prefRow}>
              <View style={s.bullet} />
              <Text style={[s.prefText, { color: C.textSec, flex: 0, marginRight: 8 }]}>{label}:</Text>
              <Text style={s.prefText}>{STUDY_PREF_LABELS[value!] ?? value}</Text>
            </View>
          ))}

          {/* Free text preferences */}
          {prefs.length > 0 && prefs.map((p, i) => (
            <View key={i} style={s.prefRow}>
              <View style={s.bullet} />
              <Text style={s.prefText}>{p}</Text>
            </View>
          ))}

          {!currentStudent.sleep_preference && !currentStudent.assignment_style && prefs.length === 0 && (
            <Text style={s.empty}>No preferences listed.</Text>
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Schedule</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
            <ScheduleGrid blocks={combinedBlocks} />
          </ScrollView>
        </View>

        <View style={[s.card, { marginBottom: 32 }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Classes</Text>
          </View>
          <View style={s.chipWrap}>
            {classes.length === 0 ? (
              <Text style={s.empty}>No classes listed.</Text>
            ) : (
              classes.map((c, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipText}>{c}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sg = StyleSheet.create({
  wrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 340,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: C.headerBg,
  },
  timeCol: {
    width: 40,
  },
  dayCol: {
    flex: 1,
    minWidth: 42,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
  },
  dayLabel: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  body: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
  },
  hourCell: {
    height: CELL_H,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingTop: 2,
  },
  hourLabel: {
    fontSize: 8,
    color: C.textSec,
  },
  gridCell: {
    height: CELL_H,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
    borderRightWidth: 1,
    borderRightColor: '#2a2a2e',
    backgroundColor: '#1c1c1e',
  },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  safeCenter: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: C.white,
    marginTop: 12,
    fontSize: 14,
  },
  scroll: { padding: 16, paddingTop: 8 },

  header: {
    backgroundColor: C.headerBg,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#90a4ae',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: C.white, fontSize: 28, fontWeight: '700' },
  name: { color: C.white, fontSize: 20, fontWeight: '700' },
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginRight: 10,
  },
  prefText: { flex: 1, fontSize: 13, color: C.textPri },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#2a2a2e',
    borderWidth: 1,
    borderColor: C.accentLt,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  matchBtn: {
    marginTop: 12,
    backgroundColor: C.accent,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pushedBtn: {
    marginTop: 12,
    backgroundColor: C.amber,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  matchedBtn: {
    marginTop: 12,
    backgroundColor: '#1b5e20',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  matchBtnTxt: { color: C.white, fontWeight: '700', fontSize: 15 },
  matchedTxt: { color: C.white, fontWeight: '700', fontSize: 15 },
  scoreText: { color: '#43a047', fontSize: 15, fontWeight: '700', marginTop: 4 },
  chipText: { color: C.accentLt, fontSize: 13, fontWeight: '600' },

  empty: { color: C.textSec, padding: 14, fontSize: 13 },
});
