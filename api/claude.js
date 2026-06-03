export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const API_KEY = "sk-ant-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";
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log("FULL RESPONSE:", JSON.stringify(data));
    res.status(200).json(data);

  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}