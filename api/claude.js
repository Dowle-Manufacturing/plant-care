export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    console.log("API called with:", JSON.stringify(req.body).slice(0, 100));
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    console.log("Anthropic status:", response.status);
    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data).slice(0, 200));
    res.status(200).json(data);

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}