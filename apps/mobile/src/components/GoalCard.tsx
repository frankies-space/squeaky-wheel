import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GoalStatus } from '@squeaky-wheel/shared-types';
import { colors, spacing } from '@/constants/theme';

interface GoalCardProps {
  title: string;
  description: string | null;
  deadline: string | null;
  status: GoalStatus;
  onPress: () => void;
}

export function GoalCard({
  title,
  description,
  deadline,
  status,
  onPress,
}: GoalCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {deadline ? <Text style={styles.deadline}>Deadline: {deadline}</Text> : null}
    </Pressable>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  description: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  deadline: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
});
