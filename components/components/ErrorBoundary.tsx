import React from "react";
import { View, Text } from "react-native";
import NButton from "./NButton";
type State = { hasError: boolean };
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text
            style={{ color: "#444", textAlign: "center", marginBottom: 16 }}
          >
            Try returning to the previous screen
          </Text>
          <NButton
            title="Reload"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      );
    }
    return this.props.children as any;
  }
}
