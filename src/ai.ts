import {BASINS, WIDTH, HEIGHT, combat, movesFor, type Action, type Observation, type PublicPiece, type Rank} from './engine.js';
const worth=(rank:Rank)=>rank===0?100:rank===7?4:rank===3?5:rank+1;
const distance=(a:number,b:number)=>Math.abs(a%WIDTH-b%WIDTH)+Math.abs(Math.floor(a/WIDTH)-Math.floor(b/WIDTH));
function possibilities(p:PublicPiece):Rank[]{ return p.rank!==null?[p.rank]:p.moved?[1,2,3,3,4,4,5,6]:[0,7,7,1,2,2,3,3,4,4,5,6]; }
function attackValue(a:Rank,d:PublicPiece):number{
 const options=possibilities(d);
 return options.reduce<number>((sum,r)=>{const result=combat(a,r);return sum+(result==='attacker'?worth(r)*3:result==='defender'?-worth(a)*3:(worth(r)-worth(a))*1.5);},0)/options.length;
}
function pathDistance(start:number,target:number,pieces:PublicPiece[],side:string):number {
 const queue:[number,number][]=[[start,0]],visited=new Set([start]);
 for(let i=0;i<queue.length;i++){
  const [pos,d]=queue[i];if(pos===target)return d;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=pos%WIDTH+dx,y=Math.floor(pos/WIDTH)+dy,to=y*WIDTH+x;
   if(x<0||x>=WIDTH||y<0||y>=HEIGHT||BASINS.has(to)||visited.has(to))continue;
   if(to!==target&&pieces.some(p=>p.pos===to&&p.side===side))continue;
   visited.add(to);queue.push([to,d+1]);
  }
 }
 return 50;
}
// This module never accepts State. Only legitimately observed identities enter scoring.
export function chooseMove(view:Observation,random:()=>number=Math.random):Action|null {
 const own=view.pieces.filter(p=>p.side===view.side),enemies=view.pieces.filter(p=>p.side!==view.side);
 let best:Action|null=null,bestScore=-Infinity;
 for(const piece of own){
  if(piece.rank===null)continue;
  for(const action of movesFor(view.pieces,piece)){
   const target=enemies.find(p=>p.pos===action.to);
   let score=target?attackValue(piece.rank,target)+1:0;
   const valuable=enemies.filter(p=>p.rank===0||p.rank===7&&piece.rank===3);
   const goals=valuable.length?valuable:enemies;
   const nearest=(pos:number)=>Math.min(...goals.map(p=>pathDistance(pos,p.pos,view.pieces,view.side)),50);
   score+=(nearest(action.from)-nearest(action.to))*1.2;
   score+=(view.side==='ai'?Math.floor(action.to/WIDTH)-Math.floor(action.from/WIDTH):Math.floor(action.from/WIDTH)-Math.floor(action.to/WIDTH))*0.06;
   // Penalize a destination exposed to a publicly known superior enemy.
   for(const enemy of enemies){
    if(enemy.rank===0||enemy.rank===7)continue;
    const near=distance(action.to,enemy.pos);
    if(near===1 && enemy.rank!==null && combat(enemy.rank,piece.rank)==='attacker')score-=worth(piece.rank)*2;
   }
   const crown=own.find(p=>p.rank===0);
   if(crown && enemies.some(p=>distance(p.pos,crown.pos)<=2) && distance(action.to,crown.pos)<=1)score+=0.6;
   score+=Math.max(0,Math.min(1,random()))*0.65;
   if(score>bestScore){bestScore=score;best=action;}
  }
 }
 return best;
}
