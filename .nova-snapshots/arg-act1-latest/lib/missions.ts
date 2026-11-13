export type Mission = { id: string; title: string; progress?: number; target?: number; completed?: boolean; reward?: number; };
const _missions: Mission[] = [
  { id:"m1", title:"Finish onboarding", reward: 50 },
  { id:"m2", title:"Earn first 100 points", reward: 100 },
];
export function getMissions(): Mission[] { return _missions; }
