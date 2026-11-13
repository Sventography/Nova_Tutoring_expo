import AsyncStorage from '@react-native-async-storage/async-storage';
export type QuizRecord={topic:string;score:number;total:number;when:number};
export type ProgressState={
  totalQuizzes:number;
  lastTopic:string|null;
  bestByTopic:Record<string,{score:number;total:number;when:number}>;
  history:QuizRecord[];
};
const KEY='nova_progress_v1';
export async function getProgress():Promise<ProgressState>{
  try{
    const raw=await AsyncStorage.getItem(KEY);
    if(raw) return JSON.parse(raw);
  }catch{}
  return { totalQuizzes:0,lastTopic:null,bestByTopic:{},history:[] };
}
export async function recordQuizAttempt(topic:string,score:number,total:number){
  const st=await getProgress();
  st.totalQuizzes+=1;
  st.lastTopic=topic;
  const when=Date.now();
  const prev=st.bestByTopic[topic];
  if(!prev || score>prev.score){ st.bestByTopic[topic]={score,total,when}; }
  st.history.unshift({topic,score,total,when});
  if(st.history.length>50) st.history=st.history.slice(0,50);
  await AsyncStorage.setItem(KEY,JSON.stringify(st));
  return st;
}
