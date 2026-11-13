import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ViewStyle,
  TextStyle,
  PressableProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../constants/theme";

export function NeonScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      tone="text"
      style={{
        color: theme.text,
        fontSize: 22,
        fontWeight: "800",
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

export function NeonText({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[{ color: theme.text }, style]}>{children}</Text>;
}

export function NeonSub({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[{ color: theme.textDim }, style]}>{children}</Text>;
}

export function NeonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      variant="bg"
      style={[
        {
          backgroundColor: theme.bgCard,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function NeonButton({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: PressableProps["onPress"];
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={async (e) => {
        try {
          await Haptics.selectionAsync();
        } catch {}
        onPress?.(e);
      }}
      disabled={disabled}
      style={[
        { borderRadius: 14, overflow: "hidden", opacity: disabled ? 0.6 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.neon, "#89d6ff", theme.black]} // cyan → light blue → black
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 12, alignItems: "center", borderRadius: 14 }}
      >
        <Text style={{ color: "#001018", fontWeight: "800" }}>{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function NeonPill({
  children,
  onPress,
  active,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? theme.neonAlt : theme.bgCard,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{ color: active ? "#001018" : theme.textDim, fontWeight: "700" }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function NeonInput({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#6f8aa3"
      multiline={multiline}
      style={{
        color: theme.text,
        backgroundColor: theme.bgCard,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 10,
        minHeight: multiline ? 84 : undefined,
      }}
    />
  );
}
