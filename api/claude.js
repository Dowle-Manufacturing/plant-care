export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const API_KEY = "sk-ant-YOUR-ACTUAL-KEY-HERE";
    
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
    res.status(200).json(data);

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}