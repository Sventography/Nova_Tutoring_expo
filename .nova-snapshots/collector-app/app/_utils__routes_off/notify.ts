import { Platform, Alert, ToastAndroid } from "react-native";

export function notify(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("Nova", msg);
  }
}
