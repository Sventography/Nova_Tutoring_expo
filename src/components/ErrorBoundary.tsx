import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

type Props = { children: React.ReactNode; onReset?: () => void; fallbackText?: string; };
type State = { hasError: boolean; error?: unknown; };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: undefined };
  static getDerivedStateFromError(error: unknown): State { return { hasError: true, error }; }
  handleReset = () => { this.setState({ hasError: false, error: undefined }); this.props.onReset?.(); };
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#000", padding: 16, justifyContent: "center" }}>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <Text style={{ color: "#fca5a5", fontSize: 18, fontWeight: "700" }}>Oops — something tripped.</Text>
            <Text style={{ color: "#e5e7eb" }}>{this.props.fallbackText ?? "A screen failed to render. You can try again."}</Text>
            <TouchableOpacity onPress={this.handleReset} style={{ alignSelf: "flex-start", backgroundColor: "#0ea5e9", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#38bdf8" }}>
              <Text style={{ color: "#001318", fontWeight: "800" }}>Try again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
