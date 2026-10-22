import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function getAvailablePort(){
  const probe=net.createServer();
  probe.listen(0,'127.0.0.1');
  await once(probe,'listening');
  const {port}=probe.address();
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
  return port;
}

test('npm start server exposes public health without bypassing other origin checks',async t=>{
  const port=await getAvailablePort();
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'deluxe-tunes-health-'));
  const child=spawn(process.execPath,['server.mjs'],{
    cwd:projectRoot,
    env:{
      ...process.env,
      PORT:String(port),
      HOST:'127.0.0.1',
      NODE_ENV:'test',
      RENDER:'',
      DATABASE_URL:'',
      DISCORD_NEW_RELEASE_WEBHOOK_URL:'',
      DELUXE_TUNES_DATA_DIR:dataDir,
    },
    stdio:'ignore',
  });
  const childExit=once(child,'exit');
  t.after(async()=>{
    if(child.exitCode===null)child.kill();
    if(child.exitCode===null)await childExit;
    await rm(dataDir,{recursive:true,force:true});
  });

  const baseUrl=`http://127.0.0.1:${port}`;
  let healthResponse;
  const deadline=Date.now()+15_000;
  while(Date.now()<deadline){
    try{
      healthResponse=await fetch(`${baseUrl}/api/health`);
      break;
    }catch{
      if(child.exitCode!==null)assert.fail(`Server exited during startup with code ${child.exitCode}.`);
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }

  assert.ok(healthResponse,'Server did not start within 15 seconds.');
  assert.equal(healthResponse.status,200);
  assert.deepEqual(await healthResponse.json(),{ok:true,status:'ready'});

  const disallowedFriendsResponse=await fetch(`${baseUrl}/api/auth/me`,{
    headers:{Origin:'https://untrusted.example'},
  });
  assert.equal(disallowedFriendsResponse.status,403);
});
