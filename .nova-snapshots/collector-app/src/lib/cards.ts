import raw from "../constants/flashcards_data_v2.json";

export type Card = {
  front: string;
  back: string;
  topicId: string;
  topicName: string;
};

const data: any = raw as any;

export function getAllTopics(): any[] {
  return (data?.topics ?? []) as any[];
}

export function getAllCards(): Card[] {
  const out: Card[] = [];
  for (const t of getAllTopics()) {
    for (const c of t.cards ?? []) {
      const front = c.front ?? c.q;
      const back = c.back ?? c.a;
      if (typeof front === "string" && typeof back === "string") {
        out.push({ front, back, topicId: t.id, topicName: t.name });
      }
    }
  }
  return out;
}
