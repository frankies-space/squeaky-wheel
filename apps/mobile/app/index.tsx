import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily check-in coming soon</Text>
      <Text style={styles.body}>
        The morning check-in chat is build step 6. For now, manage ventures and goals
        from the Ventures tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
});
