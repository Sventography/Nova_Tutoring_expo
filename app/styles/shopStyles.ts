import { StyleSheet } from "react-native";

export const CATEGORY_GLOW: Record<string,string> = {
  plushies: "#2dd4ff",   // neon cyan
  apparel:  "#f97316",   // neon orange
  themes:   "#22d3ee",   // light cyan
  virtual:  "#a78bfa",   // neon purple
  coins:    "#67e8f9",   // aqua
};

const styles = StyleSheet.create({
  screen: { flex:1, padding:16, paddingTop:24, backgroundColor:"transparent" },

  titleWrap: { alignItems:"flex-start", marginBottom:12 },
  titleGlow: {
    paddingHorizontal:18, paddingVertical:6, borderRadius:12,
    backgroundColor:"rgba(15,45,55,0.9)",
    borderWidth:2, borderColor:"rgba(45,255,255,0.55)",
    shadowColor:"#66ffff", shadowOpacity:0.9, shadowRadius:16, shadowOffset:{width:0,height:0}
  },
  title: { fontSize:28, fontWeight:"900", letterSpacing:3, color:"#cfffff" },

  coinPill: {
    position:"absolute", right:16, top:16,
    paddingHorizontal:12, paddingVertical:6, borderRadius:14,
    backgroundColor:"rgba(10,30,36,0.9)", borderWidth:2, borderColor:"rgba(90,255,255,0.5)",
    flexDirection:"row", gap:8, alignItems:"center",
    shadowColor:"#66ffff", shadowOpacity:0.85, shadowRadius:14, shadowOffset:{width:0,height:0}
  },
  coinTiny: { width:18, height:18 },

  grid: { paddingBottom:64, gap:16 },
  card: {
    flex:1, minHeight:220, padding:12, borderRadius:18,
    backgroundColor:"rgba(5,18,24,0.9)", borderWidth:2,
  },
  cardTitle: { fontSize:18, fontWeight:"800", color:"#e7f6ff", marginTop:10 },
  cardDesc: { fontSize:13, lineHeight:18, color:"#a8c7d8", marginTop:4 },

  art: { width:"100%", height:120, borderRadius:12 },

  row: { marginTop:10, flexDirection:"row", alignItems:"center", gap:10 },
  priceCash: { fontSize:15, fontWeight:"900", color:"#eaffff" },
  dot: { color:"#7dd3fc", fontWeight:"900" },
  priceCoins: { fontSize:15, fontWeight:"900", color:"#7dd3fc" },

  btn: { marginTop:10, alignSelf:"flex-end", paddingHorizontal:14, paddingVertical:8,
         borderRadius:12, backgroundColor:"rgba(0,0,0,0.6)", borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  btnText: { color:"#EFFFFA", fontWeight:"900" },

  flipHint: { position:"absolute", right:10, bottom:10, fontSize:12, color:"#c8f8ff", opacity:0.85 },

  modalWrap:{ flex:1, backgroundColor:"rgba(0,0,0,0.55)", justifyContent:"center", alignItems:"center" },
  modalCard:{ width:"82%", padding:18, borderRadius:16, backgroundColor:"rgba(5,18,24,0.97)",
              borderWidth:2, borderColor:"rgba(255,255,255,0.2)" },
  modalTitle:{ fontSize:18, fontWeight:"800", color:"#e0ffff" },
  modalBtn:{ alignSelf:"flex-end", marginTop:14, paddingHorizontal:14, paddingVertical:8, borderRadius:10,
             backgroundColor:"rgba(0,0,0,0.6)", borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  modalBtnText:{ color:"#EFFFFA", fontWeight:"900" },
});

export default styles;

// tiny util for category glow
export const makeCardGlow = (category: string) => ({
  borderColor: CATEGORY_GLOW[category] ?? "#67e8f9",
  shadowColor: CATEGORY_GLOW[category] ?? "#67e8f9",
  shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }
});

export const makeBtnGlow = (color: string) => ({
  shadowColor: color, shadowOpacity: 0.85, shadowRadius: 12, shadowOffset: { width:0, height:0 },
  borderColor: color
});
