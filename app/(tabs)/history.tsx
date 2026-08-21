// app/(tabs)/history.tsx
//
// Nova Tutoring — quiz history organized by canonical subject taxonomy.
// Keeps a Recent view too, so students can switch between progress structure
// and simple chronology.

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";

import * as QuizHistoryModule from "../_lib/quizHistory";
import {
  SUBJECT_KEYS,
  SUBJECT_LABELS,
  classifyTopic,
  type SubjectKey,
} from "../_lib/topicTaxonomy";

type RawHistoryRecord = Record<string, any>;

type HistoryRecord = {
  key: string;
  topicId: string;
  title: string;
  correct: number | null;
  total: number | null;
  percent: number | null;
  completedAt: number | null;
  subject: SubjectKey;
  subjectLabel: string;
  discipline: string;
};

type TopicGroup = {
  topicKey: string;
  topicId: string;
  title: string;
  attempts: HistoryRecord[];
  bestPercent: number | null;
};

type DisciplineGroup = {
  discipline: string;
  label: string;
  topics: TopicGroup[];
  attempts: number;
  bestPercent: number | null;
};

type SubjectGroup = {
  subject: SubjectKey;
  label: string;
  attempts: number;
  topicCount: number;
  bestPercent: number | null;
  disciplines: DisciplineGroup[];
};

const CYAN = "#00E5FF";
const BLUE = "#0B2239";
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const MUTED = "#9BDFFF";

const MODULE_READERS = [
  "list",
  "getAll",
  "load",
  "read",
  "all",
  "getHistory",
  "loadHistory",
] as const;

const MODULE_CLEARERS = [
  "clear",
  "clearAll",
  "reset",
  "clearHistory",
] as const;

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boundedPercent(value: unknown): number | null {
  const n = finiteNumber(value);
  if (n == null) return null;

  // Some historical stores may save a 0..1 score.
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function pickFirst(record: RawHistoryRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function normalizeTimestamp(value: unknown): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    // seconds since epoch -> milliseconds
    return value > 0 && value < 10_000_000_000 ? value * 1000 : value;
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber < 10_000_000_000 ? asNumber * 1000 : asNumber;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCaseToken(value: string): string {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeRecord(
  raw: RawHistoryRecord,
  index: number
): HistoryRecord | null {
  if (!raw || typeof raw !== "object") return null;

  const topicId = String(
    pickFirst(raw, [
      "topicId",
      "topic_id",
      "topic",
      "slug",
      "quizId",
      "quiz_id",
      "id",
    ]) ?? ""
  ).trim();

  const title = String(
    pickFirst(raw, [
      "title",
      "quizTitle",
      "quiz_title",
      "topicTitle",
      "topic_title",
      "name",
    ]) ??
      topicId ??
      "Quiz"
  ).trim() || "Quiz";

  const correct = finiteNumber(
    pickFirst(raw, ["correct", "correctAnswers", "correct_answers"])
  );
  const total = finiteNumber(
    pickFirst(raw, ["total", "totalQuestions", "total_questions", "questions"])
  );

  let percent = boundedPercent(
    pickFirst(raw, [
      "percent",
      "percentage",
      "scorePct",
      "score_pct",
      "scorePercent",
      "score_percent",
    ])
  );

  if (percent == null && correct != null && total != null && total > 0) {
    percent = Math.round((correct / total) * 100);
  }

  const completedAt = normalizeTimestamp(
    pickFirst(raw, [
      "completedAt",
      "completed_at",
      "createdAt",
      "created_at",
      "timestamp",
      "ts",
      "date",
      "time",
    ])
  );

  // A real quiz-history row should have at least one useful quiz field.
  if (!topicId && title === "Quiz" && percent == null && correct == null) {
    return null;
  }

  const taxonomy = classifyTopic(topicId, title);

  const rawKey = pickFirst(raw, [
    "historyId",
    "history_id",
    "attemptId",
    "attempt_id",
    "eventId",
    "event_id",
    "id",
  ]);

  return {
    key: `${String(rawKey ?? `${topicId}:${completedAt ?? index}`)}:${index}`,
    topicId,
    title,
    correct: correct == null ? null : Math.max(0, Math.floor(correct)),
    total: total == null ? null : Math.max(0, Math.floor(total)),
    percent,
    completedAt,
    subject: taxonomy.subject,
    subjectLabel: taxonomy.subjectLabel,
    discipline: taxonomy.discipline,
  };
}

function isHistoryLikeRecord(value: unknown): value is RawHistoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as RawHistoryRecord;
  const hasQuizIdentity =
    "topicId" in record ||
    "topic_id" in record ||
    "quizTitle" in record ||
    "topicTitle" in record ||
    "title" in record;

  const hasQuizResult =
    "percent" in record ||
    "percentage" in record ||
    "scorePct" in record ||
    "score_percent" in record ||
    "correct" in record ||
    "total" in record;

  return hasQuizIdentity && hasQuizResult;
}

function extractArrays(value: unknown): RawHistoryRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isHistoryLikeRecord);
  }

  if (!value || typeof value !== "object") return [];

  const object = value as RawHistoryRecord;

  for (const key of [
    "history",
    "items",
    "records",
    "entries",
    "quizzes",
    "attempts",
    "data",
  ]) {
    if (Array.isArray(object[key])) {
      return object[key].filter(isHistoryLikeRecord);
    }
  }

  return [];
}

