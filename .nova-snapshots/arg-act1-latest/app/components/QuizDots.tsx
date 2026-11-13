import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Animated, Easing, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { getTopics, type TopicIndex, getCardsById } from "../_lib/flashcards";
import { buildQuiz, type MCQ } from "../_lib/quiz";

const QUIZ_LEN = 20;
const QUIZ_SECONDS = 5 * 60;
const FEEDBACK_DELAY = 450;

function useTimer(seconds: number, running: boolean, onDone: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef<NodeJS.Timer | null>(null);
  useEffect(() => {
    if (!running) return;
    ref.current && clearInterval(ref.current);
    ref.current = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) { clearInterval(ref.current!); onDone(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { ref.current && clearInterval(ref.current); };
  }, [running, onDone]);
  const mm = Math.floor(remaining / 60).toString();
  const ss = (remaining % 60).toString().padStart(2, "0");
  return { remaining, label: `${mm}:${ss}`, reset: (n = seconds) => setRemaining(n) };
}

export default function QuizScreen() {
  const topics = useMemo<TopicIndex[]>(() => getTopics(), []);

  const [sel, setSel] = useState<TopicIndex | null>(null);
  const [mc, setMc] = useState<MCQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const onTimeUp = useCallback(() => setFinished(true), []);
  const timer = useTimer(QUIZ_SECONDS, started && !finished, onTimeUp);

  // Progress bar (fills as you answer)
  const prog = useRef(new Animated.Value(0)).current;
  const totalQ = mc.length || QUIZ_LEN;
  const answered = finished ? totalQ : Math.min(idx + (selectedIdx !== null ? 1 : 0), totalQ);
  useEffect(() => {
    Animated.timing(prog, {
      toValue: totalQ ? answered / totalQ : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [answered, totalQ]);
  const progWidth = prog.interpolate({ inputRange: [0,1], outputRange: ["0%","100%"] });

  // ---- START QUIZ WHEN USER TAPS A TOPIC ----
  const startForTopic = (t: TopicIndex) => {
    setSel(t);
    const raw = getCardsById(t.id);
    if (!raw || !raw.length) {
      Alert.alert("No cards", "This topic has no cards yet.");
      return;
    }
    const built = buildQuiz(raw.map(c => ({ q: c.q, a: c.a, choices: c.choices })), QUIZ_LEN);
    setMc(built);
    setIdx(0);
    setCorrect(0);
    setSelectedIdx(null);
    setLocked(false);
    setFinished(false);
    setStarted(true);
    timer.reset();
  };

  // Auto-advance after selection (green/red flash first)
  useEffect(() => {
    if (selectedIdx === null || finished) return;
    const t = setTimeout(() => {
      if (idx >= mc.length - 1) {
        setFinished(true);
      } else {
        setIdx(i => i + 1);
        setSelectedIdx(null);
        setLocked(false);
      }
    }, FEEDBACK_DELAY);
    return () => clearTimeout(t);
  }, [selectedIdx, idx, mc.length, finished]);

  const onPick = (choiceIndex: number) => {
    if (finished || locked) return;
    const current = mc[idx];
    if (!current) return;
    setLocked(true);
    setSelectedIdx(choiceIndex);
    if (choiceIndex === current.correctIndex) {
      setCorrect(c => c + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setCorrect(0);
    setIdx(0);
    setSelectedIdx(null);
    setLocked(false);
    timer.reset(QUIZ_SECONDS);
  };

  const current = mc[idx];

  return (
    <View style={S.container}>
      <LinearGradient colors={["#000","#020814"]} style={S.bg} />

      {/* Header: timer, score, progress */}
      <View style={S.header}>
        <Text style={S.title}>QUIZ</Text>
        <View style={S.row}>
          <View style={S.timerPill}><Ionicons name="time-outline" size={16} color="#BFEFFF" /><Text style={S.timerTxt}>{timer.label}</Text></View>
          <View style={S.scorePill}><Ionicons name="trophy-outline" size={16} color="#FFE7A8" /><Text style={S.scoreTxt}>{correct}/{totalQ || QUIZ_LEN}</Text></View>
        </View>
        <View style={S.progWrap}><Animated.View style={[S.progFill, { width: progWidth }]} /></View>

        {/* Tap a topic to START */}
        <FlatList
          horizontal
          data={topics}
          keyExtractor={(t)=>t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingVertical:8}}
          renderItem={({item}) => (
            <Pressable onPress={() => startForTopic(item)}
              style={[S.topicPill, sel?.id===item.id && started && !finished && S.topicPillOn]}>
              <Text style={[S.topicTxt, sel?.id===item.id && started && !finished && S.topicTxtOn]}>
                {item.title} • {item.count}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Stage */}
      <View style={S.stage}>
        {!started && !finished && (
          <View style={S.center}><Text style={S.hint}>Tap a topic above to start a 5-minute quiz.</Text></View>
        )}

        {started && !finished && current && (
          <View style={S.card}>
            <Text style={S.qLabel}>Question {idx + 1} / {totalQ}</Text>
            <Text style={S.qText}>{current.q}</Text>
            <View style={S.choices}>
              {current.options.map((opt, i) => {
                const isSel = selectedIdx === i;
                const isRight = i === current.correctIndex;
                const showGreen = isSel && isRight;
                const showRed = isSel && !isRight;
                return (
                  <Pressable key={i} disabled={locked} onPress={() => onPick(i)}
                    style={[S.choiceBtn, showGreen && S.choiceBtnCorrect, showRed && S.choiceBtnWrong, locked && !isSel && S.choiceBtnDim]}>
                    <Text style={[S.choiceTxt, (showGreen||showRed)&&S.choiceTxtOn]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {(finished || (started && !current)) && (
          <View style={S.center}>
            <Text style={S.resultTitle}>{timer.remaining===0 ? "Time’s up!" : "Quiz finished!"}</Text>
            <Text style={S.resultLine}>Score: <Text style={S.bold}>{correct}</Text> / <Text style={S.bold}>{totalQ}</Text></Text>
            <View style={S.row}>
              <Pressable style={S.primaryBtn} onPress={() => sel && startForTopic(sel)}><Ionicons name="refresh" size={18} color="#00121E" /><Text style={S.primaryTxt}>Retry Topic</Text></Pressable>
              <Pressable style={S.secondaryBtn} onPress={restart}><Text style={S.secondaryTxt}>Pick New Topic</Text></Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export const S = StyleSheet.create({
  container:{flex:1,backgroundColor:"#000"}, bg:{...StyleSheet.absoluteFillObject},
  header:{paddingTop:12,paddingHorizontal:12,gap:10}, title:{color:"#D9F6FF",fontSize:22,fontWeight:"800",letterSpacing:1.2},
  row:{flexDirection:"row",alignItems:"center",gap:10},
  timerPill:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#07243F",borderWidth:1,borderColor:"#12436E",borderRadius:12,paddingHorizontal:10,paddingVertical:6},
  timerTxt:{color:"#BFEFFF",fontWeight:"700"},
  scorePill:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#2F2506",borderWidth:1,borderColor:"#6E5512",borderRadius:12,paddingHorizontal:10,paddingVertical:6},
  scoreTxt:{color:"#FFE7A8",fontWeight:"800"},
  progWrap:{height:8,borderRadius:6,overflow:"hidden",backgroundColor:"#0C2338",borderWidth:1,borderColor:"#163B5C"},
  progFill:{height:"100%",backgroundColor:"#48D7FF"},
  topicPill:{marginTop:6,marginRight:8,paddingHorizontal:12,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:"#123E6A",backgroundColor:"#061427"},
  topicPillOn:{backgroundColor:"#0A2644",borderColor:"#4BD2FF"},
  topicTxt:{color:"#9CC6DC",fontWeight:"600"}, topicTxtOn:{color:"#E6FBFF",fontWeight:"800"},
  stage:{flex:1,paddingHorizontal:16,paddingTop:8},
  center:{flex:1,alignItems:"center",justifyContent:"center",gap:14},
  hint:{color:"#9DC8E0"},
  card:{gap:14,marginTop:8}, qLabel:{color:"#A9D6EA",fontWeight:"700"}, qText:{color:"#EAFBFF",fontSize:18,fontWeight:"700"},
  choices:{gap:10,marginTop:6},
  choiceBtn:{backgroundColor:"#07243F",borderWidth:1,borderColor:"#154B7F",paddingHorizontal:14,paddingVertical:12,borderRadius:12},
  choiceBtnCorrect:{backgroundColor:"#0E3C2A",borderColor:"#0FD68D"},
  choiceBtnWrong:{backgroundColor:"#3C1212",borderColor:"#D84D4D"},
  choiceBtnDim:{opacity:0.5},
  choiceTxt:{color:"#D6F2FF",fontWeight:"700"}, choiceTxtOn:{color:"#FFF",fontWeight:"900"},
  resultTitle:{color:"#EAFBFF",fontSize:20,fontWeight:"800"}, resultLine:{color:"#CFEAF7",fontSize:16},
  bold:{fontWeight:"900",color:"#fff"},
  primaryBtn:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#A6E8FF",paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:"#2EB8E6"},
  primaryTxt:{color:"#00121E",fontWeight:"900"},
  secondaryBtn:{paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:"#2EB8E6"},
  secondaryTxt:{color:"#9FE2FF",fontWeight:"800"}
});
