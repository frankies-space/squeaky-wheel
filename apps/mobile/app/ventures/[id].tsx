import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { VentureResponse } from '@squeaky-wheel/shared-types';
import { deleteVenture, getVenture, updateVenture } from '@/api/ventures';
import { ApiError } from '@/api/client';
import { Field, PrimaryButton, SecondaryButton } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { ventureColor } from '@/lib/venture-colors';

export default function VentureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [venture, setVenture] = useState<VentureResponse | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVenture(id);
      setVenture(data);
      setName(data.name);
      setDescription(data.description ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load venture');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSave() {
    if (!id || !name.trim()) {
      Alert.alert('Name required', 'Venture name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateVenture(id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setVenture(updated);
      Alert.alert('Saved', 'Venture updated.');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not save venture');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete venture?', 'This also deletes its goals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void handleDelete(),
      },
    ]);
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteVenture(id);
      router.replace('/ventures');
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not delete venture');
    }
  }

  const accent = id ? ventureColor(id) : colors.primary;

  return (
    <>
      <Stack.Screen options={{ title: venture?.name ?? 'Venture' }} />
      <Screen loading={loading} error={error} onRetry={load} title="" subtitle="">
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.badge, { backgroundColor: accent }]} />
          <Text style={styles.heading}>{venture?.name}</Text>
          <Text style={styles.meta}>Status: {venture?.status}</Text>

          <Field label="Name" value={name} onChangeText={setName} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <PrimaryButton
            label={saving ? 'Saving…' : 'Save changes'}
            onPress={handleSave}
            disabled={saving}
          />

          <Pressable
            style={styles.goalsLink}
            onPress={() => router.push(`/ventures/${id}/goals`)}
          >
            <Text style={styles.goalsLinkTitle}>Goals</Text>
            <Text style={styles.goalsLinkBody}>View and manage long-term goals</Text>
          </Pressable>

          <SecondaryButton label="Delete venture" onPress={confirmDelete} danger />
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
  badge: {
    width: 40,
    height: 6,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textTransform: 'capitalize',
  },
  goalsLink: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  goalsLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  goalsLinkBody: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
});
