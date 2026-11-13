import { awardOnQuizComplete, listAll, getPoints } from "./achievements";
export async function summarizeAfterQuiz(topicId:string, correct:number, total:number, durationMs:number){
  await awardOnQuizComplete(topicId, total? correct/total: 0, durationMs);
  const before = await listAll();
  const after = await listAll();
  const points = await getPoints();
  return { before, after, points };
}
