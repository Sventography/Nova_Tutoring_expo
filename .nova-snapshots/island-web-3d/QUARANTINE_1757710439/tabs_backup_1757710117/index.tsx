import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Link } from "expo-router";
const Btn = ({ href, title }: { href: string; title: string }) => (
  <Link href={href} asChild>
    <TouchableOpacity style={{ backgroundColor:"#00ffff", paddingVertical:12, paddingHorizontal:16, borderRadius:12, marginBottom:10 }}>
      <Text style={{ color:"black", fontWeight:"800" }}>{title}</Text>
    </TouchableOpacity>
  </Link>
);
export default function TabsHome() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow:1, backgroundColor:"black", padding:20, alignItems:"center", justifyContent:"center" }}>
      <Text style={{ color:"white", fontSize:24, fontWeight:"800", marginBottom:20 }}>Nova — Dashboard</Text>
      <Btn href="/(tabs)/ask" title="Ask Nova" />
      <Btn href="/(tabs)/flashcards" title="Flashcards" />
      <Btn href="/(tabs)/quiz" title="Quiz" />
      <Btn href="/(tabs)/collections" title="Collections" />
      <Btn href="/(tabs)/shop" title="Shop" />
      <Btn href="/(tabs)/relax" title="Relax" />
      <Btn href="/(tabs)/brain" title="Brain Teasers" />
      <Btn href="/(tabs)/account" title="Account" />
    </ScrollView>
  );
}
