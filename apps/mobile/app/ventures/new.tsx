import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { createVenture } from '@/api/ventures';
import { ApiError } from '@/api/client';
import { Field, PrimaryButton } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';

export default function NewVentureScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this venture a name.');
      return;
    }

    setSaving(true);
    try {
      const venture = await createVenture({
        name: name.trim(),
        description: description.trim() || null,
      });
      router.replace(`/ventures/${venture.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not create venture';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="New venture" subtitle="Add a business or project the AI will balance.">
      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Acme SaaS" />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this venture about?"
          multiline
        />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Create venture'}
          onPress={handleSave}
          disabled={saving}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});
