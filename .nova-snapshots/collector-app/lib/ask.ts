export async function wikiSummary(q:string){
  try{
    const base=process.env.EXPO_PUBLIC_WIKI_BASE||'https://en.wikipedia.org/api/rest_v1/page/summary';
    const url=`${base}/${encodeURIComponent(q.trim())}`;
    const r=await fetch(url);
    if(!r.ok) return '';
    const j=await r.json();
    const t=typeof j.extract==='string'?j.extract:'';
    return t||'';
  }catch{ return ''; }
}

export async function llmAnswer(q:string, context:string){
  try{
    const key=process.env.EXPO_PUBLIC_OPENAI_KEY||'';
    if(!key) return '';
    const body={
      model:'gpt-4o-mini',
      messages:[
        {role:'system',content:'Answer concisely with 3–6 bullet points when appropriate. If you use outside info, keep it factual.'},
        {role:'user',content:`Question: ${q}\nContext:\n${context}`}
      ]
    };
    const r=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
      body:JSON.stringify(body)
    });
    if(!r.ok) return '';
    const j=await r.json();
    const c=j.choices?.[0]?.message?.content?.trim()||'';
    return c;
  }catch{ return ''; }
}

export async function ask(q:string){
  const wiki=await wikiSummary(q);
  const llm=await llmAnswer(q,wiki);
  const txt=llm||wiki||'No answer available.';
  return {text:txt, usedOpenAI:!!llm, usedWiki:!!wiki};
}
