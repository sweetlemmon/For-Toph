// api/chat.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://for-toph.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  try {
    let { history } = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'history must be an array' });
    }
    // cap to last 6 turns to keep payload tiny
    history = history.slice(-6);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error('ERROR: Missing OpenRouter API key');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const systemPrompt = {
      role: 'system',
      content: "You are Aurora, a friendly seal companion. Respond cheerfully in 1–2 sentences."
    };
    const messages = [ systemPrompt, ...history ];

    // helper: call OpenRouter once
    async function callAPI() {
      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://for-toph.vercel.app',
          'X-Title': 'Aurora Chat'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages,
          max_tokens: 150,
          temperature: 0.7
        })
      });
    }

    // retry logic for 429
    let attempt = 0, openRouterRes;
    while (attempt < 3) {
      openRouterRes = await callAPI();
      if (openRouterRes.status !== 429) break;
      attempt++;
      const waitMs = 500 * attempt; // 0.5s, then 1s
      console.warn(`429—retrying in ${waitMs}ms (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    if (!openRouterRes.ok) {
      const errorText = await openRouterRes.text();
      console.error('OpenRouter API error:', openRouterRes.status, errorText);
      // friendly 429 message
      if (openRouterRes.status === 429) {
        return res.status(429).json({
          error: 'Aurora is busy swimming with other seals—please try again in a few seconds!'
        });
      }
      return res.status(502).json({
        error: `Aurora couldn’t reach the ocean: ${openRouterRes.statusText}`
      });
    }

    const data = await openRouterRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "Aurora is doing flips underwater… 🦭🌊 Try again soon!";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Unexpected backend error:', err);
    return res.status(500).json({
      error: `Internal server error: ${err.message}`
    });
  }
}





