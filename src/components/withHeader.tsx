import React from "react";
import { View, Text } from "react-native";

type HeaderOptions = { title?: string };

function withHeader<P>(Wrapped: React.ComponentType<P>, options: HeaderOptions = {}) {
  return function WithHeader(props: P) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={{ paddingTop: 14, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#111" }}>
          <Text style={{ color: "#00ffff", fontSize: 18, fontWeight: "600" }}>
            {options.title ?? ""}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Wrapped {...props} />
        </View>
      </View>
    );
  };
}

export { withHeader };
export default withHeader;
