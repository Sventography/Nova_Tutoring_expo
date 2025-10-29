import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs initialRouteName="flashcards" screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="flashcards"    options={{ title: "Cards" }} />
      <Tabs.Screen name="quiz"          options={{ title: "Quiz" }} />
      <Tabs.Screen name="history"       options={{ title: "History" }} />
      <Tabs.Screen name="certificates"  options={{ title: "Certs" }} />
      <Tabs.Screen name="shop"          options={{ title: "Shop" }} />
    </Tabs>
  );
}
