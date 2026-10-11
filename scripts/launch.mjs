import {spawn} from 'node:child_process';
import {openSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('..',import.meta.url));
const port=Number(process.env.PORT||5200);
// Session-only detached child. No launchd, login items or machine configuration.
const log=openSync(new URL('../.play-server.log',import.meta.url),'a');
const child=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{cwd:directory,env:{...process.env,PORT:String(port)},detached:true,stdio:['ignore',log,log]});
child.unref();writeFileSync(new URL('../.play-server.pid',import.meta.url),String(child.pid));
console.log(`Launched PID ${child.pid}; http://127.0.0.1:${port}`);
