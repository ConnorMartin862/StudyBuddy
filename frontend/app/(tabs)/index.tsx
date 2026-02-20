import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';

// Hardcoded placeholder classes — replace with API data later
const CLASSES = [
  { id: '1', name: 'CS 101 - Intro to Computer Science', color: '#4A90D9' },
  { id: '2', name: 'MATH 201 - Linear Algebra', color: '#E07B53' },
  { id: '3', name: 'PHYS 150 - Physics I', color: '#5CB85C' },
  { id: '4', name: 'ENG 102 - Academic Writing', color: '#9B59B6' },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      {/* Header with profile button */}
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

      {/* Class list */}
      <FlatList
        data={CLASSES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.classCard, { borderLeftColor: item.color }]}
            onPress={() => router.push(`/class/${item.id}`)}
          >
            <ThemedText type="subtitle" style={{ color: '#ffffff' }}>{item.name}</ThemedText>
            <IconSymbol name="chevron.right" size={20} color="#999" />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.addButton}>
        <ThemedText style={{ color: '#ffffff', fontSize: 28 }}>+</ThemedText>
      </TouchableOpacity>
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
});