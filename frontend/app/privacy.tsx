import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '@/context/theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const { dark } = useTheme();

  const bg      = dark ? '#121212' : '#f5f5f5';
  const card    = dark ? '#1e1e1e' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.1)' : '#e0e0e0';
  const textPri = dark ? '#ffffff' : '#212121';
  const textSec = dark ? '#aaaaaa' : '#757575';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={[s.updated, { color: textSec }]}>Last updated: April 2026</Text>

          <Section title="Overview" card={card} border={border} textPri={textPri} textSec={textSec}>
            StudyBuddy is a study-partner matching app designed for university students. We built this app to help students find compatible study partners in their classes. We take your privacy seriously and are committed to being transparent about how your data is collected, used, and protected.
          </Section>

          <Section title="Information We Collect" card={card} border={border} textPri={textPri} textSec={textSec}>
            When you register, we collect your name, email address, and a securely hashed version of your password. As you use the app, we also store information you choose to provide such as your weekly schedule, enrolled classes, study preferences, and living situation. If you enable push notifications, we store your device push token to deliver alerts.
          </Section>

          <Section title="How We Use Your Data" card={card} border={border} textPri={textPri} textSec={textSec}>
            Your data is used exclusively to operate StudyBuddy. This includes calculating compatibility scores with other students, showing you relevant study partner recommendations, enabling direct messaging between matched users, and sending push notifications for messages and match activity. We do not sell your data, share it with third parties, or use it for advertising of any kind.
          </Section>

          <Section title="What Other Users Can See" card={card} border={border} textPri={textPri} textSec={textSec}>
            Other students can see your name, enrolled classes, study preferences, schedule availability, and compatibility score. Your email address and password are never visible to other users. Direct messages are private and only visible to you and the person you are messaging.
          </Section>

          <Section title="Push Notifications" card={card} border={border} textPri={textPri} textSec={textSec}>
            Push notifications are entirely optional. If you enable them, your device token is stored securely and used only to send StudyBuddy alerts such as new messages and match requests. You can disable notifications at any time from the Settings page in the app or from your device settings.
          </Section>

          <Section title="Data Security" card={card} border={border} textPri={textPri} textSec={textSec}>
            All passwords are hashed using bcrypt before storage and are never stored in plain text. Your data is stored in a secure cloud database with encrypted connections. While we take reasonable precautions to protect your information, no system is completely immune to security risks. You are responsible for keeping your password confidential.
          </Section>

          <Section title="Account & Data Deletion" card={card} border={border} textPri={textPri} textSec={textSec}>
            You can permanently delete your account at any time from your Profile page. Deleting your account immediately and irreversibly removes all of your data including your profile, schedule, classes, matches, messages, and push token. This action cannot be undone.
          </Section>

          <Section title="Blocking & Reporting" card={card} border={border} textPri={textPri} textSec={textSec}>
            You can block any user at any time from their profile. Blocked users will not be able to see you in classes, search, or recommendations. You can also report users for inappropriate behavior. All reports are reviewed by our team and may result in account suspension or removal.
          </Section>

          <Section title="Age Requirement" card={card} border={border} textPri={textPri} textSec={textSec}>
            StudyBuddy is intended for university students aged 18 and older. We do not knowingly collect or store personal information from anyone under the age of 18. If you believe a minor has created an account, please contact us immediately.
          </Section>

          <Section title="Changes to This Policy" card={card} border={border} textPri={textPri} textSec={textSec}>
            We may update this privacy policy as the app evolves. Significant changes will be communicated through the app. Continued use of StudyBuddy after any updates constitutes your acceptance of the revised policy.
          </Section>

          <Section title="Contact Us" card={card} border={border} textPri={textPri} textSec={textSec}>
            If you have questions, concerns, or requests regarding your privacy or this policy, please reach out to us at studybuddy.support.team@gmail.com. We aim to respond to all inquiries within 48 hours.
          </Section>

          <Text style={[s.footer, { color: textSec }]}>© 2026 StudyBuddy. All rights reserved.</Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ title, children, card, border, textPri, textSec }: {
  title: string; children: string;
  card: string; border: string; textPri: string; textSec: string;
}) {
  return (
    <View style={[s.section, { backgroundColor: card, borderColor: border }]}>
      <Text style={[s.sectionTitle, { color: textPri }]}>{title}</Text>
      <Text style={[s.sectionBody, { color: textSec }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1565c0',
  },
  backBtn:      { width: 60 },
  backTxt:      { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerTitle:  { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  scroll:       { padding: 20, paddingBottom: 40 },
  updated:      { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
  section:      { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionBody:  { fontSize: 13, lineHeight: 20 },
  footer:       { fontSize: 11, textAlign: 'center', marginTop: 10 },
});