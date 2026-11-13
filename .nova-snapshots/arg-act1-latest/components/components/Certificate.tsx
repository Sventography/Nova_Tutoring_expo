import React, { useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

export default function Certificate({
  name,
  topic,
  score,
  total,
  timeText,
  dateText,
  onClose,
}: {
  name: string;
  topic: string;
  score: number;
  total: number;
  timeText: string;
  dateText: string;
  onClose: () => void;
}) {
  const ref = useRef<ViewShot>(null);
  const [working, setWorking] = useState(false);
  const shareImage = async () => {
    if (working) return;
    setWorking(true);
    try {
      const uri = await ref.current?.capture?.({ format: "png", quality: 1 });
      if (uri) await Sharing.shareAsync(uri);
    } finally {
      setWorking(false);
    }
  };
  const sharePdf = async () => {
    if (working) return;
    setWorking(true);
    try {
      const html = `<!DOCTYPE html>
      <html><head><meta charset="utf-8"/><style>
      body{font-family:Helvetica,Arial,sans-serif;text-align:center;background:#FAFAF5;}
      .border{border:8px solid #D4AF37;border-radius:24px;padding:20px;margin:20px;}
      .inner{border:3px solid #8B6C2F;border-radius:16px;padding:20px;}
      h1{font-size:28px;margin:12px 0;}
      h2{font-size:22px;margin:10px 0;}
      p{margin:6px 0;}
      .row{display:flex;justify-content:space-between;margin-top:30px;}
      .sign{width:140px;border-top:1px solid #888;margin-top:8px;}
      </style></head><body>
      <div class="border"><div class="inner">
        <h1>Certificate of Achievement</h1>
        <p>This certifies that</p>
        <h2>${name || "Student"}</h2>
        <p>has demonstrated excellence in</p>
        <h2>${topic}</h2>
        <p>Score ${score}/${total}</p>
        <p>Time ${timeText}</p>
        <div class="row">
          <div><strong>Date</strong><p>${dateText}</p></div>
          <div><strong>Director</strong><div class="sign"></div><p>Signature</p></div>
        </div>
      </div></div>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } finally {
      setWorking(false);
    }
  };
  const w = Dimensions.get("window").width - 32;
  return (
    <View style={{ padding: 16 }}>
      <ViewShot
        ref={ref}
        style={{
          backgroundColor: "#FAFAF5",
          borderWidth: 8,
          borderColor: "#D4AF37",
          borderRadius: 24,
          padding: 16,
        }}
      >
        <View
          style={{
            borderWidth: 3,
            borderColor: "#8B6C2F",
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: 1,
              marginTop: 6,
            }}
          >
            Certificate of Achievement
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            This certifies that
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "800", marginTop: 6 }}>
            {name || "Student"}
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            has demonstrated excellence in
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 4 }}>
            {topic}
          </Text>
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 18 }}>
              Score {score}/{total}
            </Text>
            <Text style={{ marginTop: 4 }}>Time {timeText}</Text>
          </View>
          <View
            style={{
              width: w - 90,
              height: 1,
              backgroundColor: "#D1D5DB",
              marginVertical: 20,
            }}
          />
          <View
            style={{
              width: w - 90,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "700" }}>Date</Text>
              <Text style={{ marginTop: 4 }}>{dateText}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "700" }}>Director</Text>
              <View
                style={{
                  width: 140,
                  height: 1,
                  backgroundColor: "#D1D5DB",
                  marginTop: 8,
                }}
              />
              <Text style={{ marginTop: 4, opacity: 0.7 }}>Signature</Text>
            </View>
          </View>
        </View>
      </ViewShot>
      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: "#E5E7EB",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Close</Text>
        </Pressable>
        <Pressable
          onPress={shareImage}
          disabled={working}
          style={{
            flex: 1,
            backgroundColor: "#111827",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginRight: 8,
            opacity: working ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {working ? "…" : "Share PNG"}
          </Text>
        </Pressable>
        <Pressable
          onPress={sharePdf}
          disabled={working}
          style={{
            flex: 1,
            backgroundColor: "#2563EB",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginLeft: 8,
            opacity: working ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {working ? "…" : "Share PDF"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
