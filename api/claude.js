export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Wikipedia image search ────────────────────────────────────
  if (req.body.type === "image_search") {
    try {
      const plantName = req.body.plant || "";
      const latinName = req.body.latin || "";
      const searchTerms = [latinName, plantName, `${plantName} plant`];
      let imageUrl = null;

      for (const term of searchTerms) {
        if (imageUrl) break;
        if (!term.trim()) continue;

        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`
        );
        const searchData = await searchRes.json();
        const firstResult = searchData?.query?.search?.[0];
        if (!firstResult) continue;

        const pageTitle = encodeURIComponent(firstResult.title);
        const imageRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=pageimages&pithumbsize=600&format=json&origin=*`
        );
        const imageData = await imageRes.json();
        const pages = imageData?.query?.pages;
        const page = pages ? Object.values(pages)[0] : null;
        const thumb = page?.thumbnail?.source;

        if (thumb) {
          imageUrl = thumb;
          break;
        }
      }

      return res.status(200).json({ imageUrl: imageUrl || null });

    } catch (err) {
      console.error("Wikipedia image error:", err.message);
      return res.status(200).json({ imageUrl: null });
    }
  }

  // ── Claude request ────────────────────────────────────────────
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
    }
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: req.body.messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Claude error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}