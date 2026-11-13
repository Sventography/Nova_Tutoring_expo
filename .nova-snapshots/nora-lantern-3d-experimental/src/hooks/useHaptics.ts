import * as Haptics from "expo-haptics";

export function useHaptics() {
  const tap = () => {
    Haptics.selectionAsync();
  };

  const success = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const warn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  return { tap, success, warn };
}
