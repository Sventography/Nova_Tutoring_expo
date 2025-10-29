import { api } from "./api";
import { grantQuestionMilestones } from "./rewards";

let questionCount = 0;

export async function handleAskSubmit(prompt: string) {
  const res = await api.ask({ prompt });
  questionCount += 1;
  await grantQuestionMilestones(questionCount);
  return res.answer as string;
}
