const{Client}=require('ssh2');
const fs=require('fs');

const HOST='8.148.28.42', PORT=22, USER='administrator', PASS='Kkw12580';
const LOCAL='E:\\AIchat\\MIMOTEST\\SaltMusic';
const REMOTE='C:\\SaltMusic';

const args=process.argv.slice(2);
const cmd=args[0]||'sync';

function connect(){return new Promise((r,j)=>{const c=new Client();c.on('ready',()=>r(c)).on('error',j).connect({host:HOST,port:PORT,username:USER,password:PASS})})}

async function sync(c,files){
  const sftp=await new Promise((r,j)=>c.sftp((e,s)=>e?j(s):r(s)));
  for(const f of files){
    await new Promise((r,j)=>sftp.fastPut(LOCAL+'\\'+f,REMOTE+'\\'+f,e=>e?j(e):r()));
    console.log('uploaded:',f);
  }
}

async function exec(c,cmd){return new Promise((r,j)=>{c.exec(cmd,(e,s)=>{let d='';s.on('data',c=>d+=c);s.on('close',()=>r(d))})})}

(async()=>{
  const c=await connect();
  if(cmd==='sync'){
    const files=['server.js','index.html','mini.html','mini-settings.html','css/styles.css','js/app.js','js/audio-engine.js','js/ui.js','js/lyrics.js','js/settings.js','js/color-utils.js','js/netease-api.js'];
    await sync(c,files);
    console.log('sync done');
  }else if(cmd==='restart'){
    await exec(c,'taskkill /f /im node.exe 2>NUL');
    await new Promise(r=>setTimeout(r,1000));
    await exec(c,'cd C:\\SaltMusic && start "" /min node server.js');
    console.log('restarted');
  }else if(cmd==='status'){
    const d=await exec(c,'tasklist | findstr node');
    console.log(d||'Node not running');
  }
  c.end();
})();
