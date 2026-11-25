import { useUser } from "./context/UserContext";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CONTACT_SHEET, LANTERN_SOURCE, RELAY_TRANSCRIPT } from "./_lib/archiveArtifacts";
import { getArchiveFlags, getArgDiscoveryState, markArchiveFlag } from "./utils/argState";

function channelLink(raw: string | undefined, channel: "instagram" | "discord"): string | null {
  if (!raw) return null;
  try {
    const link = new URL(raw);
    if (link.protocol !== "https:" || link.username || link.password || link.port || link.search || link.hash) return null;
    if (channel === "instagram" && ["www.instagram.com", "instagram.com"].includes(link.hostname) &&
        /^\/(?:p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(link.pathname)) return link.href;
    if (channel === "discord" && link.hostname === "discord.com" &&
        /^\/channels\/\d+\/\d+\/\d+\/?$/.test(link.pathname)) return link.href;
  } catch { /* An unconfigured channel leaves its in-app copy available. */ }
  return null;
}

const instagram = channelLink(process.env.EXPO_PUBLIC_ARCHIVE_INSTAGRAM_POST, "instagram");
const discord = channelLink(process.env.EXPO_PUBLIC_ARCHIVE_DISCORD_MESSAGE, "discord");

function ExternalCopy({ url, title }: { url: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (!url) return null;
  return (
    <>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(url).catch(() => setFailed(true))}
        style={s.link}
      >
        <Text style={s.action}>{title} ↗</Text>
      </Pressable>
      {failed ? <Text accessibilityLiveRegion="polite" style={s.body}>The original is unavailable. The copy above has the full clue.</Text> : null}
    </>
  );
}

export default function ArchiveFieldNotes() {
  const { ready, session } = useUser();
  if (!ready) return null;
  const owner = session?.user?.id ?? null;
  return <ArchiveFieldNotesBody key={owner ?? "guest"} owner={owner} />;
}
function ArchiveFieldNotesBody({ owner }: { owner: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "open" | "sealed" | "error">("loading");
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([getArgDiscoveryState(owner), getArchiveFlags(owner)]).then(async ([discovery, flags]) => {
      if (!active) return;
      if (!discovery.libraryNotebookDiscovered || !flags.copyUnlocked) {
        setState("sealed");
        return;
      }
      await markArchiveFlag("copyRead", owner);
      if (active) setState("open");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []));

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Pressable accessibilityRole="button" style={s.link}
        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/ask")}>
        <Text style={s.action}>← Back to Ask Nova</Text>
      </Pressable>
      <Text style={s.eyebrow}>NOVA // ARCHIVE</Text>
      <Text accessibilityRole="header" style={s.title}>Lantern Field Notes</Text>
      {state === "loading" ? <ActivityIndicator color="#eac77d" /> : null}
      {state === "sealed" ? <Text style={s.body}>The Lantern copy is sealed. Ask Nova where Nora kept the first answer once you've read her notebook.</Text> : null}
      {state === "error" ? <Text style={s.body}>The copy did not open. Return to Ask Nova and reopen it.</Text> : null}
      {state === "open" ? (
        <>
          <View style={s.card}>
            <Text style={s.eyebrow}>CONTACT SHEET · OBSERVATORY COPY</Text>
            <Text accessibilityRole="header" style={s.heading}>One frame missing from the index</Text>
            {CONTACT_SHEET.map(frame => (
              <View key={frame.number} style={[s.frame, frame.number === "17" && s.pencil]}>
                <Text style={s.number}>{frame.number}</Text>
                <Text style={s.frameWords}>{frame.mark} / {frame.lettering}</Text>
              </View>
            ))}
            <ExternalCopy url={instagram} title="View original contact sheet on Instagram" />
          </View>
          <View style={s.card}>
            <Text style={s.eyebrow}>RELAY TRANSCRIPT · MIRRORED LOG</Text>
            <Text accessibilityRole="header" style={s.heading}>Before the index updated</Text>
            {RELAY_TRANSCRIPT.map(line => <Text key={line} selectable style={s.body}>{line}</Text>)}
            <ExternalCopy url={discord} title="View original transmission on Discord" />
          </View>
          <View style={s.card}>
            <Text style={s.eyebrow}>READ-ONLY SOURCE · NV-017</Text>
            <Text accessibilityRole="header" style={s.heading}>Lantern’s recovery order</Text>
            <Text selectable style={s.code}>{LANTERN_SOURCE}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#160f24" },
  content: { width: "100%", alignSelf: "center", maxWidth: 760, padding: 22, paddingBottom: 50, gap: 13 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, color: "#eac77d", fontWeight: "700" },
  title: { fontSize: 32, color: "#f9eaca", fontWeight: "800", marginBottom: 6 },
  heading: { fontSize: 20, color: "#f9eaca", fontWeight: "700" },
  card: { padding: 16, gap: 10, borderWidth: 1, borderColor: "#8a63a4", borderLeftColor: "#eac77d", borderLeftWidth: 3, borderRadius: 12, backgroundColor: "#241838" },
  body: { color: "#f0e5f3", fontSize: 16, lineHeight: 25 },
  frame: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 10, borderRadius: 6, borderColor: "#694c7b" },
  pencil: { borderStyle: "dashed", borderColor: "#eac77d" },
  number: { color: "#ffe5aa", fontSize: 18, fontFamily: "monospace" },
  frameWords: { flex: 1, color: "#f0e5f3", fontFamily: "monospace", fontSize: 12 },
  code: { backgroundColor: "#110b1b", borderRadius: 7, color: "#ffe5aa", fontFamily: "monospace", padding: 12, lineHeight: 22 },
  link: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  action: { color: "#f8d68f", fontWeight: "700" },
});
