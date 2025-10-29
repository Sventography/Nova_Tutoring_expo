export function normalizeCards(raw: any) {
  if (Array.isArray(raw)) {
    return raw; // JSON is just an array of cards
  }
  if (raw && Array.isArray(raw.cards)) {
    return raw.cards; // JSON has { topic, cards: [] }
  }
  return []; // fallback
}
