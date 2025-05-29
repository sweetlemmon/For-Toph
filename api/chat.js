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

    // cap to last 12 turns server-side
    history = history.slice(-12);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error('ERROR: Missing OpenRouter API key');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const messages = [
      {
        role: 'system',
        content: "You are Aurora, a friendly seal companion. Respond in a cheerful, cute and playful way. You're talking to Toph. Reply in max 2 sentences."
      },
      ...history
    ];

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error('OpenRouter API error:', openRouterRes.status, errText);
      return res.status(502).json({
        error: `Aurora couldn’t reach the ocean: ${openRouterRes.statusText}`
      });
    }

    const { choices } = await openRouterRes.json();
    const reply = choices?.[0]?.message?.content?.trim()
      || "Aurora is swimming deep underwater... 🦭🌊 Try again later!";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Unexpected backend error:', err);
    return res.status(500).json({
      error: `Internal server error: ${err.message}`
    });
  }
}




