import { Tabs } from "expo-router";

export default function TabsLayout(){
  return (
    <Tabs initialRouteName="ask" screenOptions={{ headerShown:false }}>
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
      <Tabs.Screen name="flashcards" options={{ title: "Flashcards" }} />
      <Tabs.Screen name="collection" options={{ title: "Collection" }} />
      <Tabs.Screen name="customize" options={{ title: "Customize" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
    </Tabs>
  );
}
