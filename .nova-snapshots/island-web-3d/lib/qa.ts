function withTimeout<T>(p:Promise<T>, ms=18000){
  const t=new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms));
  return Promise.race([p,t]);
}

export async function wikiSummary(q:string){
  try{
    const base=process.env.EXPO_PUBLIC_WIKI_API||'https://en.wikipedia.org';
    const s=await withTimeout(fetch(`${base}/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=1`));
    const sj=await s.json();
    const title=sj?.pages?.[0]?.title;
    if(!title) return '';
    const r=await withTimeout(fetch(`${base}/api/rest_v1/page/summary/${encodeURIComponent(title)}`));
    const j=await r.json();
    return j?.extract?String(j.extract):'';
  }catch{return ''}
}

export async function openAIAnswer(q:string){
  const key=process.env.EXPO_PUBLIC_OPENAI_API_KEY||'';
  if(!key) throw new Error('Missing OpenAI key');
  const r=await withTimeout(fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({
      model:'gpt-4o-mini',
      temperature:0.6,
      messages:[
        {role:'system',content:'You are Nova: concise, helpful, a little sassy. Always end with "Sources: OpenAI, Wikipedia".'},
        {role:'user',content:q}
      ]
    })
  }));
  const j=await r.json();
  if(j?.error) throw new Error(j.error.message||'openai_error');
  return j?.choices?.[0]?.message?.content?.trim?.()||'';
}

export async function askNova(q:string){
  let ai='',wk='';
  try{ ai=await openAIAnswer(q);}catch(e){}
  try{ wk=await wikiSummary(q);}catch(e){}
  if(!ai && !wk) throw new Error('no_answer');
  const add=wk?`\n\nFrom Wikipedia: ${wk}`:'';
  return `${ai||'Here’s what Wikipedia says:'}${add}\n\nSources: OpenAI, Wikipedia`;
}