async function loadFromQuizHistoryModule(): Promise<RawHistoryRecord[]> {
  const moduleAny = QuizHistoryModule as any;

  for (const name of MODULE_READERS) {
    const candidate = moduleAny?.[name];
    if (typeof candidate !== "function") continue;

    try {
      const result = await candidate();
      const records = extractArrays(result);
      if (records.length > 0) {
        return records;
      }

      if (Array.isArray(result) && result.length === 0) {
        return [];
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`[History] quizHistory.${name}() failed`, error);
      }
    }
  }

  return [];
}

function looksLikeQuizHistoryKey(key: string): boolean {
  const normalized = String(key || "").toLowerCase();
  return (
    (normalized.includes("quiz") && normalized.includes("history")) ||
    normalized.includes("quizhistory")
  );
}

async function loadFromAsyncStorageFallback(): Promise<RawHistoryRecord[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const candidates = keys.filter(looksLikeQuizHistoryKey);
    if (!candidates.length) return [];

    const pairs = await AsyncStorage.multiGet(candidates);
    const output: RawHistoryRecord[] = [];

    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        output.push(...extractArrays(parsed));
      } catch {
        // Not JSON history; ignore it.
      }
    }

    return output;
  } catch (error) {
    console.warn("[History] AsyncStorage fallback failed", error);
    return [];
  }
}

async function loadHistoryRecords(): Promise<HistoryRecord[]> {
  let raw = await loadFromQuizHistoryModule();

  if (!raw.length) {
    raw = await loadFromAsyncStorageFallback();
  }

  const normalized = raw
    .map((record, index) => normalizeRecord(record, index))
    .filter(Boolean) as HistoryRecord[];

  // Preserve every attempt, but remove exact duplicate writes from dual history
  // loggers when the same topic/result/timestamp was persisted twice.
  const seen = new Set<string>();
  const deduped: HistoryRecord[] = [];

  for (const item of normalized) {
    const duplicateKey = [
      item.topicId || item.title,
      item.percent ?? "",
      item.correct ?? "",
      item.total ?? "",
      item.completedAt ?? "",
    ].join("|");

    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    deduped.push(item);
  }

  return deduped.sort((a, b) => {
    const aTime = a.completedAt ?? 0;
    const bTime = b.completedAt ?? 0;
    return bTime - aTime;
  });
}

async function clearHistoryRecords(): Promise<void> {
  const moduleAny = QuizHistoryModule as any;

  for (const name of MODULE_CLEARERS) {
    const candidate = moduleAny?.[name];
    if (typeof candidate !== "function") continue;

    try {
      await candidate();
      return;
    } catch (error) {
      if (__DEV__) {
        console.warn(`[History] quizHistory.${name}() failed`, error);
      }
    }
  }

  const keys = await AsyncStorage.getAllKeys();
  const candidates = keys.filter(looksLikeQuizHistoryKey);
  if (candidates.length) {
    await AsyncStorage.multiRemove(candidates);
  }
}

