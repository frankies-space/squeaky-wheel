import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { GoalResponse } from '@squeaky-wheel/shared-types';
import { listGoals } from '@/api/goals';
import { getVenture } from '@/api/ventures';
import { ApiError } from '@/api/client';
import { GoalCard } from '@/components/GoalCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';

export default function VentureGoalsScreen() {
  const { id: ventureId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [ventureName, setVentureName] = useState('Goals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ventureId) return;
    setLoading(true);
    setError(null);
    try {
      const [venture, goalList] = await Promise.all([
        getVenture(ventureId),
        listGoals(ventureId),
      ]);
      setVentureName(venture.name);
      setGoals(goalList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [ventureId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <>
      <Stack.Screen options={{ title: `${ventureName} — Goals` }} />
      <Screen
        title="Goals"
        subtitle="Long-term outcomes for this venture."
        loading={loading}
        error={error}
        onRetry={load}
      >
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No goals yet. Add one the AI can decompose later.</Text>
          }
          renderItem={({ item }) => (
            <GoalCard
              title={item.title}
              description={item.description}
              deadline={item.deadline}
              status={item.status}
              onPress={() => router.push(`/goals/${item.id}?ventureId=${ventureId}`)}
            />
          )}
        />
        <Pressable
          style={styles.fab}
          onPress={() => router.push(`/ventures/${ventureId}/goals/new`)}
        >
          <Text style={styles.fabText}>+ New goal</Text>
        </Pressable>
      </Screen>
    </>
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
    lineHeight: 22,
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
