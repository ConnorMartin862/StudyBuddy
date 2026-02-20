import { StyleSheet, FlatList, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const PUSHED = [
  { id: 'p1', name: 'Alex Johnson' },
  { id: 'p2', name: 'Maria Garcia' },
  { id: 'p3', name: 'James Lee' },
];

const MATCHED = [
  { id: 'm1', name: 'Sarah Kim' },
  { id: 'm2', name: 'Tyler Brooks' },
];

export default function MatchesScreen() {
  const router = useRouter();

  const StudentCard = ({ id, name }: { id: string; name: string }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/student/${id}`)}
    >
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{name[0]}</ThemedText>
      </View>
      <ThemedText style={styles.name}>{name}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerText}>Matches</ThemedText>
      </View>

      {/* Pushed section */}
      <ThemedText type="subtitle" style={styles.sectionLabel}>Pushed</ThemedText>
      <FlatList
        data={PUSHED}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <StudentCard {...item} />}
      />

      {/* Matched section */}
      <ThemedText type="subtitle" style={styles.sectionLabel}>Matched</ThemedText>
      <FlatList
        data={MATCHED}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <StudentCard {...item} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4466c9',
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#32a85e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 10,
  },
  headerText: {
    color: '#ffffff',
  },
  sectionLabel: {
    color: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#32a85e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});