import {newGame, type State, type Rank, type Piece} from './engine.js';
export type Drill='sapper'|'shade'|'runner'|'defense';
export function drill(kind:Drill):State {
 const formations:Record<Drill,[string,Rank,number][]>={
  sapper:[['player-0',0,47],['player-1',3,6],['ai-0',0,0],['ai-1',7,7],['ai-2',2,11]],
  shade:[['player-0',0,47],['player-1',1,6],['ai-0',0,0],['ai-1',6,7],['ai-2',2,11]],
  runner:[['player-0',0,47],['player-1',2,30],['ai-0',0,0],['ai-1',4,5]],
  defense:[['player-0',0,47],['player-1',4,6],['ai-0',0,0],['ai-1',5,7]]
 };
 const pieces:Piece[]=formations[kind].map(([id,rank,pos])=>({id,side:id.startsWith('player')?'player':'ai',rank,pos,revealed:id.startsWith('ai')&&rank!==0,moved:false}));
 return {...newGame(),pieces,phase:'player',history:[],log:[`Field drill: ${kind}. A reduced practice formation; this replaces the current save.`]};
}
