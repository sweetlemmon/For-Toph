export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userMessage = req.body.message;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  // Validate API key
  if (!OPENROUTER_API_KEY) {
    console.error("Missing OpenRouter API key");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free",
        messages: [
          {
            role: "system",
            content: "You are Pixel, a magical fox AI companion. Always respond in a cheerful, adorable, and playful way. Be a little whimsical, emotionally warm, and use emojis sometimes. You're like a digital pet that makes people smile. Keep responses under 3 sentences."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    // Log OpenRouter response for debugging
    const data = await response.json();
    console.log("OpenRouter status:", response.status);
    console.log("OpenRouter response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("OpenRouter API error:", data.error);
      return res.status(500).json({ 
        error: data.error?.message || "OpenRouter API error" 
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || 
                  "Pixel is too sleepy to respond 💤";

    return res.status(200).json({ reply });
    
  } catch (error) {
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    return res.status(500).json({ 
      error: "Connection to Pixel's magic failed: " + error.message 
    });
  }
}
