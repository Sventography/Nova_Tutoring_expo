import { useMemo } from "react";
import { getTopics, getCardsById, type Card, type Topic } from "./flashcards.api";

export function useTopics(): Topic[] {
  return useMemo(() => getTopics(), []);
}

export function useDeck(topicId: string | null): Card[] {
  return useMemo(() => (topicId ? getCardsById(topicId) : []), [topicId]);
}