function groupHistory(records: HistoryRecord[]): SubjectGroup[] {
  const subjectMap = new Map<
    SubjectKey,
    Map<string, Map<string, HistoryRecord[]>>
  >();

  for (const record of records) {
    if (!subjectMap.has(record.subject)) {
      subjectMap.set(record.subject, new Map());
    }

    const disciplineMap = subjectMap.get(record.subject)!;
    const discipline = record.discipline || "general_studies";

    if (!disciplineMap.has(discipline)) {
      disciplineMap.set(discipline, new Map());
    }

    const topicMap = disciplineMap.get(discipline)!;
    const topicKey = record.topicId || record.title;

    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, []);
    }

    topicMap.get(topicKey)!.push(record);
  }

  const observedSubjects = Array.from(subjectMap.keys());
  const orderedSubjects: SubjectKey[] = [
    ...SUBJECT_KEYS.filter((key) => observedSubjects.includes(key)),
    ...observedSubjects.filter(
      (key) => !(SUBJECT_KEYS as readonly SubjectKey[]).includes(key)
    ),
  ];

  return orderedSubjects.map((subject) => {
    const disciplineMap = subjectMap.get(subject)!;

    const disciplines: DisciplineGroup[] = Array.from(
      disciplineMap.entries()
    )
      .map(([discipline, topicMap]) => {
        const topics: TopicGroup[] = Array.from(topicMap.entries())
          .map(([topicKey, attempts]) => {
            const sorted = [...attempts].sort(
              (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
            );
            const scores = sorted
              .map((item) => item.percent)
              .filter((value): value is number => value != null);

            return {
              topicKey,
              topicId: sorted[0]?.topicId ?? "",
              title: sorted[0]?.title ?? topicKey,
              attempts: sorted,
              bestPercent: scores.length ? Math.max(...scores) : null,
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        const disciplineAttempts = topics.reduce(
          (sum, topic) => sum + topic.attempts.length,
          0
        );
        const disciplineScores = topics
          .map((topic) => topic.bestPercent)
          .filter((value): value is number => value != null);

        return {
          discipline,
          label: titleCaseToken(discipline),
          topics,
          attempts: disciplineAttempts,
          bestPercent: disciplineScores.length
            ? Math.max(...disciplineScores)
            : null,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const attempts = disciplines.reduce(
      (sum, discipline) => sum + discipline.attempts,
      0
    );
    const topicCount = disciplines.reduce(
      (sum, discipline) => sum + discipline.topics.length,
      0
    );
    const scores = disciplines
      .map((discipline) => discipline.bestPercent)
      .filter((value): value is number => value != null);

    return {
      subject,
      label: SUBJECT_LABELS[subject] ?? titleCaseToken(subject),
      attempts,
      topicCount,
      bestPercent: scores.length ? Math.max(...scores) : null,
      disciplines,
    };
  });
}

function formatDate(value: number | null): string {
  if (!value) return "Date unavailable";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Date unavailable";
  }
}

function scoreText(record: HistoryRecord): string {
  if (record.percent != null) return `${record.percent}%`;
  if (record.correct != null && record.total != null) {
    return `${record.correct}/${record.total}`;
  }
  return "Completed";
}

function bestText(value: number | null): string {
  return value == null ? "Best —" : `Best ${value}%`;
}

function plural(value: number, one: string, many = `${one}s`): string {
  return `${value} ${value === 1 ? one : many}`;
}

export default function HistoryScreen() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"subject" | "recent">("subject");
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {}
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const next = await loadHistoryRecords();
      setRecords(next);

      setExpandedSubjects((current) => {
        if (Object.keys(current).length > 0) return current;

        const firstSubject = next[0]?.subject;
        return firstSubject ? { [firstSubject]: true } : {};
      });
    } catch (error) {
      console.warn("[History] load failed", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const grouped = useMemo(() => groupHistory(records), [records]);

  const overallBest = useMemo(() => {
    const scores = records
      .map((record) => record.percent)
      .filter((value): value is number => value != null);
    return scores.length ? Math.max(...scores) : null;
  }, [records]);

  const uniqueSubjects = useMemo(
    () => new Set(records.map((record) => record.subject)).size,
    [records]
  );

  const uniqueTopics = useMemo(
    () => new Set(records.map((record) => record.topicId || record.title)).size,
    [records]
  );

  const toggleSubject = useCallback((subject: string) => {
    setExpandedSubjects((current) => ({
      ...current,
      [subject]: !current[subject],
    }));
  }, []);

  const toggleTopic = useCallback((key: string) => {
    setExpandedTopics((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const askClear = useCallback(() => {
    if (!records.length) return;

    Alert.alert(
      "Clear quiz history?",
      "This removes the quiz-attempt history shown on this device. It does not remove achievements, certificates, coins, Study XP, or server achievement progress.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await clearHistoryRecords();
                setRecords([]);
                setExpandedSubjects({});
                setExpandedTopics({});
              } catch (error) {
                console.warn("[History] clear failed", error);
                Alert.alert(
                  "Could not clear history",
                  "Nova couldn't clear quiz history right now."
                );
              }
            })();
          },
        },
      ]
    );
  }, [records.length]);

  return (
    <LinearGradient colors={[BLACK, BLUE]} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>STUDY RECORD</Text>
            <Text style={styles.title}>Quiz History</Text>
            <Text style={styles.subtitle}>
              See what you've studied by subject, or switch to a simple recent
              timeline.
            </Text>
          </View>

          {records.length > 0 ? (
            <Pressable style={styles.clearButton} onPress={askClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Attempts" value={String(records.length)} />
          <SummaryCard label="Subjects" value={String(uniqueSubjects)} />
          <SummaryCard label="Topics" value={String(uniqueTopics)} />
          <SummaryCard
            label="Best"
            value={overallBest == null ? "—" : `${overallBest}%`}
          />
        </View>

        <View style={styles.segment}>
          <Pressable
            style={[
              styles.segmentButton,
              mode === "subject" && styles.segmentButtonActive,
            ]}
            onPress={() => setMode("subject")}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "subject" && styles.segmentTextActive,
              ]}
            >
              By Subject
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentButton,
              mode === "recent" && styles.segmentButtonActive,
            ]}
            onPress={() => setMode("recent")}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "recent" && styles.segmentTextActive,
              ]}
            >
              Recent
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={CYAN} />
            <Text style={styles.loadingText}>Loading quiz history…</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No quizzes yet</Text>
            <Text style={styles.emptyText}>
              Finish a quiz and it will appear here under its subject and
              discipline.
            </Text>
          </View>
        ) : mode === "subject" ? (
          <View style={styles.sectionStack}>
            {grouped.map((subject) => {
              const expanded = !!expandedSubjects[subject.subject];

              return (
                <View key={subject.subject} style={styles.subjectCard}>
                  <Pressable
                    style={styles.subjectHeader}
                    onPress={() => toggleSubject(subject.subject)}
                  >
                    <View style={styles.subjectHeaderCopy}>
                      <Text style={styles.subjectTitle}>{subject.label}</Text>
                      <Text style={styles.subjectMeta}>
                        {plural(subject.attempts, "quiz", "quizzes")} •{" "}
                        {plural(subject.topicCount, "topic")} •{" "}
                        {bestText(subject.bestPercent)}
                      </Text>
                    </View>

                    <Text style={styles.chevron}>{expanded ? "−" : "+"}</Text>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.subjectBody}>
                      {subject.disciplines.map((discipline) => (
                        <View
                          key={`${subject.subject}:${discipline.discipline}`}
                          style={styles.disciplineBlock}
                        >
                          <View style={styles.disciplineHeader}>
                            <Text style={styles.disciplineTitle}>
                              {discipline.label}
                            </Text>
                            <Text style={styles.disciplineMeta}>
                              {plural(
                                discipline.attempts,
                                "attempt"
                              )} • {bestText(discipline.bestPercent)}
                            </Text>
                          </View>

                          {discipline.topics.map((topic) => {
                            const topicExpandKey = `${subject.subject}:${discipline.discipline}:${topic.topicKey}`;
                            const topicExpanded =
                              expandedTopics[topicExpandKey] ??
                              topic.attempts.length <= 2;

                            return (
                              <View
                                key={topicExpandKey}
                                style={styles.topicCard}
                              >
                                <Pressable
                                  style={styles.topicHeader}
                                  onPress={() => toggleTopic(topicExpandKey)}
                                >
                                  <View style={styles.topicCopy}>
                                    <Text style={styles.topicTitle}>
                                      {topic.title}
                                    </Text>
                                    <Text style={styles.topicMeta}>
                                      {plural(
                                        topic.attempts.length,
                                        "attempt"
                                      )} • {bestText(topic.bestPercent)}
                                    </Text>
                                  </View>

                                  <Text style={styles.topicChevron}>
                                    {topicExpanded ? "▾" : "›"}
                                  </Text>
                                </Pressable>

                                {topicExpanded ? (
                                  <View style={styles.attemptList}>
                                    {topic.attempts.map((attempt) => (
                                      <AttemptRow
                                        key={attempt.key}
                                        record={attempt}
                                      />
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.sectionStack}>
            {records.map((record) => (
              <View key={record.key} style={styles.recentCard}>
                <View style={styles.recentTopRow}>
                  <View style={styles.recentCopy}>
                    <Text style={styles.recentTitle}>{record.title}</Text>
                    <Text style={styles.recentCategory}>
                      {record.subjectLabel} •{" "}
                      {titleCaseToken(record.discipline)}
                    </Text>
                  </View>

                  <Text style={styles.scoreLarge}>{scoreText(record)}</Text>
                </View>

                <View style={styles.recentBottomRow}>
                  <Text style={styles.dateText}>
                    {formatDate(record.completedAt)}
                  </Text>

                  {record.correct != null && record.total != null ? (
                    <Text style={styles.correctText}>
                      {record.correct}/{record.total} correct
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AttemptRow({ record }: { record: HistoryRecord }) {
  return (
    <View style={styles.attemptRow}>
      <View style={styles.attemptCopy}>
        <Text style={styles.dateText}>{formatDate(record.completedAt)}</Text>
        {record.correct != null && record.total != null ? (
          <Text style={styles.correctText}>
            {record.correct}/{record.total} correct
          </Text>
        ) : null}
      </View>

      <Text style={styles.score}>{scoreText(record)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 44,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    color: CYAN,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: WHITE,
    opacity: 0.76,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    maxWidth: 560,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 4,
  },
  clearButtonText: {
    color: "#FF9A9A",
    fontSize: 12,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  summaryCard: {
    minWidth: "22%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.25)",
    backgroundColor: "rgba(0,229,255,0.06)",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryValue: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "900",
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 15,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 16,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: "rgba(0,229,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.65)",
  },
  segmentText: {
    color: WHITE,
    opacity: 0.65,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: CYAN,
    opacity: 1,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 46,
    gap: 10,
  },
  loadingText: {
    color: MUTED,
    fontWeight: "700",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    color: CYAN,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: WHITE,
    opacity: 0.72,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
  },
  sectionStack: {
    gap: 12,
  },
  subjectCard: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.28)",
    backgroundColor: "rgba(3,16,29,0.82)",
    borderRadius: 19,
    overflow: "hidden",
  },
  subjectHeader: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subjectHeaderCopy: {
    flex: 1,
  },
  subjectTitle: {
    color: CYAN,
    fontSize: 18,
    fontWeight: "900",
  },
  subjectMeta: {
    color: WHITE,
    opacity: 0.68,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "700",
  },
  chevron: {
    color: CYAN,
    fontSize: 22,
    fontWeight: "900",
    width: 24,
    textAlign: "center",
  },
  subjectBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,229,255,0.18)",
    padding: 12,
    gap: 14,
  },
  disciplineBlock: {
    gap: 8,
  },
  disciplineHeader: {
    paddingHorizontal: 4,
  },
  disciplineTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
  },
  disciplineMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
  },
  topicCard: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  topicHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topicCopy: {
    flex: 1,
  },
  topicTitle: {
    color: WHITE,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "850",
  },
  topicMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },
  topicChevron: {
    color: CYAN,
    fontSize: 19,
    fontWeight: "900",
  },
  attemptList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  attemptRow: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  attemptCopy: {
    flex: 1,
  },
  dateText: {
    color: WHITE,
    opacity: 0.72,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  correctText: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
    fontWeight: "700",
  },
  score: {
    color: CYAN,
    fontSize: 15,
    fontWeight: "900",
  },
  recentCard: {
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderRadius: 16,
    padding: 14,
  },
  recentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  recentCopy: {
    flex: 1,
  },
  recentTitle: {
    color: WHITE,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  recentCategory: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    fontWeight: "700",
  },
  scoreLarge: {
    color: CYAN,
    fontSize: 20,
    fontWeight: "900",
  },
  recentBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },
});
