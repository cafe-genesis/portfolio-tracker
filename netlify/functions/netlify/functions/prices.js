exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  if(event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};
  const sym = event.queryStringParameters?.sym;
  if(!sym) return {statusCode:400,headers,body:JSON.stringify({error:'Missing sym'})};
  const symbols = sym.split(',').map(s=>s.trim()).filter(Boolean);
  const SUFFIX = {
    'VUAA':'VUAA.L','EQAC':'EQAC.L','MEUD':'MEUD.PA','EIMI':'EIMI.L',
    'MEUS':'MEUS.PA','SJPA':'SJPA.L','IJPA':'IJPA.L','V60A':'V60A.L',
    'VUAG':'VUAG.L','500U':'500U.P','EQQQ':'EQQQ.L','AINF':'AINF.L',
    'BTC':'BTC-USD','ETH':'ETH-USD','SOL':'SOL-USD','ADA':'ADA-USD',
    'DOT':'DOT-USD','DOGE':'DOGE-USD'
  };
  const results = {};
  for(const s of symbols){
    const ys = SUFFIX[s]||s;
    try{
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}?interval=1d&range=5d`,{
        headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}
      });
      if(!r.ok) continue;
      const d = await r.json();
      const q = d?.chart?.result?.[0];
      if(!q) continue;
      const m = q.meta;
      const closes = (q.indicators?.quote?.[0]?.close||[]).filter(x=>x!=null);
      const price = m.regularMarketPrice||closes[closes.length-1];
      const prev = closes.length>=2?closes[closes.length-2]:(m.previousClose||price);
      if(price) results[s]={price,prev:prev||price,currency:m.currency||'USD'};
    }catch(e){console.error(s,e.message);}
  }
  return {statusCode:200,headers,body:JSON.stringify(results)};
};
