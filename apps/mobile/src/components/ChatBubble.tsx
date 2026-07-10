import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface ChatBubbleProps {
  role: 'assistant' | 'user';
  children: string;
}

export function ChatBubble({ role, children }: ChatBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <View style={[styles.row, isAssistant ? styles.rowAssistant : styles.rowUser]}>
      <View style={[styles.bubble, isAssistant ? styles.bubbleAssistant : styles.bubbleUser]}>
        <Text style={[styles.text, isAssistant ? styles.textAssistant : styles.textUser]}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textAssistant: {
    color: colors.text,
  },
  textUser: {
    color: colors.primaryText,
  },
});
