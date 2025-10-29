import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CertificateModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: hook into your certificate export
      console.log("Downloading certificate for", id);
    } finally {
      setLoading(false);
    }
  }, [id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Certificate</Text>
      <Text style={styles.subtitle}>
        This is your certificate for quiz attempt #{id}
      </Text>

      <Pressable
        onPress={handleDownload}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Download</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.close}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#00e5ff" },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    color: "#ccc",
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#00e5ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnPressed: { opacity: 0.8 },
  btnText: { color: "#000", fontWeight: "600" },
  close: { marginTop: 16 },
  closeText: { color: "#aaa" },
});
