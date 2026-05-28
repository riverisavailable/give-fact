export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://riverisavailable.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.9 }
        })
      }
    );
    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    if (data.promptFeedback?.blockReason) {
      return res.status(200).json({ text: `[차단됨: ${data.promptFeedback.blockReason}] 다시 시도해보세요.` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 불러오지 못했어요.";
    res.status(200).json({ text, debug: data });
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: e.message });
  }
}