import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { TodayCheckinResponse } from '@squeaky-wheel/shared-types';
import { confirmTodayCheckin, getTodayCheckin } from '@/api/checkin';
import { ApiError } from '@/api/client';
import { ChatBubble } from '@/components/ChatBubble';
import { CheckinFooter } from '@/components/CheckinFooter';
import { TaskCard } from '@/components/TaskCard';
import { colors, spacing } from '@/constants/theme';
import { formatPlanDate, MAX_DAILY_TASKS } from '@/lib/checkin';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };

const ADJUST_PROMPT =
  'Sure — want me to swap one out, or is something off with the timing?';

export default function TodayScreen() {
  const inputRef = useRef<TextInput>(null);
  const [checkin, setCheckin] = useState<TodayCheckinResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed =
    checkin?.status === 'confirmed' || checkin?.status === 'completed';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodayCheckin();
      setCheckin(data);
      setMessages([{ id: 'intro', role: 'assistant', text: data.assistantMessage }]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load check-in';
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

  const handleConfirm = async () => {
    if (!checkin || isConfirmed) return;

    setConfirming(true);
    setError(null);
    try {
      const confirmed = await confirmTodayCheckin();
      setCheckin(confirmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `confirmed-${Date.now()}`,
          role: 'assistant',
          text: confirmed.assistantMessage,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to confirm plan';
      setError(message);
    } finally {
      setConfirming(false);
    }
  };

  const handleAdjust = () => {
    if (isConfirmed) return;
    setMessages((prev) => {
      if (prev.some((message) => message.text === ADJUST_PROMPT)) {
        return prev;
      }
      return [
        ...prev,
        { id: `adjust-${Date.now()}`, role: 'assistant', text: ADJUST_PROMPT },
      ];
    });
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isConfirmed) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text },
    ]);
    setDraft('');
  };

  const tasks = (checkin?.proposedTasks ?? []).slice(0, MAX_DAILY_TASKS);
  const planDateLabel = checkin ? formatPlanDate(checkin.planDate) : '';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error && !checkin) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <View style={styles.dateBar}>
        <Text style={styles.dateText}>{planDateLabel}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role}>
            {message.text}
          </ChatBubble>
        ))}

        {tasks.map((task) => (
          <View key={task.taskId} style={styles.cardWrap}>
            <TaskCard task={task} locked={isConfirmed} />
          </View>
        ))}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      </ScrollView>

      <CheckinFooter
        confirmed={isConfirmed}
        confirming={confirming}
        onConfirm={handleConfirm}
        onAdjust={handleAdjust}
      />

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={isConfirmed ? 'Plan locked for today' : 'Type a message…'}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          editable={!isConfirmed}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        {!isConfirmed ? (
          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  dateBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  cardWrap: {
    paddingHorizontal: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sendText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  inlineError: {
    color: colors.danger,
    textAlign: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: colors.primaryText,
    fontWeight: '600',
  },
});
