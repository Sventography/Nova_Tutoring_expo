export const palette = ["#00e5ff","#cf66ff","#8cff66","#ffa94d","#ff6b6b","#94d2bd","#9b5de5","#f15bb5"];

export function colorForGroup(topics: {id:string;title:string;group:string}[]) {
  const map = new Map<string,string>();
  let i = 0;
  for (const t of topics) {
    if (!map.has(t.group)) {
      map.set(t.group, palette[i % palette.length]);
      i++;
    }
  }
  return (group: string) => map.get(group) ?? palette[0];
}
