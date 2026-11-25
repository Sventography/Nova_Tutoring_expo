import type { Interest } from "../../app/_lib/discoveryModel";

type District = {name:string; color:string; exhibits:[string,string,string,string]; lessons:string[]; adventure?:string};
export const districts:Record<Interest,District> = {
 music:{name:"Melody Grove",color:"#d29550",exhibits:["Guitar bench","Rehearsal gazebo","Amphitheater","Concert pavilion"],lessons:["music-mood","music-octave","music-rhythm"],adventure:"music-studio"},
 art:{name:"Painter’s Hollow",color:"#dd887c",exhibits:["Pond easel","Sculpture table","Mural gallery","Art museum"],lessons:["art-color","art-depth","art-palette"],adventure:"art-exhibition"},
 film:{name:"Lanternlight Studios",color:"#e2bd73",exhibits:["Clapperboard","Street set","Outdoor cinema","Film festival pavilion"],lessons:["film-cut","film-framing","film-foley"],adventure:"silent-film"},
 space:{name:"Starlight Observatory",color:"#879ce1",exhibits:["Stargazing telescope","Moon garden","Orrery","Hilltop observatory"],lessons:["space-gravity","space-light","space-orbit"],adventure:"moon-outpost"},
 astrology:{name:"Celestial Archive",color:"#b69cdb",exhibits:["Sundial","Calendar garden","Almanac library","Hall of Sky Traditions"],lessons:["astro-history","astro-calendar","astro-evidence"]},
 science:{name:"Discovery Gardens",color:"#7eb895",exhibits:["Seedling greenhouse","Waterwheel","Laboratory pavilion","Ecology center"],lessons:["science-shadow","science-ice","science-variables"]},
 math:{name:"Pattern Plaza",color:"#66bdb9",exhibits:["Counting stones","Symmetry fountain","Triangle bridge","Mathematics tower"],lessons:["math-scale","math-chance","math-symmetry"]},
 history:{name:"Memory Harbor",color:"#c09e71",exhibits:["Map table","Trade stall","Print workshop","History museum"],lessons:["history-sources","history-map","history-artifacts"]},
 technology:{name:"Circuit Commons",color:"#79bdcb",exhibits:["Tinkerer's robot","Pixel mosaic","Robotics workshop","Invention center"],lessons:["tech-algorithm","tech-search","tech-pixels","tech-accessibility"]},
 writing:{name:"Storybook Wood",color:"#ae98bc",exhibits:["Writer's notebook","Reading nook","Tiny theater","Story academy"],lessons:["writing-pov","writing-payoff","writing-theme"]},
};
export const stageNames=["Seed","Growing","Thriving","Landmark"] as const;
// Retain the prototype's first two upgrades. Level 10 already exists in Island progression.
export function stageAt(level:number) {return level>=10?4:level>=6?3:level>=3?2:1;}
export const DISTRICT_SHORE_X=80;
