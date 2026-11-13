import React from "react";
import { View } from "react-native";
import GradientBg from "./GradientBg";
import HeaderBar from "./HeaderBar";
import DonateFab from "./DonateFab";

type Props = {
  children: React.ReactNode;
  donate?: boolean;            // show donate fab? default true
  headerRight?: React.ReactNode;
  hideCoins?: boolean;         // hide coin pill
  colors?: string[];           // gradient colors
};
export default function BaseScreen({ children, donate=true, headerRight, hideCoins, colors }: Props) {
  return (
    <GradientBg colors={colors}>
      <HeaderBar right={headerRight} hideCoins={hideCoins} />
      <View style={{ flex:1, padding:16 }}>{children}</View>
      {donate && <DonateFab onPress={()=>{}} />}
    </GradientBg>
  );
}
