import {decodeSave, legalMoves, move, newGame, observe, type State} from './engine.js';
import {chooseMove} from './ai.js';
export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void}
export const SAVE_KEY='salt-crown-v1';
export class Session {
 state:State; storageMessage='Autosave ready'; private generation=0; private timer:ReturnType<typeof setTimeout>|null=null;
 constructor(private storage:StoragePort,private render:()=>void,private delay=700){
  this.state=newGame();try{const raw=storage.getItem(SAVE_KEY);if(raw){const restored=decodeSave(raw);if(restored){this.state=restored;this.storageMessage='Saved battle restored';}else this.storageMessage='Invalid save ignored. A new arrangement is ready.';}}catch{this.storageMessage='Storage unavailable. This battle will not be saved.';}
 }
 commit(next:State){if(next===this.state)return;this.cancel();this.state=next;this.save();this.render();this.resume();}
 save(){try{this.storage.setItem(SAVE_KEY,JSON.stringify(this.state));this.storageMessage='Autosaved on this device';}catch{this.storageMessage='Could not save. Keep this tab open to continue.';}}
 cancel(){this.generation++;if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 resume(){
  if(this.state.phase!=='ai'||this.timer!==null)return;
  const generation=this.generation;
  this.timer=setTimeout(()=>{this.timer=null;if(generation!==this.generation||this.state.phase!=='ai')return;
   const action=chooseMove(observe(this.state,'ai'));if(action)this.commit(move(this.state,action,'ai'));
   else if(!legalMoves(this.state,'ai').length)this.commit({...this.state,phase:'end',winner:'player',reason:'Dusk has no legal moves.'});
  },this.delay);
 }
 destroy(){this.cancel();}
}
