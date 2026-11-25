export type Instruction="Forward"|"Left"|"Right";
export const floor=["..G.",".#..","..#.","S..."] as const;
export const limit=10;
export function trace(program:readonly Instruction[]){
 let x=0,y=3,heading=0;
 const steps=[{x,y,heading,message:"Start at the charging dock, facing east."}];
 for(const command of program.slice(0,limit)){
  let message:string;
  if(command==="Forward"){
   const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][heading];
   if(!floor[y+dy]?.[x+dx]||floor[y+dy][x+dx]==="#"){
    steps.push({x,y,heading,message:"Path blocked. Change a command and try again."});break;
   }
   x+=dx;y+=dy;message="Moved forward one tile.";
  }else{heading=(heading+(command==="Right"?1:3))%4;message="Turned "+command.toLowerCase()+" in place.";}
  if(floor[y][x]==="G")message="Delivered the seedling to the greenhouse!";
  steps.push({x,y,heading,message});if(floor[y][x]==="G")break;
 }
 return steps;
}
