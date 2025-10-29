export type Mission = { id: string; title: string; description?: string; points: number; done?: boolean; };
export type MissionsState = { missions: Mission[]; completedIds: Set<string>; };
const _state: MissionsState = {
  missions: [
    { id: "get-started", title: "Get Started", description: "Open the app", points: 10, done: true },
    { id: "ask-1", title: "Ask One Question", description: "Use the Ask tab once", points: 25 },
    { id: "voice-1", title: "Try Voice Once", description: "Use voice input one time", points: 25 }
  ],
  completedIds: new Set(["get-started"]),
};
export function listMissions(){ return _state.missions.slice(); }
export function isCompleted(id:string){ return _state.completedIds.has(id); }
export function completeMission(id:string){ const m=_state.missions.find(x=>x.id===id); if(!m)return{addedPoints:0}; if(_state.completedIds.has(id))return{addedPoints:0}; _state.completedIds.add(id); m.done=true; return {addedPoints:m.points??0}; }
export default { listMissions, isCompleted, completeMission };
