export type Side = 'player' | 'ai';
export type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Phase = 'setup' | Side | 'end';
export interface Piece { id: string; side: Side; rank: Rank; pos: number; revealed: boolean; moved: boolean }
export interface State { version: 1; pieces: Piece[]; phase: Phase; winner: Side | 'draw' | null; reason: string; ply: number; quiet: number; history: string[]; log: string[]; last: {from:number;to:number} | null }
export interface PublicPiece { id: string; side: Side; rank: Rank | null; pos: number; revealed: boolean; moved: boolean }
export interface Observation { pieces: PublicPiece[]; side: Side; phase: Phase; ply: number; last: State['last'] }
export interface Action { from: number; to: number }
export const WIDTH=6, HEIGHT=8;
export const BASINS = new Set([19,22,25,28]);
export const ARMY: Rank[]=[0,7,7,6,5,4,4,3,3,2,2,1];
export const ROLES: Record<Rank,{name:string;symbol:string;detail:string}>={
 0:{name:'Crown',symbol:'♔',detail:'Objective · cannot move'},
 7:{name:'Ward',symbol:'✹',detail:'Defense · cannot move; only Sappers disarm it'},
 6:{name:'Regent',symbol:'♜',detail:'Rank 6 · strongest, vulnerable to an attacking Shade'},
 5:{name:'Sentinel',symbol:'◆',detail:'Rank 5 · powerful frontline guardian'},
 4:{name:'Captain',symbol:'✦',detail:'Rank 4 · balanced field commander'},
 3:{name:'Sapper',symbol:'⚒',detail:'Rank 3 · disarms Wards'},
 2:{name:'Runner',symbol:'➶',detail:'Rank 2 · travels any clear straight line; long moves reveal'},
 1:{name:'Shade',symbol:'☾',detail:'Rank 1 · defeats Regent only when attacking'}
};
export const other=(s:Side):Side=>s==='player'?'ai':'player';
export const coordinate=(p:number)=>`${'ABCDEF'[p%WIDTH]}${HEIGHT-Math.floor(p/WIDTH)}`;
function shuffle<T>(items:T[],random:()=>number):T[]{ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1)))); [a[i],a[j]]=[a[j],a[i]];} return a; }
export function newGame(random:()=>number=Math.random):State {
 const pieces:Piece[]=[];
 for(const side of ['player','ai'] as Side[]){
  const ranks=shuffle(ARMY,random);
  ranks.forEach((rank,i)=>pieces.push({id:`${side}-${i}`,side,rank,pos:i+(side==='player'?36:0),revealed:false,moved:false}));
 }
 return {version:1,pieces,phase:'setup',winner:null,reason:'',ply:0,quiet:0,history:[],log:['Arrange the Amber Compact. Select two home squares to swap their units.'],last:null};
}
export function validSetup(s:State):boolean {
 if(s.pieces.length!==24 || new Set(s.pieces.map(p=>p.pos)).size!==24)return false;
 return (['player','ai'] as Side[]).every(side=>{
  const army=s.pieces.filter(p=>p.side===side);
  return army.every(p=>side==='player'?p.pos>=36&&p.pos<48:p.pos>=0&&p.pos<12) && army.map(p=>p.rank).sort().join() === [...ARMY].sort().join();
 });
}
export function swapSetup(s:State,a:number,b:number):State {
 if(s.phase!=='setup'||a===b)return s;
 const x=s.pieces.find(p=>p.pos===a&&p.side==='player'),y=s.pieces.find(p=>p.pos===b&&p.side==='player');
 if(!x||!y)return s;
 return {...s,pieces:s.pieces.map(p=>p===x?{...p,pos:b}:p===y?{...p,pos:a}:p)};
}
export function shuffleSetup(s:State,random:()=>number=Math.random):State {
 if(s.phase!=='setup')return s;
 const positions=shuffle(s.pieces.filter(p=>p.side==='player').map(p=>p.pos),random);let i=0;
 return {...s,pieces:s.pieces.map(p=>p.side==='player'?{...p,pos:positions[i++]}:p)};
}
function positionKey(s:State):string { return `${s.phase}:`+s.pieces.map(p=>`${p.id}:${p.rank}:${p.pos}`).sort().join('|'); }
export function startBattle(s:State):State {
 if(s.phase!=='setup'||!validSetup(s))return s;
 const next:State={...s,phase:'player',log:['The veils descend. Capture the Dusk Crown.']};
 next.history=[positionKey(next)];return settle(next);
}
// Legal movement depends only on occupancy and the moving unit's own rank.
export function movesFor(pieces:PublicPiece[],piece:PublicPiece):Action[] {
 if(piece.rank===null||piece.rank===0||piece.rank===7)return [];
 const actions:Action[]=[];
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const range=piece.rank===2?8:1;
  for(let distance=1;distance<=range;distance++){
   const x=piece.pos%WIDTH+dx*distance,y=Math.floor(piece.pos/WIDTH)+dy*distance;
   if(x<0||x>=WIDTH||y<0||y>=HEIGHT)break;
   const to=y*WIDTH+x;if(BASINS.has(to))break;
   const target=pieces.find(p=>p.pos===to);
   if(target?.side===piece.side)break;
   actions.push({from:piece.pos,to});if(target)break;
  }
 }
 return actions;
}
export function legalMoves(s:State,side:Side=s.phase==='ai'?'ai':'player'):Action[]{
 return s.pieces.filter(p=>p.side===side).flatMap(p=>movesFor(s.pieces,p));
}
export function combat(attacker:Rank,defender:Rank):'attacker'|'defender'|'both'{
 if(defender===0)return 'attacker';
 if(defender===7)return attacker===3?'attacker':'defender';
 if(attacker===1&&defender===6)return 'attacker';
 return attacker>defender?'attacker':attacker<defender?'defender':'both';
}
function finish(s:State,winner:State['winner'],reason:string):State {return {...s,phase:'end',winner,reason,log:[reason,...s.log].slice(0,24)};}
function settle(s:State):State {
 if(s.phase==='setup'||s.phase==='end')return s;
 if(!legalMoves(s,s.phase).length){
  if(!legalMoves(s,other(s.phase)).length)return finish(s,'draw','Both armies are unable to move. A truce is declared.');
  return finish(s,other(s.phase),`${s.phase==='player'?'Amber':'Dusk'} has no legal moves.`);
 }
 if(s.history.filter(k=>k===positionKey(s)).length>=3)return finish(s,'draw','The battlefield has repeated three times. A truce is declared.');
 if(s.quiet>=80)return finish(s,'draw','Eighty actions without combat. A truce is declared.');
 return s;
}
export function move(s:State,action:Action,side:Side):State {
 if(s.phase!==side||!legalMoves(s,side).some(a=>a.from===action.from&&a.to===action.to))return s;
 const next:State=structuredClone(s);const attacker=next.pieces.find(p=>p.pos===action.from)!;const defender=next.pieces.find(p=>p.pos===action.to);
 const prefix=side==='player'?'Amber':'Dusk';let message=`${prefix} moved ${coordinate(action.from)} → ${coordinate(action.to)}.`;
 attacker.moved=true;
 if(Math.abs(action.to%WIDTH-action.from%WIDTH)+Math.abs(Math.floor(action.to/WIDTH)-Math.floor(action.from/WIDTH))>1)attacker.revealed=true;
 let crown=false;
 if(defender){
  attacker.revealed=true;defender.revealed=true;const result=combat(attacker.rank,defender.rank);crown=defender.rank===0;
  message=`${prefix} ${ROLES[attacker.rank].name} attacked ${ROLES[defender.rank].name} at ${coordinate(action.to)}. ${result==='both'?'Both fell.':result==='attacker'?'Attacker prevailed.':'Defender held.'}`;
  next.pieces=next.pieces.filter(p=>!(p.id===attacker.id&&result!=='attacker')&&!(p.id===defender.id&&result!=='defender'));
  if(result==='attacker')attacker.pos=action.to;
 }else attacker.pos=action.to;
 next.ply++;next.quiet=defender?0:next.quiet+1;next.last=action;next.phase=other(side);next.log=[message,...next.log].slice(0,24);next.history.push(positionKey(next));
 if(crown)return finish(next,side,`${prefix} captured the opposing Crown.`);
 return settle(next);
}
export function observe(s:State,side:Side):Observation {
 return {side,phase:s.phase,ply:s.ply,last:s.last?{...s.last}:null,pieces:s.pieces.map(p=>({...p,rank:p.side===side||p.revealed?p.rank:null}))};
}
export function decodeSave(raw:string):State|null {
 try{
  if(raw.length>200000)return null;const s=JSON.parse(raw) as State;
  if(!s||s.version!==1||!['setup','player','ai','end'].includes(s.phase)||!Array.isArray(s.pieces)||s.pieces.length>24||!Array.isArray(s.log)||s.log.length>24||s.log.some(l=>typeof l!=='string'||l.length>500)||!Array.isArray(s.history)||s.history.length>10000||s.history.some(k=>typeof k!=='string'||k.length>1000)||!Number.isInteger(s.ply)||s.ply<0||s.ply>10000||!Number.isInteger(s.quiet)||s.quiet<0||s.quiet>80||typeof s.reason!=='string'||s.reason.length>500||![null,'player','ai','draw'].includes(s.winner))return null;
  if(s.pieces.some(p=>!p||!['player','ai'].includes(p.side)||!Number.isInteger(p.rank)||p.rank<0||p.rank>7||!Number.isInteger(p.pos)||p.pos<0||p.pos>=48||BASINS.has(p.pos)||typeof p.revealed!=='boolean'||typeof p.moved!=='boolean'||!new RegExp(`^${p.side}-([0-9]|1[01])$`).test(p.id)))return null;
  if(new Set(s.pieces.map(p=>p.pos)).size!==s.pieces.length||new Set(s.pieces.map(p=>p.id)).size!==s.pieces.length)return null;
  for(const side of ['player','ai'] as Side[])for(const rank of ARMY){if(s.pieces.filter(p=>p.side===side&&p.rank===rank).length>ARMY.filter(r=>r===rank).length)return null;}
  if(s.last!==null&&(!s.last||![s.last.from,s.last.to].every(p=>Number.isInteger(p)&&p>=0&&p<48&&!BASINS.has(p))))return null;
  if(s.phase==='setup'){if(!validSetup(s)||s.ply!==0||s.winner!==null)return null;}
  else if(s.phase!=='end'){
   if(s.winner!==null||(['player','ai'] as Side[]).some(side=>s.pieces.filter(p=>p.side===side&&p.rank===0).length!==1))return null;
  }else if(s.winner===null)return null;
  return settle(s);
 }catch{return null;}
}
