import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Card = { id?: string|number; front: string; back: string };
export type CollectionTopic = { id: string; title: string; cards: Card[]; createdAt: number; isCustom?: boolean };

type Ctx = {
  topics: CollectionTopic[];
  addCard: (card: Card, topicId?: string, topicTitleGuess?: string) => void;
  removeCard: (id: string|number, topicId: string) => void;
  clearTopic: (topicId: string) => void;
  createTopic: (title: string) => string; // returns id
};

const KEY = "collections:v1";
const CollectionsContext = createContext<Ctx | null>(null);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

async function loadAll(): Promise<CollectionTopic[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
async function saveAll(list: CollectionTopic[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export const notify=(m:string)=>{try{const{AchieveEmitter}=require("./AchievementsContext");AchieveEmitter?.emit?.("celebrate",m);}catch{}};

export function CollectionsProvider({ children }: { children: React.ReactNode }) {

  const [topics, setTopics] = useState<CollectionTopic[]>([]);
  const booted = useRef(false);

  useEffect(() => { if(!booted.current){ booted.current = true; loadAll().then(setTopics); }}, []);
  useEffect(() => { if(booted.current) saveAll(topics); }, [topics]);

  const api = useMemo<Ctx>(() => ({
    topics,
    addCard: (card, topicId, titleGuess) => {
      setTopics(prev => {
        const next = [...prev];
        let t = topicId ? next.find(x=>x.id===topicId) : undefined;
        if (!t) {
          // default set
          t = { id: topicId || uid(), title: titleGuess || "My Flashcards", cards: [], createdAt: Date.now(), isCustom: true };
          next.unshift(t);
        }
        const newCard = { id: uid(), front: String(card.front), back: String(card.back) };
        t.cards = [newCard, ...(t.cards||[])];
        return next;
      });
    },
    removeCard: (id, tid) => setTopics(prev => prev.map(t => t.id===tid ? { ...t, cards: (t.cards||[]).filter(c => String(c.id)!==String(id)) } : t)),
    clearTopic: (tid) => setTopics(prev => prev.map(t => t.id===tid ? { ...t, cards: [] } : t)),
    createTopic: (title) => {
      const id = uid();
      setTopics(prev => [{ id, title: title.trim() || "Untitled Set", cards: [], createdAt: Date.now(), isCustom: true }, ...prev]);
      return id;
    },
  }), [topics]);

  return <CollectionsContext.Provider value={api}>{children}</CollectionsContext.Provider>;
}

export function useCollections(){ return useContext(CollectionsContext)!; }
export function useCollectionsSafe(){ try{ return useContext(CollectionsContext); }catch{ return null; } }
