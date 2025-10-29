import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";

// If you have a logo asset, point to it here; otherwise the block stays hidden
const LOGO = require("../assets/logo.png"); // change if your path differs

type Props = {
  username: string;
  topic: string;
  date: string;        // already formatted (e.g., 10/06/2025)
  scorePct?: number;   // optional, displays when provided
  orgName?: string;    // e.g., "Nova Tutoring"
};

const CertificateView = forwardRef<View, Props>(({
  username = "Student",
  topic = "Algebra",
  date,
  scorePct,
  orgName = "Nova Tutoring",
}, ref) => {
  const scoreText = typeof scorePct === "number" ? `with a score of ${scorePct}%` : "with distinction";

  return (
    <View ref={ref} style={S.wrap}>

      {/* Outer neon frame */}
      <View style={S.outerFrame}>
        <View style={S.innerFrame}>

          {/* Dark panel gradient */}
          <LinearGradient
            colors={["#0b1320", "#08121b", "#070d14"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.panel}
          >

            {/* Title */}
            <Text style={S.title}>Certificate of Achievement</Text>

            {/* Subtitle */}
            <Text style={S.subtitle}>This certifies that</Text>

            {/* Name (gold pop) */}
            <Text style={S.name}>{username}</Text>

            {/* Body line */}
            <Text style={S.body}>has successfully completed the quiz on</Text>

            {/* Topic (cyan) */}
            <Text style={S.topic}>{topic}</Text>

            {/* Score / distinction */}
            <Text style={S.body}>{scoreText}</Text>

            {/* Logo (optional) */}
            <View style={{ height: 20 }} />
            {LOGO ? (
              <Image source={LOGO} style={S.logo} resizeMode="contain" />
            ) : null}

            {/* Footer strip */}
            <View style={{ flex: 1 }} />
            <View style={S.footer}>
              <View style={{ flex: 1 }}>
                <Text style={S.footerOrg}>{orgName}</Text>
                <Text style={S.footerDate}>Issued on {date}</Text>
              </View>

              {/* Signature block */}
              <View style={S.sigBlock}>
                <View style={S.sigLine} />
                <Text style={S.sigLabel}>Eric Svenningson</Text>
                <Text style={S.sigLabelDim}>Founder, {orgName}</Text>
              </View>

              {/* QR code */}
              <View style={S.qrWrap}>
                <QRCode
                  value={`${orgName}|${username}|${topic}|${date}`}
                  size={72}
                  backgroundColor="transparent"
                  color="#5df2ff"
                />
              </View>
            </View>

          </LinearGradient>
        </View>
      </View>
    </View>
  );
});

export default CertificateView;

/** 
 * Fixed canvas size for reliable capture:
 *  - 700 x 990 looks crisp at 2x scale via view-shot/html2canvas
 * Scale visually via parent if you want smaller render.
 */
const CANVAS_W = 700;
const CANVAS_H = 990;

export const S = StyleSheet.create({
  wrap: {
    width: CANVAS_W,
    height: CANVAS_H,
    alignSelf: "center",
  },
  outerFrame: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: "#27e6ff",
    backgroundColor: "#071018",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 20px rgba(39,230,255,0.35), inset 0 0 14px rgba(39,230,255,0.08)" }
      : { shadowColor: "#27e6ff", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }),
  },
  innerFrame: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#27e6ff",
    padding: 18,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 24,
  },

  title: {
    color: "#70f5ff",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#c8f6ff",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    opacity: 0.9,
  },
  name: {
    color: "#ffd166",
    textAlign: "center",
    marginTop: 12,
    fontSize: 30,
    fontWeight: "900",
  },
  body: {
    color: "#d6f9ff",
    textAlign: "center",
    marginTop: 8,
    fontSize: 16,
  },
  topic: {
    color: "#70f5ff",
    textAlign: "center",
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
  },
  logo: {
    alignSelf: "center",
    width: 140,
    height: 140,
    opacity: 0.95,
  },

  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginTop: 18,
  },
  footerOrg: {
    color: "#70f5ff",
    fontWeight: "900",
    fontSize: 16,
  },
  footerDate: {
    color: "#bfefff",
    marginTop: 4,
    fontSize: 12,
  },
  sigBlock: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sigLine: {
    width: 220,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  sigLabel: {
    color: "#e9fbff",
    fontWeight: "800",
    fontSize: 12,
  },
  sigLabelDim: {
    color: "#b7dbe6",
    fontSize: 11,
    marginTop: 2,
  },
  qrWrap: {
    marginLeft: "auto",
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(93,242,255,0.6)",
    backgroundColor: "rgba(0,20,30,0.6)",
  },
});
