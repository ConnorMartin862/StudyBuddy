import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Same data as home screen — later this comes from your API
const CLASSES: Record<string, string> = {
  '1': 'CS 101 - Intro to Computer Science',
  '2': 'MATH 201 - Linear Algebra',
  '3': 'PHYS 150 - Physics I',
  '4': 'ENG 102 - Academic Writing',
};

export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const className = CLASSES[id] || 'Unknown Class';

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ThemedText>← Back</ThemedText>
      </TouchableOpacity>
      <ThemedText type="title">{className}</ThemedText>
      <ThemedText>Class content will go here.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 20,
  },
});