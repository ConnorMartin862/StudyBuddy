import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getMyProfile, updateMyProfile } from '@/utils/api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const saveTrim = async (val: boolean) => {
  if (Platform.OS === 'web') localStorage.setItem('scheduleTrim', String(val));
  else await SecureStore.setItemAsync('scheduleTrim', String(val));
};

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
  green:    '#43a047',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const TRIM_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

type Block = { day: number; hour: number; color: 'red' | 'green' };
type Tool  = 'red' | 'green' | 'erase';

function hourLabel(h: number) {
  if (h === 0)  return '12a';
  if (h < 12)   return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [loading,  setLoading]  = useState(true);
  const [blocks,   setBlocks]   = useState<Block[]>([]);
  const [original, setOriginal] = useState<Block[]>([]);
  const [tool,     setTool]     = useState<Tool>('green');
  const [trimmed,  setTrimmed]  = useState(false);

  const blocksRef = React.useRef<Block[]>([]);

  const hours = trimmed ? TRIM_HOURS : ALL_HOURS;
  const cellHeight = 28;
  const timeColWidth = 32;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const data = await getMyProfile();
          const saved = data.schedule ?? [];
          setBlocks(saved);
          setOriginal(saved);
        } catch (e) {
          console.error('Failed to load schedule', e);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  const handleCellPress = (day: number, hour: number) => {
    const prev = blocksRef.current;
    const exists = prev.find(b => b.day === day && b.hour === hour);
    let next;
    if (tool === 'erase') {
        next = prev.filter(b => !(b.day === day && b.hour === hour));
    } else {
        next = [...prev.filter(b => !(b.day === day && b.hour === hour)), { day, hour, color: tool }];
    }
    blocksRef.current = next;
  };

  const getCellFromPosition = (x: number, y: number) => {
    const col = x - timeColWidth;
    if (col < 0) return null;
    const dayWidth = (width - timeColWidth) / 7;
    const day = Math.floor(col / dayWidth);
    const hourIndex = Math.floor(y / cellHeight);
    const hour = hours[hourIndex];
    if (day < 0 || day > 6 || hour === undefined) return null;
    return { day, hour };
  };

  const gridY = React.useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      blocksRef.current = [...blocks];
      const { pageX, pageY } = e.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY - gridY.current);
      if (cell) handleCellPress(cell.day, cell.hour);
    },
    onPanResponderMove: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      const cell = getCellFromPosition(pageX, pageY - gridY.current);
      if (cell) handleCellPress(cell.day, cell.hour);
    },
    onPanResponderRelease: () => {
      setBlocks([...blocksRef.current]);
    },
  });

  const handleSave = async () => {
    try {
      await updateMyProfile({ schedule: blocks });
      router.back();
    } catch (e) {
      console.error('Failed to save schedule', e);
    }
  };



  const handleCancel = () => {
    setBlocks(original);
    router.back();
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

      {/* Top toolbar */}
      <View style={s.toolbar}>
        <View style={s.toolGroup}>
          {(['green', 'red', 'erase'] as Tool[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTool(t)}
              style={[s.toolBtn, tool === t && s.toolBtnActive]}
            >
              {t === 'erase'
                ? <Ionicons name="close-circle-outline" size={20} color={tool === t ? C.white : 'rgba(255,255,255,0.8)'} />
                : <View style={[s.colorDot, { backgroundColor: t === 'green' ? C.green : C.red }]} />
              }
              <Text style={[s.toolLabel, tool === t && { color: C.white }]}>
                {t === 'erase' ? 'Erase' : t === 'green' ? 'Free' : 'Busy'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => {
          const next = !trimmed;
          setTrimmed(next);
          saveTrim(next);
        }} style={s.trimBtn}>
          <Text style={s.trimTxt}>{trimmed ? '24h' : 'Trim'}</Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ width }}>
          {/* Day headers */}
          <View style={sg.headerRow}>
            <View style={sg.timeCol} />
            {DAYS.map(d => (
              <View key={d} style={sg.dayCol}>
                <Text style={sg.dayLabel}>{d}</Text>
              </View>
            ))}
          </View>
          {/* Body with pan responder */}
          <View
              style={sg.body}
              {...panResponder.panHandlers}
              onLayout={(e) => {
                e.target.measure((_x, _y, _w, _h, _px, py) => {
                  gridY.current = py;
                });
              }}
            >
            <View style={sg.timeCol}>
              {hours.map(h => (
                <View key={h} style={sg.hourCell}>
                  <Text style={sg.hourLabel}>{hourLabel(h)}</Text>
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
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveTxt}>Save</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  toolbar:  {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  toolGroup:     { flexDirection: 'row', gap: 8 },
  toolBtn:       {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  toolBtnActive: { backgroundColor: C.accent },
  colorDot:      { width: 14, height: 14, borderRadius: 7 },
  toolLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  trimBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.white,
  },
  trimTxt:  { color: C.white, fontSize: 12, fontWeight: '700' },
  footer:   {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  cancelTxt: { color: C.textSec, fontSize: 15, fontWeight: '600' },
  saveBtn:   {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: C.accent, alignItems: 'center',
  },
  saveTxt:   { color: C.white, fontSize: 15, fontWeight: '700' },
});

const sg = StyleSheet.create({
  headerRow: { flexDirection: 'row', backgroundColor: C.headerBg },
  timeCol:   { width: 32 },
  dayCol:    { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  dayLabel:  { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  body:      { flexDirection: 'row', backgroundColor: C.card },
  hourCell:  { height: 28, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 2 },
  hourLabel: { fontSize: 7, color: C.textSec },
  gridCell:  { height: 28, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
});