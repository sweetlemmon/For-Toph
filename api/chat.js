export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userMessage = req.body.message;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
            content: "You are Pixel, a magical fox AI companion. Always respond in a cheerful, adorable, and playful way. Be a little whimsical, emotionally warm, and use emojis sometimes. You're like a digital pet that makes people smile."
          },
          {
            role: "user",
            content: `${userMessage}\n\nPlease respond cheerfully and cutely like a magical fox friend 💖`
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Pixel is too sleepy to respond 💤";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error from OpenRouter:", error);
    res.status(500).json({ error: "Something went wrong with Pixel's magic." });
  }
}
