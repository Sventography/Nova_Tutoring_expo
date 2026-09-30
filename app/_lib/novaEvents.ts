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
  decorationId?: string;
  decorationQuantity?: number;
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
      id: "nova-halloween-2026",
      kind: "seasonal",
      title: "Nova Halloween 2026",
      shortTitle: "Nova Halloween",
      tagline: "Learn. Explore. Haunt the island.",
      description:
        "Earn Event XP through quizzes and unlock limited Halloween rewards for Nova Island. Free rewards stay available to every learner; the premium track remains separate.",
      startDate: "2026-09-30",
      endDate: "2026-11-02",
      accent: "#F97316",
      accentSoft: "rgba(124,58,237,0.22)",
      freeTrack: [
        {
          id: "halloween-free-25",
          requiredPoints: 25,
          label: "Trick-or-Treat Coins",
          baseCoins: 25,
        },
        {
          id: "halloween-free-75",
          requiredPoints: 75,
          label: "Ghostlight Lantern",
          baseCoins: 0,
          decorationId: "halloween_ghostlight_lantern",
        },
        {
          id: "halloween-free-150",
          requiredPoints: 150,
          label: "Midnight Study Crystal",
          baseCoins: 0,
          decorationId: "halloween_midnight_crystal",
        },
        {
          id: "halloween-free-250",
          requiredPoints: 250,
          label: "Haunted Coin Cache",
          baseCoins: 125,
        },
        {
          id: "halloween-free-400",
          requiredPoints: 400,
          label: "Harvest Moon Portal",
          baseCoins: 0,
          decorationId: "halloween_harvest_portal",
        },
      ],
      premiumTrackEnabled: true,
      premiumProductId: "event_nova_halloween_2026_premium",
      premiumTrack: [
        {
          id: "halloween-premium-25",
          requiredPoints: 25,
          label: "Premium Moon Cache",
          baseCoins: 75,
        },
        {
          id: "halloween-premium-75",
          requiredPoints: 75,
          label: "Witchlight Arch",
          baseCoins: 0,
          decorationId: "halloween_witchlight_arch",
        },
        {
          id: "halloween-premium-150",
          requiredPoints: 150,
          label: "Phantom Fountain",
          baseCoins: 0,
          decorationId: "halloween_phantom_fountain",
        },
        {
          id: "halloween-premium-250",
          requiredPoints: 250,
          label: "Premium Haunted Cache",
          baseCoins: 250,
        },
        {
          id: "halloween-premium-400",
          requiredPoints: 400,
          label: "Halloween Finale Cache",
          baseCoins: 400,
        },
      ],
    },
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
