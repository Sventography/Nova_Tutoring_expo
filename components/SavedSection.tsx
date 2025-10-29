import React,{useEffect,useState} from "react";
import {View,Text,FlatList,TouchableOpacity,RefreshControl,StyleSheet} from "react-native";
import {getCollection,removeFromCollection,SavedCard} from "../lib/collection";
export default function SavedSection(){
  const[items,setItems]=useState<SavedCard[]>([]);
  const[refreshing,setRefreshing]=useState(false);
  async function load(){setRefreshing(true);try{setItems(await getCollection())}finally{setRefreshing(false)}}
  useEffect(()=>{load()},[]);
  async function onDel(id:string){await removeFromCollection(id);await load()}
  return(
    <View style={s.wrap}>
      <Text style={s.h}>Saved on this device</Text>
      <FlatList
        data={items}
        keyExtractor={x=>x.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load}/>}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>No saved cards yet</Text>}
        renderItem={({item})=>(
          <View style={s.card}>
            <Text style={s.topic}>{item.topic}</Text>
            <Text style={s.q}>{item.front}</Text>
            <Text style={s.a}>{item.back}</Text>
            <TouchableOpacity style={s.del} onPress={()=>onDel(item.id)}>
              <Text style={s.delT}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  )
}
const s=StyleSheet.create({
  wrap:{marginTop:18},
  h:{color:"#e6f7ff",fontWeight:"900",fontSize:22,marginBottom:8},
  list:{paddingBottom:24,gap:12},
  empty:{color:"#8fb6c9",textAlign:"center",marginTop:24},
  card:{backgroundColor:"#0b1220",borderRadius:14,padding:14,borderWidth:1,borderColor:"#00e0ff"},
  topic:{color:"#8fb6c9",fontWeight:"800",marginBottom:6},
  q:{color:"#e6f7ff",fontWeight:"900"},
  a:{color:"#a8eaff",marginTop:4},
  del:{alignSelf:"flex-end",backgroundColor:"#001a2a",paddingHorizontal:12,paddingVertical:6,borderRadius:8,marginTop:8},
  delT:{color:"#00111a",fontWeight:"900"}
});
