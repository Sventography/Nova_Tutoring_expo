// app/_lib/novaEvents.ts

export type NovaEventKind =
  | "seasonal"
  | "special"
  | "one_time";

export type NovaEventReward = {
  id: string;
  requiredPoints: number;
  label: string;
  baseCoins: number;
};

export type NovaEventDefinition = {
  id: string;
  kind: NovaEventKind;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  startDate: string;
  endDate: string;
  accent: string;
  accentSoft: string;
  freeTrack: NovaEventReward[];
  premiumTrackEnabled: boolean;
  premiumProductId: string | null;
  premiumTrack: NovaEventReward[];
};

export const NOVA_EVENTS:
  NovaEventDefinition[] = [
    {
      id:
        "starlight-study-festival-2026",
      kind: "seasonal",
      title:
        "Starlight Study Festival",
      shortTitle:
        "Starlight Festival",
      tagline:
        "Learn under a brighter sky.",
      description:
        "Complete quizzes and build Event XP while the Starlight Study Festival is active. Free-track rewards unlock as your learning progress grows.",
      startDate:
        "2026-09-19",
      endDate:
        "2026-10-04",
      accent: "#A78BFA",
      accentSoft:
        "rgba(139,92,246,0.18)",
      freeTrack: [
        {
          id: "starlight-25",
          requiredPoints: 25,
          label: "First Light",
          baseCoins: 25,
        },
        {
          id: "starlight-75",
          requiredPoints: 75,
          label: "Rising Star",
          baseCoins: 50,
        },
        {
          id: "starlight-150",
          requiredPoints: 150,
          label: "Constellation",
          baseCoins: 75,
        },
        {
          id: "starlight-250",
          requiredPoints: 250,
          label: "Starlight Scholar",
          baseCoins: 100,
        },
        {
          id: "starlight-400",
          requiredPoints: 400,
          label: "Festival Finale",
          baseCoins: 150,
        },
      ],
      premiumTrackEnabled: true,
      premiumProductId:
        "event_starlight_study_festival_2026_premium",
      premiumTrack: [
        {
          id: "starlight-premium-25",
          requiredPoints: 25,
          label: "Moonlit Spark",
          baseCoins: 50,
        },
        {
          id: "starlight-premium-75",
          requiredPoints: 75,
          label: "Astral Cache",
          baseCoins: 100,
        },
        {
          id: "starlight-premium-150",
          requiredPoints: 150,
          label: "Starbound Scholar",
          baseCoins: 150,
        },
        {
          id: "starlight-premium-250",
          requiredPoints: 250,
          label: "Celestial Vault",
          baseCoins: 250,
        },
        {
          id: "starlight-premium-400",
          requiredPoints: 400,
          label: "Festival Crown",
          baseCoins: 400,
        },
      ],
    },
  ];

export function getEventForDate(
  dateKey: string
): NovaEventDefinition | null {
  return (
    NOVA_EVENTS.find(
      (event) =>
        dateKey >= event.startDate &&
        dateKey <= event.endDate
    ) ?? null
  );
}

export function getUpcomingEvent(
  dateKey: string
): NovaEventDefinition | null {
  return (
    [...NOVA_EVENTS]
      .filter(
        (event) =>
          event.startDate > dateKey
      )
      .sort((a, b) =>
        a.startDate.localeCompare(
          b.startDate
        )
      )[0] ?? null
  );
}
