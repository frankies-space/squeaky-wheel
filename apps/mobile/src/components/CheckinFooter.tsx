import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface CheckinFooterProps {
  confirmed: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onAdjust: () => void;
  /** Evening review mode (after morning confirm). */
  eveningMode?: boolean;
  eveningComplete?: boolean;
  eveningReady?: boolean;
  eveningSubmitting?: boolean;
  onEveningComplete?: () => void;
}

export function CheckinFooter({
  confirmed,
  confirming,
  onConfirm,
  onAdjust,
  eveningMode,
  eveningComplete,
  eveningReady,
  eveningSubmitting,
  onEveningComplete,
}: CheckinFooterProps) {
  if (eveningMode) {
    if (eveningComplete) {
      return (
        <View style={styles.footer}>
          <Text style={styles.confirmedLabel}>Evening review complete.</Text>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.primaryButton,
            (!eveningReady || eveningSubmitting) && styles.buttonDisabled,
          ]}
          onPress={onEveningComplete}
          disabled={!eveningReady || eveningSubmitting}
        >
          <Text style={styles.primaryText}>
            {eveningSubmitting ? 'Saving…' : 'Finish evening review'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.footer}>
        <Text style={styles.confirmedLabel}>Today's plan is locked in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.footer}>
      <Pressable
        style={[styles.primaryButton, confirming && styles.buttonDisabled]}
        onPress={onConfirm}
        disabled={confirming}
      >
        <Text style={styles.primaryText}>{confirming ? 'Confirming…' : 'Looks good'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onAdjust} disabled={confirming}>
        <Text style={styles.secondaryText}>Adjust</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmedLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
