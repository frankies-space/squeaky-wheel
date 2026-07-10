import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { VentureResponse } from '@squeaky-wheel/shared-types';
import { listVentures } from '@/api/ventures';
import { ApiError } from '@/api/client';
import { Screen } from '@/components/Screen';
import { VentureCard } from '@/components/VentureCard';
import { colors, spacing } from '@/constants/theme';

export default function VenturesListScreen() {
  const router = useRouter();
  const [ventures, setVentures] = useState<VentureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVentures(await listVentures());
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load ventures';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Ventures"
      subtitle="Your businesses and projects. Tap one to manage goals."
      loading={loading}
      error={error}
      onRetry={load}
    >
      <FlatList
        data={ventures}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No ventures yet. Add your first one.</Text>
        }
        renderItem={({ item }) => (
          <VentureCard
            id={item.id}
            name={item.name}
            description={item.description}
            status={item.status}
            maxDaysWithoutAttention={item.maxDaysWithoutAttention}
            onPress={() => router.push(`/ventures/${item.id}`)}
          />
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/ventures/new')}>
        <Text style={styles.fabText}>+ New venture</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 96,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});
