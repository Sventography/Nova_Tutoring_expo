import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { INTERESTS, DISCOVERIES, dailyDiscovery, localDay, normalizeInterests, discoveryStorageKey, jumpModel, type Interest, type Discovery } from "../_lib/discoveryModel";

export default function DiscoverScreen() {
  const { ready, session } = useUser();
  if (!ready) return <ActivityIndicator />;
  const owner = session?.user?.id ?? null;
  return <DiscoverBody key={owner ?? "guest"} owner={owner} />;
}

function DiscoverBody({ owner }: { owner: string | null }) {
  const { tokens } = useTheme();
  const router = useRouter();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [draft, setDraft] = useState<Interest[]>([]);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [day, setDay] = useState(localDay);
  const [chosen, setChosen] = useState<Discovery | null>(null);
  const key = discoveryStorageKey(owner);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(key).then(raw => {
      if (!live) return;
      let parsed: unknown = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch { /* recover defaults */ }
      const next = normalizeInterests(parsed);
      setInterests(next); setDraft(next);
    }).catch(() => { if (live) setStatus("Could not load your interests. You can still explore."); })
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [key]);
  useFocusEffect(useCallback(() => { setDay(localDay()); }, []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state === "active") setDay(localDay()); });
    return () => sub.remove();
  }, []);
  async function save() {
    if (saving) return;
    setSaving(true); setStatus("");
    try {
      await AsyncStorage.setItem(key, JSON.stringify(draft));
      setInterests(draft); setEditing(false); setChosen(null);
    } catch { setStatus("Could not save your interests. Try again."); }
    finally { setSaving(false); }
  }
  const daily = dailyDiscovery(interests, day);
  const current = chosen ?? daily;
  const ordered = [...DISCOVERIES.filter(d => interests.includes(d.interest)), ...DISCOVERIES.filter(d => !interests.includes(d.interest))];
  const label = (interest: Interest) => INTERESTS.find(([id]) => id === interest)?.[1] ?? interest;
  const card = { backgroundColor: tokens.card, borderColor: tokens.border };
  const ink = { color: tokens.text };
  const button = (title: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[s.button, card, disabled && { opacity: .5 }]}>
      <Text style={[ink, s.buttonText]}>{title}</Text>
    </Pressable>
  );
  const go = (pathname: string) => router.push(pathname as any);
  if (!loaded) return <ActivityIndicator color={tokens.accent} />;
  return <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={s.page}>
    <Text style={[s.eyebrow, ink]}>NOVA DISCOVER</Text>
    <Text accessibilityRole="header" style={[s.title, ink]}>What are you curious about?</Text>
    <Text style={[s.body, ink]}>Explore something unexpected, follow your interests, or get straight to your schoolwork.</Text>
    <View style={[s.card, card]}>
      <Text accessibilityRole="header" style={[s.heading, ink]}>Your interests</Text>
      <Text style={[s.body, ink]}>{interests.length ? interests.map(label).join(" · ") : "Explore everything or pick the subjects you love. You can change these whenever you like."}</Text>
      {!editing ? button(interests.length ? "Edit interests" : "Choose interests", () => { setDraft(interests); setEditing(true); }) : <>
        <View style={s.wrap}>
          {INTERESTS.map(([id, name]) => {
            const selected = draft.includes(id);
            return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected, disabled: saving }} disabled={saving}
              onPress={() => setDraft(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])}
              style={[s.chip, card, selected && { borderColor: tokens.accent, borderWidth: 2 }]}>
              <Text style={[ink, { fontWeight: selected ? "700" : "400" }]}>{selected ? "✓ " : ""}{name}</Text>
            </Pressable>;
          })}
        </View>
        <View style={s.wrap}>{button("Save interests", () => void save(), saving)}{button("Cancel", () => setEditing(false), saving)}</View>
        <Text style={[s.small, ink]}>Saved only on this device for your current account or guest profile.</Text>
      </>}
      {!!status && <Text accessibilityLiveRegion="polite" style={ink}>{status}</Text>}
    </View>
    <View style={[s.card, card]}>
      <Text style={[s.eyebrow, ink]}>{chosen ? "EXPLORE" : "TODAY’S DISCOVERY"} · {label(current.interest)}</Text>
      <Text accessibilityRole="header" style={[s.title, ink]}>{current.title}</Text>
      <Text style={[s.body, ink]}>{current.hook}</Text>
      <Text style={[s.heading, ink]}>Why it works</Text>
      <Text style={[s.body, ink]}>{current.insight}</Text>
      <Text style={[s.heading, ink]}>Try it yourself</Text>
      <Text style={[s.body, ink]}>{current.activity}</Text>
      {current.id === "space-gravity" && <GravityLab />}
      {current.id === "art-color" && <ColorLab />}
      {button("Explore further with Ask Nova", () => router.push({ pathname: "/ask", params: { discovery: current.id } } as any))}
      <Text style={[s.small, ink]}>This discovery is free to explore. Follow-up AI questions use your existing Ask plan.</Text>
      {chosen && button("Back to today's discovery", () => setChosen(null))}
    </View>
    <View style={[s.card, card]}>
      <Text accessibilityRole="header" style={[s.heading, ink]}>Need to study?</Text>
      <Text style={[s.body, ink]}>Your usual learning tools are always available.</Text>
      <View style={s.wrap}>
        {button("Ask Nova", () => go("/ask"))}{button("Flashcards", () => go("/flashcards"))}
        {button("Quizzes", () => go("/quiz"))}{button("Brainteasers", () => go("/brainteasers"))}
        {button("My Journal", () => go("/journal"))}{button("My Island", () => go("/island"))}
      </View>
    </View>
    <Text accessibilityRole="header" style={[s.heading, ink]}>Follow another rabbit hole</Text>
    <Text style={[s.small, ink]}>All discoveries remain available. No missed-day penalties or extra rewards required.</Text>
    {ordered.map(d => <Pressable key={d.id} accessibilityRole="button" onPress={() => setChosen(d)}
      style={[s.card, card, { gap: 4 }, current.id === d.id && { borderColor: tokens.accent }]}>
      <Text style={[s.eyebrow, ink]}>{label(d.interest)}</Text>
      <Text style={[s.heading, ink]}>{d.title}</Text>
      <Text style={[s.body, ink]}>{d.hook}</Text>
      <Text style={[s.small, ink]}>{current.id === d.id ? "Currently exploring above" : "Open discovery above"}</Text>
    </Pressable>)}
  </ScrollView>;
}

