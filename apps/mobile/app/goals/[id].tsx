import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { GoalResponse, GoalStatus } from '@squeaky-wheel/shared-types';
import { deleteGoal, listGoals, updateGoal } from '@/api/goals';
import { ApiError } from '@/api/client';
import { Field, PrimaryButton, SecondaryButton } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';

const STATUSES: GoalStatus[] = ['active', 'done', 'abandoned'];

export default function EditGoalScreen() {
  const { id, ventureId } = useLocalSearchParams<{ id: string; ventureId?: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !ventureId) {
      setError('Missing goal context');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const goals = await listGoals(ventureId);
      const found = goals.find((g) => g.id === id);
      if (!found) {
        setError('Goal not found');
        return;
      }
      setGoal(found);
      setTitle(found.title);
      setDescription(found.description ?? '');
      setDeadline(found.deadline ?? '');
      setStatus(found.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  }, [id, ventureId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSave() {
    if (!id || !title.trim()) {
      Alert.alert('Title required', 'Goal title cannot be empty.');
      return;
    }

    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      Alert.alert('Invalid deadline', 'Use YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateGoal(id, {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline.trim() || null,
        status,
      });
      setGoal(updated);
      Alert.alert('Saved', 'Goal updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not save goal');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void handleDelete(),
      },
    ]);
  }

  async function handleDelete() {
    if (!id || !ventureId) return;
    try {
      await deleteGoal(id);
      router.replace(`/ventures/${ventureId}/goals`);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not delete goal');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: goal?.title ?? 'Goal' }} />
      <Screen loading={loading} error={error} onRetry={load} title="" subtitle="">
        <ScrollView contentContainerStyle={styles.content}>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Field
            label="Deadline"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.statusLabel}>Status</Text>
          {STATUSES.map((value) => (
            <SecondaryButton
              key={value}
              label={status === value ? `● ${value}` : value}
              onPress={() => setStatus(value)}
            />
          ))}

          <PrimaryButton
            label={saving ? 'Saving…' : 'Save changes'}
            onPress={handleSave}
            disabled={saving}
          />
          <SecondaryButton label="Delete goal" onPress={confirmDelete} danger />
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
});
