import { useMemo, useState } from "react";

export type Mission = {
  id: string;
  title: string;
  goal: number;
  progress: number;
  reward: number;
};

export type MissionsState = {
  missions: Mission[];
  coins: number;
};

export function createDefaultMissions(): Mission[] {
  return [
    { id: "ask-1", title: "Ask 5 questions", goal: 5, progress: 0, reward: 25 },
    { id: "voice-1", title: "Use voice once", goal: 1, progress: 0, reward: 25 },
    { id: "learn-10", title: "Study 10 mins", goal: 10, progress: 0, reward: 50 }
  ];
}

export function useMissions(initial?: Mission[]) {
  const initialMissions = useMemo(() => (initial && initial.length ? initial : createDefaultMissions()), [initial]);
  const [state, setState] = useState<MissionsState>({ missions: initialMissions, coins: 0 });

  function addProgress(id: string, delta = 1) {
    setState((s) => {
      const missions = s.missions.map((m) =>
        m.id === id ? { ...m, progress: Math.min(m.goal, m.progress + delta) } : m
      );
      let coins = s.coins;
      missions.forEach((m: any, idx) => {
        if (m.progress >= m.goal && !m.__paid) {
          coins += m.reward;
          m.__paid = true;
        }
      });
      return { missions, coins };
    });
  }

  function reset() {
    setState({ missions: createDefaultMissions(), coins: 0 });
  }

  return { state, addProgress, reset };
}

export default { useMissions, createDefaultMissions };
