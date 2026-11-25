import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { discoveryNote } from "../_lib/discoveryReflection";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import LearningAdventure from "../components/LearningAdventure";
import DiscoveryPractice from "../components/DiscoveryPractice";
import DiscoveryLabs from "../components/DiscoveryLabs";
import { browseDiscoveries } from "../_lib/discoveryBrowse";
import { orderedAdventures, type Adventure } from "../_lib/adventureModel";
import { emptyJourney, journeyKey, normalizeJourney, toggleSaved, markCompleted, relatedDiscoveries, dailyDetour, type Journey } from "../_lib/journeyModel";
import { INTERESTS, DISCOVERIES, dailyDiscovery, localDay, normalizeInterests, discoveryStorageKey, jumpModel, type Interest, type Discovery } from "../_lib/discoveryModel";

export default function DiscoverScreen() {
  const { ready, session } = useUser();
  if (!ready) return <ActivityIndicator />;
  const owner = session?.user?.id ?? null;
  return <DiscoverBody key={discoveryStorageKey(owner)} owner={owner} />;
}

function DiscoverBody({ owner }: { owner: string | null }) {
  const { tokens } = useTheme();
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  const discoveryY = useRef(0);
  const libraryY = useRef(0);
  const journeyY = useRef(0);
  const detourY = useRef(0);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [draft, setDraft] = useState<Interest[]>([]);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [interestsReady,setInterestsReady] = useState(false);
  const [interestRetry,setInterestRetry] = useState(0);
  const [journeyRetry,setJourneyRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [day, setDay] = useState(localDay);
  const [chosen, setChosen] = useState<Discovery | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const adventureY = useRef(0);
  const [journey,setJourney] = useState<Journey>(emptyJourney);
  const [journeyReady,setJourneyReady] = useState(false);
  const [journeyStatus,setJourneyStatus] = useState("");
  const [journeyBusy,setJourneyBusy] = useState(false);
  const journeyRef = useRef<Journey>(emptyJourney());
  const journeyQueue = useRef<Promise<void>>(Promise.resolve());
  const personalKey = journeyKey(owner);
  const [savedOnly,setSavedOnly] = useState(false);
  const [query,setQuery] = useState("");
  const [subject,setSubject] = useState<Interest | "all">("all");
  const key = discoveryStorageKey(owner);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(key).then(raw => {
      if (!live) return;
      const next = normalizeInterests(raw ? JSON.parse(raw) : []);
      setInterests(next); setDraft(next); setInterestsReady(true); setStatus("");
    }).catch(() => { if (live) { setInterestsReady(false); setStatus("Could not load your interests. You can still explore; existing preferences have not been overwritten."); } })
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [key,interestRetry]);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(personalKey).then(raw => {
      if (!live) return;
      const next = normalizeJourney(raw ? JSON.parse(raw) : null);
      journeyRef.current = next; setJourney(next); setJourneyReady(true); setJourneyStatus("");
    }).catch(() => { if (live) setJourneyStatus("Your saved journey could not be loaded. Use Retry loading below; existing data has not been overwritten."); });
    return () => { live = false; };
  }, [personalKey,journeyRetry]);
  function updateJourney(change: (old: Journey) => Journey) {
    if (!journeyReady) { setJourneyStatus("Your journey is not available yet. You can still explore."); return; }
    setJourneyBusy(true);
    const task = journeyQueue.current.then(async () => {
      const next = change(journeyRef.current);
      if (next === journeyRef.current) return;
      await AsyncStorage.setItem(personalKey, JSON.stringify(next));
      journeyRef.current = next; setJourney(next); setJourneyStatus("");
    }).catch(() => setJourneyStatus("Could not save your journey. Please try again."));
    journeyQueue.current = task;
    void task.then(() => { if (journeyQueue.current === task) setJourneyBusy(false); });
  }
  useFocusEffect(useCallback(() => { setDay(localDay()); }, []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state === "active") setDay(localDay()); });
    return () => sub.remove();
  }, []);
  async function save() {
    if (saving || !interestsReady) return;
    setSaving(true); setStatus("");
    try {
      await AsyncStorage.setItem(key, JSON.stringify(draft));
      setInterests(draft); setEditing(false); setChosen(null);
    } catch { setStatus("Could not save your interests. Try again."); }
    finally { setSaving(false); }
  }
  const daily = dailyDiscovery(interests, day);
  const current = chosen ?? daily;
  const detour = interestsReady ? dailyDetour(interests, day) : undefined;
  const ordered = browseDiscoveries(DISCOVERIES,{query,subject,savedOnly,saved:journey.saved,interests});
  const openDiscovery = (d: Discovery) => { setChosen(d); scroll.current?.scrollTo({ y: discoveryY.current, animated: true }); };
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
  return <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Text style={[s.eyebrow, ink]}>NOVA DISCOVER</Text>
    <Text accessibilityRole="header" style={[s.title, ink]}>What are you curious about?</Text>
    <Text style={[s.body, ink]}>Explore something unexpected, follow your interests, or get straight to your schoolwork.</Text>
    <View style={[s.card,card]}>
      <Text accessibilityRole="header" style={[s.heading,ink]}>What would you like to do?</Text>
      <View style={s.wrap}>
        {button("Today's discovery",()=>{setChosen(null);scroll.current?.scrollTo({y:discoveryY.current,animated:true});})}
        {detour && button("A Little Further Afield",()=>scroll.current?.scrollTo({y:detourY.current,animated:true}))}
        {button("Learning adventures",()=>scroll.current?.scrollTo({y:adventureY.current,animated:true}))}
        {button("Browse topics",()=>scroll.current?.scrollTo({y:libraryY.current,animated:true}))}
        {button("My learning journey",()=>scroll.current?.scrollTo({y:journeyY.current,animated:true}))}
      </View>
      <Text style={[s.heading,ink]}>School & study tools</Text>
      <View style={s.wrap}>
        {button("Ask Nova",()=>go("/ask"))}{button("Flashcards",()=>go("/flashcards"))}
        {button("Quizzes",()=>go("/quiz"))}{button("Brainteasers",()=>go("/brainteasers"))}
        {button("My Journal",()=>go("/journal"))}{button("My Island",()=>go("/island"))}
      </View>
    </View>
    <View style={[s.card, card]}>
      <Text accessibilityRole="header" style={[s.heading, ink]}>Your interests</Text>
      <Text style={[s.body, ink]}>{interests.length ? interests.map(label).join(" · ") : "Explore everything or pick the subjects you love. You can change these whenever you like."}</Text>
      {!interestsReady ? button("Retry loading interests",()=>setInterestRetry(n=>n+1)) : !editing ? button(interests.length ? "Edit interests" : "Choose interests", () => { setDraft(interests); setEditing(true); }) : <>
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
    <View style={[s.card, card]} onLayout={e => { discoveryY.current = e.nativeEvent.layout.y; }}>
      <Text style={[s.eyebrow, ink]}>{chosen ? "EXPLORE" : "TODAY’S DISCOVERY"} · {label(current.interest)}</Text>
      <Text accessibilityRole="header" style={[s.title, ink]}>{current.title}</Text>
      <Text style={[s.body, ink]}>{current.hook}</Text>
      <Text style={[s.heading, ink]}>Why it works</Text>
      <Text style={[s.body, ink]}>{current.insight}</Text>
      <Text style={[s.heading, ink]}>Try it yourself</Text>
      <Text style={[s.body, ink]}>{current.activity}</Text>
      {current.id === "space-gravity" && <GravityLab />}
      {current.id === "art-color" && <ColorLab />}
      <DiscoveryLabs key={`lab-${current.id}`} discoveryId={current.id} />
      <DiscoveryPractice key={`practice-${current.id}`} discoveryId={current.id} />
      <DiscoveryReflection key={current.id} discoveryId={current.id} onOpenJournal={() => go("/journal")} />
      {button(journey.saved.includes(current.id) ? "Remove from my saved discoveries" : "Save to my discoveries", () => updateJourney(old => toggleSaved(old,current.id)), !journeyReady || journeyBusy)}
      {button("Explore further with Ask Nova", () => router.push({ pathname: "/ask", params: { discovery: current.id } } as any))}
      <Text style={[s.small, ink]}>This discovery is free to explore. Follow-up AI questions use your existing Ask plan.</Text>
      {chosen && button("Back to today's discovery", () => setChosen(null))}
      <Text style={[s.heading,ink]}>Connect the dots</Text>
      {relatedDiscoveries(current.id).map(d => <Pressable key={d.id} accessibilityRole="button" onPress={() => openDiscovery(d)} style={[s.button,card]}><Text style={[s.eyebrow,ink]}>{label(d.interest)}</Text><Text style={[s.buttonText,ink]}>{d.title}</Text></Pressable>)}
    </View>
    {detour && <View style={[s.card,card]} onLayout={e=>{detourY.current=e.nativeEvent.layout.y;}}>
      <Text accessibilityRole="header" style={[s.heading,ink]}>A Little Further Afield</Text>
      <Text style={[s.small,ink]}>Afield means away from familiar places or subjects. Follow your curiosity somewhere new.</Text>
      <Text style={[s.eyebrow,ink]}>{label(detour.discovery.interest)} · Connected to {label(detour.connectedFrom.interest)}</Text>
      <Text style={[s.heading,ink]}>{detour.discovery.title}</Text>
      <Text style={[s.body,ink]}>{detour.discovery.hook}</Text>
      <Text style={[s.small,ink]}>Related discovery in your interests: {detour.connectedFrom.title}</Text>
      {button("Explore this connection",()=>openDiscovery(detour.discovery))}
      <Text style={[s.small,ink]}>Optional and free. Your daily discovery stays available.</Text>
    </View>}
    <View style={[s.card,card]} onLayout={e=>{journeyY.current=e.nativeEvent.layout.y;}}>
      <Text accessibilityRole="header" style={[s.heading,ink]}>My learning journey</Text>
      <Text style={[s.body,ink]}>{journey.saved.length} saved discoveries · {journey.completed.length} adventures explored</Text>
      <Text style={[s.small,ink]}>A private collection of things you chose to explore, stored on this device. No streaks or rankings.</Text>
      {!!journeyStatus && <Text accessibilityLiveRegion="polite" style={ink}>{journeyStatus}</Text>}
      {!journeyReady && !!journeyStatus && button("Retry loading journey",()=>setJourneyRetry(n=>n+1))}
      {journey.saved.map(id => DISCOVERIES.find(d=>d.id===id)).filter((d):d is Discovery=>!!d).map(d => <Pressable key={d.id} accessibilityRole="button" onPress={()=>openDiscovery(d)} style={[s.button,card]}><Text style={[s.buttonText,ink]}>{d.title}</Text></Pressable>)}
      {journey.completed.length > 0 && <Text style={[s.small,ink]}>Completed adventures are available to replay below.</Text>}
    </View>
    <View onLayout={e => { adventureY.current = e.nativeEvent.layout.y; }} style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[s.heading, ink]}>Choose your own learning adventure</Text>
      <Text style={[s.body, ink]}>Step into a story, make decisions, and see what your choices teach you.</Text>
      {adventure ? <LearningAdventure key={adventure.id} adventure={adventure} onExit={() => setAdventure(null)} completed={journey.completed.includes(adventure.id)} onComplete={() => updateJourney(old => markCompleted(old,adventure.id))} /> : orderedAdventures(interests).map(item => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => { setAdventure(item); scroll.current?.scrollTo({ y: adventureY.current, animated: true }); }} style={[s.card,card]}>
          <Text style={[s.eyebrow,ink]}>{label(item.interest)}</Text>
          <Text style={[s.heading,ink]}>{item.title}</Text>
          <Text style={[s.body,ink]}>{item.description}</Text>
          <Text style={[s.small,ink]}>{journey.completed.includes(item.id) ? "Explored · replay anytime" : "Begin adventure · free"}</Text>
        </Pressable>
      ))}
    </View>
    <View style={[s.card,card]} onLayout={e=>{libraryY.current=e.nativeEvent.layout.y;}}>
      <Text accessibilityRole="header" style={[s.heading,ink]}>Follow another rabbit hole</Text>
      <Text style={[s.small,ink]}>Explore any subject, even outside your interests. No missed-day penalties.</Text>
      <TextInput accessibilityLabel="Search discovery topics" placeholder="Search discoveries…" placeholderTextColor={tokens.text} value={query} onChangeText={setQuery} maxLength={100} returnKeyType="search" style={[s.search,ink,{borderColor:tokens.border,backgroundColor:tokens.bg}]} />
      <View style={s.wrap}>
        {([["all","All topics"],...INTERESTS] as const).map(([id,name])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:subject===id}} onPress={()=>setSubject(id)} style={[s.chip,card,subject===id&&{borderColor:tokens.accent,borderWidth:2}]}><Text style={[ink,{fontWeight:subject===id?"700":"400"}]}>{subject===id?"✓ ":""}{name}</Text></Pressable>)}
      </View>
      <View style={s.wrap}>
        {button(savedOnly?"Show all discoveries":"Show saved only",()=>setSavedOnly(x=>!x),!journeyReady)}
        {button("Clear filters",()=>{setQuery("");setSubject("all");setSavedOnly(false);})}
      </View>
      <Text accessibilityLiveRegion="polite" style={[s.small,ink]}>{ordered.length} {ordered.length===1?"discovery":"discoveries"} found</Text>
      {!ordered.length&&<Text style={[s.body,ink]}>No discoveries match these filters. Try another topic or clear the filters.</Text>}
    </View>
    {ordered.map(d => <Pressable key={d.id} accessibilityRole="button" onPress={() => openDiscovery(d)}
      style={[s.card, card, { gap: 4 }, current.id === d.id && { borderColor: tokens.accent }]}>
      <Text style={[s.eyebrow, ink]}>{label(d.interest)}</Text>
      <Text style={[s.heading, ink]}>{d.title}</Text>
      <Text style={[s.body, ink]}>{d.hook}</Text>
      <Text style={[s.small, ink]}>{current.id === d.id ? "Currently exploring above" : "Open discovery"}</Text>
    </Pressable>)}
  </ScrollView>;
}

