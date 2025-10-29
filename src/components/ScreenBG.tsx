import React from "react";
import { View, ImageBackground, StyleSheet } from "react-native";

type Props = {
  children?: React.ReactNode;
  source?: any;           // optional image source
  dim?: number;           // 0..1 overlay opacity
  color?: string;         // overlay color
};

export default function ScreenBG({ children, source, dim = 0.25, color = "black" }: Props) {
  const Overlay = () => <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: dim }]} />;
  if (source) {
    return (
      <ImageBackground source={source} resizeMode="cover" style={styles.fill}>
        <Overlay />
        <View style={styles.content}>{children}</View>
      </ImageBackground>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: "#000" }]}>
      <View style={[StyleSheet.absoluteFill, { borderColor: "#0ea5e9", opacity: 0.0 }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: "100%", height: "100%" },
  content: { flex: 1, padding: 16 }
});
