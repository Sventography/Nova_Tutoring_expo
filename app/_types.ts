export type Topic = { id: string; title: string };
export type Flashcard = {
  id: string;
  topicId: string;
  front: string;
  back: string;
};
