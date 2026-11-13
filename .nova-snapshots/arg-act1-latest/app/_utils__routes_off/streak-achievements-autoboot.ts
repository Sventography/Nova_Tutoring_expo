import AsyncStorage from "@react-native-async-storage/async-storage";
import { AchieveEvents } from "./AchieveEvents";

const K_LAST = "@streak/last";
const K_COUNT = "@streak/days";

function ymd(d: Date) {
  return d.toISOString().slice(0,10);
}

async function run() {
  try {
    const now = new Date();
    const todayKey = ymd(now);
    const last = (await AsyncStorage.getItem(K_LAST)) || "";
    let count = parseInt((await AsyncStorage.getItem(K_COUNT)) || "0", 10) || 0;

    if (last === todayKey) {
      AchieveEvents.emit("streak:update", { days: count, today: true });
      return;
    }

    if (last) {
      const prev = new Date(last + "T00:00:00Z");
      const diff = Math.round((now.getTime() - prev.getTime())/86400000);
      if (diff === 1) count += 1; else count = 1;
    } else {
      count = 1;
    }

    await AsyncStorage.setItem(K_LAST, todayKey);
    await AsyncStorage.setItem(K_COUNT, String(count));
    AchieveEvents.emit("streak:update", { days: count, today: true });
  } catch {}
}
run();
