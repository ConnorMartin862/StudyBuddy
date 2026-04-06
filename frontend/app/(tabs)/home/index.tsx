import { StyleSheet, FlatList, TouchableOpacity, Modal, View, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { getMyProfile, getAllClasses, updateMyProfile, createClass, enrollInClass, getEnrolledClasses, BASE_URL } from '@/utils/api';
import { useTheme } from '@/context/theme';

const CLASS_COLORS = ['#4A90D9', '#E07B53', '#5CB85C', '#9B59B6', '#E67E22', '#E74C3C'];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dark, colors } = useTheme();

  const [myClasses,    setMyClasses]    = useState<{ id: string; name: string; color: string }[]>([]);
  const [allClasses,   setAllClasses]   = useState<{ id: string; course_code: string; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [adding,       setAdding]       = useState(false);
  const [creating,     setCreating]     = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMyClasses();
    }, [])
  );

  const loadMyClasses = async () => {
    setLoading(true);
    try {
      const classes = await getEnrolledClasses();
      setMyClasses(classes.map((c: any, i: number) => ({
        id: c.id,  // real UUID now
        name: `${c.course_code}${c.name ? ' - ' + c.name : ''}`,
        color: CLASS_COLORS[i % CLASS_COLORS.length],
      })));
    } catch (e) {
      console.error('Failed to load classes', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setModalVisible(true);
    setSearch('');
    try {
      const classes = await getAllClasses();
      setAllClasses(classes);
    } catch (e) {
      console.error('Failed to load available classes', e);
    }
  };

  // Filter classes by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return allClasses;
    const q = search.toLowerCase();
    return allClasses.filter(
      c => c.course_code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [search, allClasses]);

  const addClassToProfile = async (label: string, classId?: string) => {
    if (myClasses.find(c => c.name === label)) {
      setModalVisible(false);
      return;
    }
    setAdding(true);
    try {
      const profile = await getMyProfile();
      const current = profile.classes ?? [];
      const updated = [...current, label];
      await updateMyProfile({ classes: updated });
      if (classId) {

        await enrollInClass(classId);

      }
      await loadMyClasses();
      setModalVisible(false);
      setSearch('');
    } catch (e) {
      console.error('Failed to add class', e);
    } finally {
      setAdding(false);
    }
  };

  // Create a brand new class in the database, then add to profile
const createAndAddClass = async () => {
  console.log('createAndAddClass called', search.trim());
  if (!search.trim()) return;
  setCreating(true);
  try {
    const newClass = await createClass(search.trim(), '');
    const classes = await getAllClasses();
    setAllClasses(classes);
     await addClassToProfile(search.trim(), newClass.id);
  } catch (e) {
    console.error('Failed to create class', e);
  } finally {
    setCreating(false);
  }
};

  return (
    <ThemedView style={[styles.container, { backgroundColor: dark ? '#121212' : '#4466c9' }]}>
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: insets.top }, , { backgroundColor: dark ? '#1565c0' : '#32a85e' }]}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <IconSymbol name="person.circle.fill" size={48} color='#fff' />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
          style={{ width: 60, height: 60 }}
        />
      </ThemedView>

      <ThemedText type="title" style={styles.title}>My Classes:</ThemedText>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={myClasses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText style={styles.empty}>No classes yet — tap + to add one.</ThemedText>
          }
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <ThemedText style={{ color: '#ffffff', fontSize: 28 }}>+</ThemedText>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.classCard, { 
                borderLeftColor: item.color,
                ...(dark && { shadowColor: '#ffffff', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 })
              }]}
              onPress={() => router.push({ pathname: '/home/class', params: { id: item.id, name: item.name } })}
            >
              <ThemedText type="subtitle" style={{ color: '#ffffff' }}>{item.name}</ThemedText>
              <IconSymbol name="chevron.right" size={20} color="#999" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add class modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <ThemedText type="title" style={m.title}>Add a Class</ThemedText>

            {/* Search bar */}
            <TextInput
              style={m.search}
              placeholder="Search or type a new class..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            {adding || creating ? (
              <ActivityIndicator color="#2e7d32" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 300 }}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={null}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={m.classRow}
                      onPress={() => addClassToProfile(`${item.course_code}${item.name ? ' - ' + item.name : ''}`, item.id)}
                    >
                      <View>
                        <ThemedText style={m.courseCode}>{item.course_code}</ThemedText>
                        {item.name ? <ThemedText style={m.courseName}>{item.name}</ThemedText> : null}
                      </View>
                      <IconSymbol name="plus.circle.fill" size={24} color="#2e7d32" />
                    </TouchableOpacity>
                  )}
                />

                <TouchableOpacity style={m.createRow} onPress={() => { setModalVisible(false); router.push('/create_class'); }}>
                  <ThemedText style={m.createTxt}>Create New Class</ThemedText>
                  <IconSymbol name="plus.circle.fill" size={24} color="#ffa000" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={m.cancelBtn} onPress={() => { setModalVisible(false); setSearch(''); }}>
              <ThemedText style={m.cancelTxt}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#4466c9',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#32a85e',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#32a85e',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 50,
  },
  list: {
    paddingHorizontal: 20,
  },
  classCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 5,
    backgroundColor: '#1c1c1e',
  },
  empty: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  search: {
    backgroundColor: '#2a2a2e',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 12,
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
  },
  courseCode: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  courseName: {
    color: '#aaaaaa',
    fontSize: 13,
    marginTop: 2,
  },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2e',
    marginTop: 8,
  },
  createTxt: {
    color: '#ffa000',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 16,
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelTxt: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});