import * as Haptics from "expo-haptics";
export async function fxSelect() {
  await Haptics.selectionAsync();
}
export async function fxFinish() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
