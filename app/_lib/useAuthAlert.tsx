import React, { useRef, useState } from "react";
import {
  Alert,
  AlertButton,
  AlertOptions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AuthAlert = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

// React Native Web's Alert.alert is a no-op. Keep native dialogs and their
// actions, while providing the same visible feedback in the browser.
export function useAuthAlert() {
  const [current, setCurrent] = useState<AuthAlert | null>(null);
  const active = useRef<AuthAlert | null>(null);

  function alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    if (Platform.OS !== "web") {
      Alert.alert(title, message, buttons, options);
      return;
    }

    const next = {
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: "OK" }],
      options,
    };
    active.current = next;
    setCurrent(next);
  }

  function choose(button: AlertButton) {
    if (!current || active.current !== current) return;
    active.current = null;
    setCurrent(null);
    button.onPress?.();
  }

  function dismiss() {
    if (!current || current.options?.cancelable === false) return;
    const options = current.options;
    choose(current.buttons.find((button) => button.style === "cancel") || {});
    options?.onDismiss?.();
  }

  const feedback = current ? (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityViewIsModal
          accessibilityLabel={current.title}
        >
          <ScrollView>
            <Text style={styles.title}>{current.title}</Text>
            {current.message ? (
              <Text style={styles.message}>{current.message}</Text>
            ) : null}
          </ScrollView>
          <View style={styles.buttons}>
            {current.buttons.map((button, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => choose(button)}
                style={styles.button}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "destructive" && styles.destructive,
                  ]}
                >
                  {button.text || "OK"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  return { alert, feedback };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#8b74ff",
    backgroundColor: "#101827",
  },
  title: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  message: { color: "#e1e7f0", marginTop: 12, fontSize: 16, lineHeight: 24 },
  buttons: { marginTop: 20, gap: 8 },
  button: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#293852",
    padding: 12,
  },
  buttonText: { color: "#bfefff", fontSize: 16, fontWeight: "700" },
  destructive: { color: "#ffb2ba" },
});
