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
            StudyBuddy is a student study-partner matching app built for university students.
            We are committed to protecting your privacy and being transparent about how we
            handle your data.
          </Section>

          <Section title="Information We Collect" card={card} border={border} textPri={textPri} textSec={textSec}>
            When you create an account, we collect your name, email address, and a hashed
            version of your password. We also store information you voluntarily provide,
            including your class schedule, course enrollments, and study preferences.
            We collect your device's Expo push token to deliver notifications if you
            enable them.
          </Section>

          <Section title="How We Use Your Information" card={card} border={border} textPri={textPri} textSec={textSec}>
            We use your information solely to operate the StudyBuddy service. This includes
            matching you with other students in your classes, enabling direct messaging
            between matched partners, and sending push notifications when you receive
            messages or match requests. We do not sell your data or use it for advertising.
          </Section>

          <Section title="Data Sharing" card={card} border={border} textPri={textPri} textSec={textSec}>
            Your name and enrolled classes are visible to other students using the app.
            Your email address and password are never shared. Direct messages are only
            visible to you and the person you are messaging.
          </Section>

          <Section title="Push Notifications" card={card} border={border} textPri={textPri} textSec={textSec}>
            If you enable push notifications, your device token is stored securely and
            used only to deliver notifications from StudyBuddy. You can disable
            notifications at any time in your device settings or in the app settings.
          </Section>

          <Section title="Data Storage" card={card} border={border} textPri={textPri} textSec={textSec}>
            Your data is stored in a secure cloud database. We take reasonable measures
            to protect your information, but no system is completely secure. You are
            responsible for keeping your password confidential.
          </Section>

          <Section title="Data Deletion" card={card} border={border} textPri={textPri} textSec={textSec}>
            You can delete your account and all associated data directly from the app in
            Settings. Upon deletion, your profile, messages, enrollments, and push token
            will be permanently removed.
          </Section>

          <Section title="Children's Privacy" card={card} border={border} textPri={textPri} textSec={textSec}>
            StudyBuddy is intended for use by university students aged 18 and older.
            We do not knowingly collect information from anyone under 18.
          </Section>

          <Section title="Changes to This Policy" card={card} border={border} textPri={textPri} textSec={textSec}>
            We may update this privacy policy from time to time. We will notify users
            of significant changes via the app. Continued use of StudyBuddy after changes
            constitutes acceptance of the updated policy.
          </Section>

          <Section title="Contact" card={card} border={border} textPri={textPri} textSec={textSec}>
            If you have any questions about this privacy policy or how we handle your
            data, please contact us through the app or reach out to your institution's
            StudyBuddy administrator.
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