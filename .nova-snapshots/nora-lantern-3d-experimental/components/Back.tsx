import { router,usePathname } from 'expo-router';
import { Pressable,Text,View,StyleSheet } from 'react-native';
function hub(p?:string){ if(!p) return '/(tabs)'; if(p.startsWith('/flashcards/'))return '/(tabs)/flashcards'; if(p.startsWith('/quizzes/'))return '/(tabs)/quizzes'; if(p.startsWith('/relax/'))return '/(tabs)/relax'; return '/(tabs)'; }
export default function Back(){
  const p=usePathname();
  const go=()=>{ try{ if((router as any).canGoBack?.()){ router.back(); return; } }catch{} router.replace(hub(p)); };
  return (<View style={s.wrap}><Pressable onPress={go} style={s.btn}><Text style={s.txt}>‹ Back</Text></Pressable></View>);
}
const s=StyleSheet.create({wrap:{position:'absolute',left:16,bottom:90,zIndex:50},btn:{paddingVertical:10,paddingHorizontal:14,borderRadius:14,backgroundColor:'rgba(0,0,0,0.45)',borderWidth:1,borderColor:'#00f5ff'},txt:{color:'#00f5ff',fontWeight:'900',fontSize:16}});
