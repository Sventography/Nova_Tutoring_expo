import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "./WalletProvider";
import { useToast } from "./ToastProvider";

type AskEntry = {
  id: string;
  question: string;
  answer: string;
  viaVoice: boolean;
  ts: number;
};
type QuizEntry = {
  id: string;
  topic: string;
  total: number;
  correct: number;
  ts: number;
};

type Stats = {
  questionsAsked: number;
  voiceQuestions: number;
  rewards: { q50: boolean; q100: boolean; v1: boolean; v25: boolean };
};

type Ctx = {
  stats: Stats;
  asks: AskEntry[];
  quizzes: QuizEntry[];
  logAsk: (q: string, a: string, viaVoice: boolean) => Promise<void>;
  logQuiz: (topic: string, total: number, correct: number) => Promise<void>;
  clearAll: () => Promise<void>;
};

const HistoryContext = createContext<Ctx | undefined>(undefined);

const KS = {
  stats: "history:stats",
  asks: "history:asks",
  quizzes: "history:quizzes",
};

const defaultStats: Stats = {
  questionsAsked: 0,
  voiceQuestions: 0,
  rewards: { q50: false, q100: false, v1: false, v25: false },
};

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [asks, setAsks] = useState<AskEntry[]>([]);
  const [quizzes, setQuizzes] = useState<QuizEntry[]>([]);
  const wallet = useWallet();
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const [s, a, q] = await Promise.all([
        AsyncStorage.getItem(KS.stats),
        AsyncStorage.getItem(KS.asks),
        AsyncStorage.getItem(KS.quizzes),
      ]);
      setStats(s ? JSON.parse(s) : defaultStats);
      setAsks(a ? JSON.parse(a) : []);
      setQuizzes(q ? JSON.parse(q) : []);
    })();
  }, []);

  const persist = async (s: Stats, a: AskEntry[], qz: QuizEntry[]) => {
    setStats(s);
    setAsks(a);
    setQuizzes(qz);
    await Promise.all([
      AsyncStorage.setItem(KS.stats, JSON.stringify(s)),
      AsyncStorage.setItem(KS.asks, JSON.stringify(a)),
      AsyncStorage.setItem(KS.quizzes, JSON.stringify(qz)),
    ]);
  };

  const maybeReward = async (ns: Stats) => {
    // Milestones
    if (!ns.rewards.q50 && ns.questionsAsked >= 50) {
      ns.rewards.q50 = true;
      await wallet.addCoins(100);
      toast.show("🎉 Milestone: 50 questions! +100 coins");
    }
    if (!ns.rewards.q100 && ns.questionsAsked >= 100) {
      ns.rewards.q100 = true;
      await wallet.addCoins(250);
      toast.show("🏆 Milestone: 100 questions! +250 coins");
    }
    if (!ns.rewards.v1 && ns.voiceQuestions >= 1) {
      ns.rewards.v1 = true;
      await wallet.addCoins(25);
      toast.show("🗣️ First voice question! +25 coins");
    }
    if (!ns.rewards.v25 && ns.voiceQuestions >= 25) {
      ns.rewards.v25 = true;
      await wallet.addCoins(75);
      toast.show("🔊 25 voice questions! +75 coins");
    }
  };

  const logAsk = async (q: string, a: string, viaVoice: boolean) => {
    const entry: AskEntry = {
      id: String(Date.now()),
      question: q,
      answer: a,
      viaVoice,
      ts: Date.now(),
    };
    const nextAsks = [entry, ...asks].slice(0, 200);
    const ns: Stats = {
      ...stats,
      questionsAsked: stats.questionsAsked + 1,
      voiceQuestions: stats.voiceQuestions + (viaVoice ? 1 : 0),
      rewards: { ...stats.rewards },
    };
    await maybeReward(ns);
    await persist(ns, nextAsks, quizzes);
  };

  const logQuiz = async (topic: string, total: number, correct: number) => {
    const entry: QuizEntry = {
      id: String(Date.now()),
      topic,
      total,
      correct,
      ts: Date.now(),
    };
    const nextQ = [entry, ...quizzes].slice(0, 200);
    await persist(stats, asks, nextQ);
  };

  const clearAll = async () => {
    await AsyncStorage.multiRemove([KS.stats, KS.asks, KS.quizzes]);
    setStats(defaultStats);
    setAsks([]);
    setQuizzes([]);
  };

  const value = useMemo(
    () => ({ stats, asks, quizzes, logAsk, logQuiz, clearAll }),
    [stats, asks, quizzes],
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
