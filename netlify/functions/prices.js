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
    'EQQQ.Z':'EQQQ.L','MEUU':'MEUU.PA',
    'BTC':'BTC-USD','ETH':'ETH-USD','SOL':'SOL-USD','ADA':'ADA-USD',
    'DOT':'DOT-USD','DOGE':'DOGE-USD','LINK':'LINK-USD'
  };
  
  const results = {};
  
  // Fetch all symbols at once using Yahoo Finance quote endpoint
  const allYahooSyms = symbols.map(s => SUFFIX[s]||s);
  const symParam = allYahooSyms.join('%2C');
  
  try {
    // Try Yahoo Finance v7 quotes endpoint (batch)
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symParam}&fields=regularMarketPrice,regularMarketPreviousClose,currency`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com'
      }
    });
    
    if(r.ok){
      const data = await r.json();
      const quotes = data?.quoteResponse?.result || [];
      quotes.forEach(q => {
        // Find original symbol
        const origSym = symbols.find(s => (SUFFIX[s]||s) === q.symbol) || q.symbol;
        const price = q.regularMarketPrice;
        const prev = q.regularMarketPreviousClose || price;
        const currency = q.currency || 'USD';
        if(price) results[origSym] = {price, prev, currency};
      });
      
      if(Object.keys(results).length > 0){
        return {statusCode:200, headers, body:JSON.stringify(results)};
      }
    }
  } catch(e) {
    console.log('Batch fetch failed:', e.message);
  }
  
  // Fallback: fetch one by one using chart endpoint
  for(const s of symbols){
    const ys = SUFFIX[s]||s;
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}?interval=1d&range=5d`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com'
        }
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
    }catch(e){
      console.error(s, e.message);
    }
  }
  
  return {statusCode:200, headers, body:JSON.stringify(results)};
};
