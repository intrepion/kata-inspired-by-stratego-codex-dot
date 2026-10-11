import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Session,SAVE_KEY} from '../src/session.js';
import {legalMoves,move,newGame,startBattle} from '../src/engine.js';
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
test('pending AI autosave reload resumes exactly one turn even with repeated scheduling',async()=>{
 const disk=storage();const s=new Session(disk,()=>{},10);s.commit(startBattle(s.state));s.commit(move(s.state,legalMoves(s.state)[0],'player'));assert.equal(s.state.ply,1);s.destroy();
 const loaded=new Session(disk,()=>{},10);assert.equal(loaded.state.phase,'ai');loaded.resume();loaded.resume();loaded.resume();await delay(40);assert.equal(loaded.state.ply,2);assert.equal(loaded.state.phase,'player');assert.equal(JSON.parse(disk.getItem(SAVE_KEY)!).ply,2);loaded.destroy();
});
test('reset and interrupted callbacks never move a replacement arrangement',async()=>{
 const s=new Session(storage(),()=>{},10);s.commit(startBattle(s.state));s.commit(move(s.state,legalMoves(s.state)[0],'player'));s.commit(newGame());await delay(40);assert.equal(s.state.phase,'setup');assert.equal(s.state.ply,0);s.destroy();
});
test('storage errors and invalid saves leave a playable recoverable state',()=>{
 const broken=new Session({getItem:()=>'{oops',setItem:()=>{throw Error('full');}},()=>{});assert.equal(broken.state.phase,'setup');assert.match(broken.storageMessage,/Invalid/);broken.commit(startBattle(broken.state));assert.match(broken.storageMessage,/Could not save/);assert.equal(broken.state.phase,'player');broken.destroy();
});
