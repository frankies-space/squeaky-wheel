import { useCallback, useMemo, useRef, useState } from 'react';
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
import type {
  DailyPlanTaskOutcome,
  EveningCheckinResponse,
  EveningTaskDisposition,
  TodayCheckinResponse,
} from '@squeaky-wheel/shared-types';
import {
  completeEveningCheckin,
  confirmTodayCheckin,
  getEveningCheckin,
  getTodayCheckin,
} from '@/api/checkin';
import { ApiError } from '@/api/client';
import { ChatBubble } from '@/components/ChatBubble';
import { CheckinFooter } from '@/components/CheckinFooter';
import { EveningTaskCard } from '@/components/EveningTaskCard';
import { TaskCard } from '@/components/TaskCard';
import { colors, spacing } from '@/constants/theme';
import { formatPlanDate, MAX_DAILY_TASKS } from '@/lib/checkin';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };

const ADJUST_PROMPT =
  'Sure — want me to swap one out, or is something off with the timing?';

export default function TodayScreen() {
  const inputRef = useRef<TextInput>(null);
  const [checkin, setCheckin] = useState<TodayCheckinResponse | null>(null);
  const [evening, setEvening] = useState<EveningCheckinResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [eveningSubmitting, setEveningSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOutcomes, setLocalOutcomes] = useState<
    Record<string, DailyPlanTaskOutcome | null>
  >({});
  const [localDispositions, setLocalDispositions] = useState<
    Record<string, EveningTaskDisposition | undefined>
  >({});

  const isConfirmed =
    checkin?.status === 'confirmed' || checkin?.status === 'completed';
  const eveningMode = Boolean(isConfirmed && evening);
  const eveningComplete = evening?.status === 'completed';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodayCheckin();
      setCheckin(data);

      const confirmed = data.status === 'confirmed' || data.status === 'completed';
      if (confirmed) {
        const eveningData = await getEveningCheckin();
        setEvening(eveningData);
        setLocalOutcomes(
          Object.fromEntries(
            eveningData.tasks.map((task) => [task.taskId, task.outcome]),
          ),
        );
        setLocalDispositions({});
        setMessages([
          { id: 'intro', role: 'assistant', text: data.assistantMessage },
          {
            id: 'evening-intro',
            role: 'assistant',
            text: eveningData.assistantMessage,
          },
        ]);
      } else {
        setEvening(null);
        setLocalOutcomes({});
        setLocalDispositions({});
        setMessages([{ id: 'intro', role: 'assistant', text: data.assistantMessage }]);
      }
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

  const eveningTasks = useMemo(() => {
    if (!evening) return [];
    return evening.tasks.slice(0, MAX_DAILY_TASKS).map((task) => ({
      ...task,
      outcome: localOutcomes[task.taskId] ?? task.outcome,
    }));
  }, [evening, localOutcomes]);

  const eveningReady = useMemo(() => {
    if (!evening || eveningComplete) return false;
    return eveningTasks.every((task) => {
      const outcome = localOutcomes[task.taskId] ?? task.outcome;
      if (!outcome) return false;
      if (outcome === 'not_done') {
        return Boolean(localDispositions[task.taskId]);
      }
      if (outcome === 'partial') {
        return Boolean(localDispositions[task.taskId] ?? 'backlog');
      }
      return true;
    });
  }, [evening, eveningComplete, eveningTasks, localOutcomes, localDispositions]);

  const handleConfirm = async () => {
    if (!checkin || isConfirmed) return;

    setConfirming(true);
    setError(null);
    try {
      const confirmed = await confirmTodayCheckin();
      setCheckin(confirmed);
      const eveningData = await getEveningCheckin();
      setEvening(eveningData);
      setLocalOutcomes(
        Object.fromEntries(eveningData.tasks.map((task) => [task.taskId, task.outcome])),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `confirmed-${Date.now()}`,
          role: 'assistant',
          text: confirmed.assistantMessage,
        },
        {
          id: `evening-${Date.now()}`,
          role: 'assistant',
          text: eveningData.assistantMessage,
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

  const handleEveningComplete = async () => {
    if (!evening || eveningComplete || !eveningReady) return;

    setEveningSubmitting(true);
    setError(null);
    try {
      const outcomes = eveningTasks.map((task) => {
        const outcome = (localOutcomes[task.taskId] ?? task.outcome)!;
        const disposition =
          outcome === 'done'
            ? undefined
            : (localDispositions[task.taskId] ??
              (outcome === 'partial' ? 'backlog' : undefined));
        return {
          taskId: task.taskId,
          outcome,
          ...(disposition ? { disposition } : {}),
        };
      });

      const completed = await completeEveningCheckin({ outcomes });
      setEvening(completed);
      setCheckin((prev) =>
        prev ? { ...prev, status: 'completed', assistantMessage: completed.assistantMessage } : prev,
      );
      setLocalOutcomes(
        Object.fromEntries(completed.tasks.map((task) => [task.taskId, task.outcome])),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `evening-done-${Date.now()}`,
          role: 'assistant',
          text: completed.assistantMessage,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to complete evening review';
      setError(message);
    } finally {
      setEveningSubmitting(false);
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

        {eveningMode
          ? eveningTasks.map((task) => (
              <View key={task.taskId} style={styles.cardWrap}>
                <EveningTaskCard
                  task={task}
                  locked={eveningComplete}
                  disposition={localDispositions[task.taskId]}
                  onOutcome={(outcome) => {
                    setLocalOutcomes((prev) => ({ ...prev, [task.taskId]: outcome }));
                    if (outcome === 'done') {
                      setLocalDispositions((prev) => {
                        const next = { ...prev };
                        delete next[task.taskId];
                        return next;
                      });
                    }
                  }}
                  onDisposition={(disposition) => {
                    setLocalDispositions((prev) => ({
                      ...prev,
                      [task.taskId]: disposition,
                    }));
                  }}
                />
              </View>
            ))
          : tasks.map((task) => (
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
        eveningMode={eveningMode}
        eveningComplete={eveningComplete}
        eveningReady={eveningReady}
        eveningSubmitting={eveningSubmitting}
        onEveningComplete={handleEveningComplete}
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
