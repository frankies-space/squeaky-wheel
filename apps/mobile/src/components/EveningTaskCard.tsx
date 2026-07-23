import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  DailyPlanTaskOutcome,
  EveningTaskDisposition,
  EveningTaskReviewItem,
} from '@squeaky-wheel/shared-types';
import { colors, spacing } from '@/constants/theme';
import { ventureColor } from '@/lib/venture-colors';

interface EveningTaskCardProps {
  task: EveningTaskReviewItem;
  locked?: boolean;
  disposition?: EveningTaskDisposition;
  onOutcome: (outcome: DailyPlanTaskOutcome) => void;
  onDisposition: (disposition: EveningTaskDisposition) => void;
}

const OUTCOMES: { value: DailyPlanTaskOutcome; label: string }[] = [
  { value: 'done', label: 'Done' },
  { value: 'partial', label: 'Partial' },
  { value: 'not_done', label: 'Not done' },
];

const DISPOSITIONS: { value: EveningTaskDisposition; label: string }[] = [
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'backlog', label: 'Backlog' },
];

export function EveningTaskCard({
  task,
  locked,
  disposition,
  onOutcome,
  onDisposition,
}: EveningTaskCardProps) {
  const accent = ventureColor(task.ventureId);
  const needsDisposition = task.outcome === 'not_done' || task.outcome === 'partial';

  return (
    <View style={[styles.card, locked && styles.cardLocked]}>
      <View style={styles.header}>
        <Text style={styles.slot}>{task.slot}.</Text>
        <Text style={styles.title}>{task.title}</Text>
        {locked && task.outcome ? <Text style={styles.lock}>✓</Text> : null}
      </View>

      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: `${accent}22` }]}>
          <View style={[styles.tagDot, { backgroundColor: accent }]} />
          <Text style={[styles.tagText, { color: accent }]}>{task.ventureName}</Text>
        </View>
        <Text style={styles.meta}>~{task.estimatedMinutes} min</Text>
      </View>

      <View style={styles.chipRow}>
        {OUTCOMES.map((option) => {
          const selected = task.outcome === option.value;
          return (
            <Pressable
              key={option.value}
              disabled={locked}
              onPress={() => onOutcome(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {needsDisposition && !locked ? (
        <View style={styles.chipRow}>
          {DISPOSITIONS.map((option) => {
            const selected = disposition === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onDisposition(option.value)}
                style={[styles.chip, styles.chipSecondary, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardLocked: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  slot: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    width: 20,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  lock: {
    fontSize: 16,
    color: colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  chipSecondary: {
    borderStyle: 'dashed',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.primaryText,
  },
});
