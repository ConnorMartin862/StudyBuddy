import { StyleSheet, FlatList, TouchableOpacity, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Hardcoded class data — replace with API later
const CLASS_DATA: Record<string, { name: string; color: string }> = {
  '1': { name: 'CS 101 - Intro to Computer Science', color: '#4A90D9' },
  '2': { name: 'MATH 201 - Linear Algebra', color: '#E07B53' },
  '3': { name: 'PHYS 150 - Physics I', color: '#5CB85C' },
  '4': { name: 'ENG 102 - Academic Writing', color: '#9B59B6' },
};

// Hardcoded members — matches shown first
const MEMBERS = [
  { id: '1', name: 'Alice Johnson', matched: true },
  { id: '2', name: 'Bob Smith', matched: true },
  { id: '3', name: 'Charlie Davis', matched: false },
  { id: '4', name: 'Dana Lee', matched: false },
  { id: '5', name: 'Eli Brooks', matched: false },
  { id: '6', name: 'Fiona Clark', matched: false },
];

// Hardcoded threads
const THREADS = [
  { id: '1', title: 'Study group for midterm?', author: 'Alice Johnson', replies: 5 },
  { id: '2', title: 'Homework 3 question', author: 'Charlie Davis', replies: 2 },
  { id: '3', title: 'Best resources for this class', author: 'Bob Smith', replies: 8 },
];

export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const classInfo = CLASS_DATA[id] || { name: 'Unknown Class', color: '#999' };

  // Sort members so matches appear first
  const sortedMembers = [...MEMBERS].sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0));

  return (
    <ThemedView style={styles.container}>
      {/* Top bar */}
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <IconSymbol name="person.circle.fill" size={48} color="#fff" />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/Buddy_the_dolphin_transparent.png')}
          style={{ width: 60, height: 60 }}
        />
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Class title */}
        <ThemedText type="title" style={styles.title}>{classInfo.name}</ThemedText>

        {/* Members section */}
        <ThemedText style={styles.sectionHeader}>Members</ThemedText>
        {sortedMembers.map((item) => (
          <View key={item.id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <View style={[styles.memberAvatar, item.matched && styles.matchedAvatar]}>
                <ThemedText style={styles.avatarText}>
                  {item.name.charAt(0)}
                </ThemedText>
              </View>
              <ThemedText style={styles.memberName}>{item.name}</ThemedText>
            </View>
            {item.matched && (
              <View style={styles.matchBadge}>
                <ThemedText style={styles.matchBadgeText}>Match</ThemedText>
              </View>
            )}
          </View>
        ))}

        {/* Threads section */}
        <ThemedText style={styles.sectionHeader}>Threads</ThemedText>
        {THREADS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.threadRow}>
            <View>
              <ThemedText style={styles.threadTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.threadMeta}>
                {item.author} · {item.replies} replies
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#999" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addThreadButton}>
          <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
            + New Thread
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#4466c9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#32a85e',
  },
  scroll: {
    paddingBottom: 30,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 20,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
  },
  list: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  matchedAvatar: {
    backgroundColor: '#32a85e',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    color: '#ffffff',
    fontSize: 15,
  },
  matchBadge: {
    backgroundColor: '#32a85e',
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Threads
  threadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
  },
  threadTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  threadMeta: {
    color: '#999',
    fontSize: 12,
  },
  addThreadButton: {
    backgroundColor: '#32a85e',
    marginLeft: 20,
    marginRight: 20,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});