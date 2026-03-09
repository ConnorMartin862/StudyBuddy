import { StyleSheet, FlatList, TouchableOpacity, Modal, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { getMyProfile, getAllClasses, updateMyProfile } from '@/utils/api';

const CLASS_COLORS = ['#4A90D9', '#E07B53', '#5CB85C', '#9B59B6', '#E67E22', '#E74C3C'];

export default function HomeScreen() {
  const router = useRouter();

  const [myClasses,     setMyClasses]     = useState<{ id: string; name: string; color: string }[]>([]);
  const [allClasses,    setAllClasses]    = useState<{ id: string; course_code: string; name: string }[]>([]);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [adding,        setAdding]        = useState(false);

  // Load user's enrolled classes whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadMyClasses();
    }, [])
  );

  const loadMyClasses = async () => {
    setLoading(true);
    try {
      const profile = await getMyProfile();
      const classes = (profile.classes ?? []).map((name: string, i: number) => ({
        id: String(i),
        name,
        color: CLASS_COLORS[i % CLASS_COLORS.length],
      }));
      setMyClasses(classes);
    } catch (e) {
      console.error('Failed to load classes', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setModalVisible(true);
    try {
      const classes = await getAllClasses();
      console.log('classes:', JSON.stringify(classes));
      setAllClasses(classes);
    } catch (e: any) {
      console.error('Failed to load classes:', JSON.stringify(e?.response?.data));
    }
  };

  const addClassToProfile = async (cls: { course_code: string; name: string }) => {
    const label = `${cls.course_code} - ${cls.name}`;
    // Don't add duplicates
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
      await loadMyClasses();
      setModalVisible(false);
    } catch (e) {
      console.error('Failed to add class', e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
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
              style={[styles.classCard, { borderLeftColor: item.color }]}
              onPress={() => router.push({ pathname: '/home/class', params: { id: item.id } })}
            >
              <ThemedText type="subtitle" style={{ color: '#ffffff' }}>{item.name}</ThemedText>
              <IconSymbol name="chevron.right" size={20} color="#999" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <ThemedText style={{ color: '#ffffff', fontSize: 28 }}>+</ThemedText>
      </TouchableOpacity> */}

      {/* Add class modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <ThemedText type="title" style={m.title}>Add a Class</ThemedText>
            {adding ? (
              <ActivityIndicator color="#2e7d32" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={allClasses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={m.classRow}
                    onPress={() => addClassToProfile(item)}
                  >
                    <View>
                      <ThemedText style={m.courseCode}>{item.course_code}</ThemedText>
                      <ThemedText style={m.courseName}>{item.name}</ThemedText>
                    </View>
                    <IconSymbol name="plus.circle.fill" size={24} color="#2e7d32" />
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={m.cancelBtn} onPress={() => setModalVisible(false)}>
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
    maxHeight: '70%',
  },
  title: {
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
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