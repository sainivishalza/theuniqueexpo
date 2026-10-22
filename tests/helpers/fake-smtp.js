const net=require('node:net');
// A tiny SMTP server for tests: accepts any login, keeps every message, can refuse a recipient.
exports.start=(port,opts={})=>new Promise((resolve)=>{
  const messages=[]; let refuse=null; const sockets=new Set();
  const server=net.createServer((sock)=>{ sockets.add(sock); sock.on('close',()=>sockets.delete(sock)); sock.on('error',()=>{});
    let buf='', inData=false, data='', from='', rcpt=[], authStep=0;
    const send=(s)=>sock.write(s+'\r\n'); send('220 fake ESMTP');
    sock.on('data',(chunk)=>{ buf+=chunk.toString('utf8');
      for(;;){ if(inData){ const i=buf.indexOf('\r\n.\r\n'); if(i<0) return; data=buf.slice(0,i); buf=buf.slice(i+5); inData=false; messages.push({from,to:[...rcpt],raw:data}); send('250 queued'); from='';rcpt=[]; continue; }
        const i=buf.indexOf('\r\n'); if(i<0) return; const line=buf.slice(0,i); buf=buf.slice(i+2); const up=line.toUpperCase();
        if(authStep===1){ authStep=2; send('334 UGFzc3dvcmQ6'); continue; } if(authStep===2){ authStep=0; send('235 ok'); continue; }
        if(up.startsWith('EHLO')||up.startsWith('HELO')){ sock.write('250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n'); }
        else if(up.startsWith('AUTH PLAIN')){ send('235 ok'); } else if(up.startsWith('AUTH LOGIN')){ authStep=1; send('334 VXNlcm5hbWU6'); }
        else if(up.startsWith('MAIL FROM')){ from=line; send('250 ok'); }
        else if(up.startsWith('RCPT TO')){ if(refuse&&line.toLowerCase().includes(refuse)){ send('550 no such user'); } else { rcpt.push(line); send('250 ok'); } }
        else if(up==='DATA'){ inData=true; send('354 go'); } else if(up==='QUIT'){ send('221 bye'); sock.end(); } else if(up==='RSET'||up==='NOOP'){ send('250 ok'); } else send('250 ok'); } });
  });
  server.listen(port,'127.0.0.1',()=>resolve({messages,refuse:(v)=>{refuse=v;},close:()=>new Promise(r=>{ for(const s of sockets) s.destroy(); server.close(()=>r()); })}));
});
// decode what the test needs from a raw message
exports.decode=(raw)=>{ const [head,...rest]=raw.split('\r\n\r\n'); const body=rest.join('\r\n\r\n');
  const unfolded=head.replace(/\r\n[ \t]/g,' ');
  const subj=(/^Subject: (.*)$/mi.exec(unfolded)?.[1]||'').replace(/(\?=)\s+(=\?UTF-8\?)/gi,'$1$2');
  const dec=subj.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi,(m,e,t)=>{
    if(e.toUpperCase()==='B') return Buffer.from(t,'base64').toString('utf8');
    // Q encoding: =XX is a byte, _ is a space; the bytes together are UTF-8
    const bytes=[]; const q=t.replace(/_/g,' ');
    for(let i=0;i<q.length;i++){ if(q[i]==='='&&/^[0-9A-Fa-f]{2}$/.test(q.slice(i+1,i+3))){ bytes.push(parseInt(q.slice(i+1,i+3),16)); i+=2; } else bytes.push(...Buffer.from(q[i],'utf8')); }
    return Buffer.from(bytes).toString('utf8'); });
  // decode quoted-printable / base64 parts to a searchable string
  let text=body; if(/Content-Transfer-Encoding: base64/i.test(raw)) text=raw.split(/\r\n\r\n/).map(p=>{try{return Buffer.from(p.replace(/\r\n/g,''),'base64').toString('utf8');}catch{return '';}}).join('\n'); 
  text=text.replace(/=\r\n/g,'').replace(/(=[0-9A-F]{2})+/g,(m)=>{try{return Buffer.from(m.replace(/=/g,''),'hex').toString('utf8');}catch{return m;}});
  return {subject:dec,text,head};};
