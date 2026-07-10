import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { createGoal } from '@/api/goals';
import { ApiError } from '@/api/client';
import { Field, PrimaryButton } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';

export default function NewGoalScreen() {
  const { id: ventureId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!ventureId) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Give this goal a title.');
      return;
    }

    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      Alert.alert('Invalid deadline', 'Use YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      await createGoal(ventureId, {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline.trim() || null,
      });
      router.replace(`/ventures/${ventureId}/goals`);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not create goal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New goal' }} />
      <Screen title="New goal" subtitle="What should keep moving in this venture?">
        <ScrollView contentContainerStyle={styles.form}>
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Grow newsletter to 5k"
          />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional context for the AI"
            multiline
          />
          <Field
            label="Deadline"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
          />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Create goal'}
            onPress={handleSave}
            disabled={saving}
          />
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});