function DiscoveryReflection({ discoveryId, onOpenJournal }: { discoveryId: string; onOpenJournal: () => void }) {
  const { tokens } = useTheme();
  const [copyStatus,setCopyStatus] = useState("");
  const [showNote,setShowNote] = useState(false);
  const note = discoveryNote(discoveryId);
  const ink = { color: tokens.text };
  const action = (title: string, run: () => void) => <Pressable accessibilityRole="button"
    onPress={run} style={[s.button,{borderColor:tokens.border,backgroundColor:tokens.bg}]}>
    <Text style={[s.buttonText,ink]}>{title}</Text>
  </Pressable>;
  async function copy() {
    if (!note) return;
    try {
      if (await Clipboard.setStringAsync(note)) {
        setCopyStatus("Copied. Open your Journal and paste into a note you choose.");
        return;
      }
    } catch { /* Use the selectable template below. */ }
    setShowNote(true); setCopyStatus("Clipboard unavailable. Select and copy the template manually.");
  }
  return <View style={{gap:10,borderTopWidth:1,borderColor:tokens.border,paddingTop:12}}>
    <Text style={[s.heading,ink]}>Make it your own</Text>
    <Text style={[s.body,ink]}>Keep the discovery in your Journal, add your own thoughts, or write a question for later.</Text>
    {action("Copy discovery note template",()=>void copy())}
    {action(showNote ? "Hide note template" : "Preview note template",()=>setShowNote(x=>!x))}
    {showNote && <Text selectable style={[s.body,ink]}>{note}</Text>}
    {!!copyStatus && <Text accessibilityLiveRegion="polite" style={[s.small,ink]}>{copyStatus}</Text>}
    {action("Open My Journal",onOpenJournal)}
    <Text style={[s.small,ink]}>Nothing is added to your Journal automatically. Copying includes only the public lesson, not your private notes.</Text>
  </View>;
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
  search:{borderWidth:1,borderRadius:10,padding:12,minHeight:44,fontSize:16},
});