function GravityLab() {
  const { tokens } = useTheme();
  const worlds = [{ name:"Earth", g:9.81 }, { name:"Mars", g:3.71 }, { name:"Moon", g:1.62 }];
  const [index, setIndex] = useState(0);
  const result = jumpModel(worlds[index].g);
  return <View style={{ gap: 8 }}>
    <Text style={{ color: tokens.text }}>Same takeoff speed: 3 m/s. Choose a world:</Text>
    <View style={s.wrap}>{worlds.map((w,i) => <Pressable key={w.name} accessibilityRole="button"
      accessibilityState={{ selected: index === i }} onPress={() => setIndex(i)}
      style={[s.chip, { borderColor: index === i ? tokens.accent : tokens.border }]}>
      <Text style={{ color: tokens.text }}>{index === i ? "✓ " : ""}{w.name}</Text>
    </Pressable>)}</View>
    <View style={{ height: 132, justifyContent: "flex-end", borderBottomWidth: 2, borderColor: tokens.border }}>
      <View style={{ height: Math.max(14, result.meters / 3 * 125), width: 36, backgroundColor: tokens.accent, borderRadius: 8, alignSelf:"center" }} />
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: tokens.text }}>{worlds[index].name}: {result.meters.toFixed(2)} m peak height · {result.seconds.toFixed(2)} s airborne</Text>
    <Text style={{ color: tokens.text }}>Model assumes level landing and no air resistance.</Text>
  </View>;
}
function ColorLab() {
  const { tokens } = useTheme();
  const [swap, setSwap] = useState(false);
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection:"row", gap: 8 }}>
      {[swap ? "#fff" : "#101010", swap ? "#101010" : "#fff"].map((bg,i) =>
        <View key={i} style={{ flex:1, height:100, backgroundColor:bg, alignItems:"center", justifyContent:"center" }}>
          <View style={{ width:46, height:46, backgroundColor:"#808080" }} />
        </View>)}
    </View>
    <Pressable accessibilityRole="button" onPress={() => setSwap(x => !x)} style={[s.button,{ borderColor:tokens.border }]}>
      <Text style={{ color:tokens.text }}>Swap backgrounds</Text>
    </Pressable>
    <Text style={{ color:tokens.text }}>Both center squares are exactly #808080. Only their surroundings change.</Text>
  </View>;
}
const s = StyleSheet.create({
  page:{ padding:16, paddingBottom:40, gap:14, width:"100%", maxWidth:860, alignSelf:"center" },
  card:{ borderWidth:1, borderRadius:16, padding:16, gap:10 },
  title:{ fontSize:26, fontWeight:"800" }, heading:{ fontSize:17, fontWeight:"700" },
  eyebrow:{ fontSize:12, fontWeight:"700", letterSpacing:.7 }, body:{ fontSize:15, lineHeight:22 },
  small:{ fontSize:12, lineHeight:18 }, wrap:{ flexDirection:"row", flexWrap:"wrap", gap:8 },
  chip:{ borderWidth:1, borderRadius:18, paddingHorizontal:12, paddingVertical:10, minHeight:44, justifyContent:"center" },
  button:{ borderWidth:1, borderRadius:10, padding:12, minHeight:44, justifyContent:"center" },
  buttonText:{ fontWeight:"700" },
});
