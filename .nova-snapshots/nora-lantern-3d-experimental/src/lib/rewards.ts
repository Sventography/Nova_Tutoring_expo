import { api } from "./api";
import { toast } from "./toast";
export async function grantQuestionMilestones(count: number) {
  if (count === 1) {
    await api.coins.add("default", 0, "first_question");
    toast("First question");
  }
  if (count === 25) {
    const r = await api.coins.add("default", 75, "25_questions");
    toast(`+${r.balance ? 75 : 75} coins`);
  }
  if (count === 50) {
    const r = await api.coins.add("default", 100, "50_questions");
    toast(`+${r.balance ? 100 : 100} coins`);
  }
  if (count === 100) {
    const r = await api.coins.add("default", 250, "100_questions");
    toast(`+${r.balance ? 250 : 250} coins`);
  }
}
export async function grantVoiceMilestones(count: number) {
  if (count === 1) {
    const r = await api.coins.add("default", 25, "first_voice");
    toast(`+25 coins`);
  }
  if (count === 25) {
    const r = await api.coins.add("default", 75, "25_voice_questions");
    toast(`+75 coins`);
  }
}
