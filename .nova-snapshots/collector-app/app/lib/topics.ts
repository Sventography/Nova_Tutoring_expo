import { CARDS_BY_TOPIC } from "@/lib/cards";

export type Card = { front: string; back: string };

export function getAllTopics(): string[] {
  return Object.keys(CARDS_BY_TOPIC);
}

export function getCardsByTopic(topic: string): Card[] {
  return (CARDS_BY_TOPIC as Record<string, Card[]>)[topic] ?? [];
}

