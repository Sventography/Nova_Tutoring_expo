// app/_lib/novaEvents.ts

export type NovaEventKind =
  | "seasonal"
  | "special"
  | "one_time";

export type NovaEventReward = {
  id: string;
  requiredPoints: number;
  label: string;
  description: string;
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
          description:
            "Adds 25 coins to your main Nova coin balance. This reward does not create an inventory item.",
          baseCoins: 25,
        },
        {
          id: "halloween-free-75",
          requiredPoints: 75,
          label: "Ghostlight Lantern",
          description:
            "Adds the limited Ghostlight Lantern to Nova Island → BUILD → Decoration Inventory.",
          baseCoins: 0,
          decorationId: "halloween_ghostlight_lantern",
        },
        {
          id: "halloween-free-150",
          requiredPoints: 150,
          label: "Midnight Study Crystal",
          description:
            "Adds the limited Midnight Study Crystal to Nova Island → BUILD → Decoration Inventory.",
          baseCoins: 0,
          decorationId: "halloween_midnight_crystal",
        },
        {
          id: "halloween-free-250",
          requiredPoints: 250,
          label: "Haunted Coin Cache",
          description:
            "Adds 125 coins to your main Nova coin balance. This reward does not create an inventory item.",
          baseCoins: 125,
        },
        {
          id: "halloween-free-400",
          requiredPoints: 400,
          label: "Harvest Moon Portal",
          description:
            "Adds the one-time Harvest Moon Portal to Nova Island → BUILD → Decoration Inventory.",
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
          description:
            "Premium reward. Adds 75 coins to your main Nova coin balance.",
          baseCoins: 75,
        },
        {
          id: "halloween-premium-75",
          requiredPoints: 75,
          label: "Witchlight Arch",
          description:
            "Premium reward. Adds the one-time Witchlight Arch to Nova Island → BUILD → Decoration Inventory.",
          baseCoins: 0,
          decorationId: "halloween_witchlight_arch",
        },
        {
          id: "halloween-premium-150",
          requiredPoints: 150,
          label: "Phantom Fountain",
          description:
            "Premium reward. Adds the one-time Phantom Fountain to Nova Island → BUILD → Decoration Inventory.",
          baseCoins: 0,
          decorationId: "halloween_phantom_fountain",
        },
        {
          id: "halloween-premium-250",
          requiredPoints: 250,
          label: "Premium Haunted Cache",
          description:
            "Premium reward. Adds 250 coins to your main Nova coin balance.",
          baseCoins: 250,
        },
        {
          id: "halloween-premium-400",
          requiredPoints: 400,
          label: "Halloween Finale Cache",
          description:
            "Premium finale reward. Adds 400 coins to your main Nova coin balance.",
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
          description: "Adds 25 coins to your main Nova coin balance.",
          baseCoins: 25,
        },
        {
          id: "starlight-75",
          requiredPoints: 75,
          label: "Rising Star",
          description: "Adds 50 coins to your main Nova coin balance.",
          baseCoins: 50,
        },
        {
          id: "starlight-150",
          requiredPoints: 150,
          label: "Constellation",
          description: "Adds 75 coins to your main Nova coin balance.",
          baseCoins: 75,
        },
        {
          id: "starlight-250",
          requiredPoints: 250,
          label: "Starlight Scholar",
          description: "Adds 100 coins to your main Nova coin balance.",
          baseCoins: 100,
        },
        {
          id: "starlight-400",
          requiredPoints: 400,
          label: "Festival Finale",
          description: "Adds 150 coins to your main Nova coin balance.",
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
          description: "Premium reward. Adds 50 coins to your main Nova coin balance.",
          baseCoins: 50,
        },
        {
          id: "starlight-premium-75",
          requiredPoints: 75,
          label: "Astral Cache",
          description: "Premium reward. Adds 100 coins to your main Nova coin balance.",
          baseCoins: 100,
        },
        {
          id: "starlight-premium-150",
          requiredPoints: 150,
          label: "Starbound Scholar",
          description: "Premium reward. Adds 150 coins to your main Nova coin balance.",
          baseCoins: 150,
        },
        {
          id: "starlight-premium-250",
          requiredPoints: 250,
          label: "Celestial Vault",
          description: "Premium reward. Adds 250 coins to your main Nova coin balance.",
          baseCoins: 250,
        },
        {
          id: "starlight-premium-400",
          requiredPoints: 400,
          label: "Festival Crown",
          description: "Premium reward. Adds 400 coins to your main Nova coin balance.",
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
