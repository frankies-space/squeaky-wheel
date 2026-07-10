import { StyleSheet, Text, View } from 'react-native';
import type { ProposedDailyTask } from '@squeaky-wheel/shared-types';
import { colors, spacing } from '@/constants/theme';
import { formatTimeRange } from '@/lib/checkin';
import { ventureColor } from '@/lib/venture-colors';

interface TaskCardProps {
  task: ProposedDailyTask;
  locked?: boolean;
}

export function TaskCard({ task, locked }: TaskCardProps) {
  const accent = ventureColor(task.ventureId);
  const timeRange = formatTimeRange(task.proposedStartTime, task.proposedEndTime);

  return (
    <View style={[styles.card, locked && styles.cardLocked]}>
      <View style={styles.header}>
        <Text style={styles.slot}>{task.slot}.</Text>
        <Text style={styles.title}>{task.title}</Text>
        {locked ? <Text style={styles.lock}>✓</Text> : null}
        {task.calendarEventId ? <Text style={styles.calendar}>📅</Text> : null}
      </View>

      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: `${accent}22` }]}>
          <View style={[styles.tagDot, { backgroundColor: accent }]} />
          <Text style={[styles.tagText, { color: accent }]}>{task.ventureName}</Text>
        </View>
        <Text style={styles.meta}>
          ~{task.estimatedMinutes} min{timeRange ? ` · ${timeRange}` : ''}
        </Text>
      </View>

      <Text style={styles.rationale}>"{task.rationale}"</Text>
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
  calendar: {
    fontSize: 14,
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
  rationale: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
