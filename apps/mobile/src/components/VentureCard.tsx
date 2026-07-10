import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VentureStatus } from '@squeaky-wheel/shared-types';
import { colors, spacing } from '@/constants/theme';
import { ventureColor } from '@/lib/venture-colors';

interface VentureCardProps {
  id: string;
  name: string;
  description: string | null;
  status: VentureStatus;
  maxDaysWithoutAttention: number;
  onPress: () => void;
}

export function VentureCard({
  id,
  name,
  description,
  status,
  maxDaysWithoutAttention,
  onPress,
}: VentureCardProps) {
  const accent = ventureColor(id);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <Text style={styles.meta}>Max {maxDaysWithoutAttention} days without attention</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 17,
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
  meta: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
});
