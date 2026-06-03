export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Wikipedia image search ────────────────────────────────────
if (req.body.type === "image_search") {
  try {
    const plantName = req.body.plant || "";
    const latinName = req.body.latin || "";
    let imageUrl = null;

    // ── Try Wikipedia first ──────────────────────────────────
    const searchTerms = [latinName, plantName, `${plantName} plant`];
    for (const term of searchTerms) {
      if (imageUrl) break;
      if (!term.trim()) continue;
      try {
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
        if (thumb) { imageUrl = thumb; break; }
      } catch {}
    }

    // ── Fall back to Google Custom Search ───────────────────
    if (!imageUrl && process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
      try {
        const query = encodeURIComponent(`${plantName} ${latinName} houseplant`);
        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${query}&searchType=image&num=5&imgType=photo&imgSize=medium`
        );
        const googleData = await googleRes.json();
        const items = googleData?.items || [];
        for (const item of items) {
          const url = item.link;
          if (url && (url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".png") || url.includes("jpg") || url.includes("png"))) {
            imageUrl = url;
            break;
          }
        }
      } catch {}
    }

    return res.status(200).json({ imageUrl: imageUrl || null });

  } catch (err) {
    console.error("Image search error:", err.message);
    return res.status(200).json({ imageUrl: null });
  }
}
  // ── Read shared plant collection ──────────────────────────────
  if (req.body.type === "read_collection") {
    try {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return res.status(200).json({ collection: null, error: "No database configured" });
      }
      const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/plant_collection`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      const data = await r.json();
      const collection = data.result ? JSON.parse(data.result) : null;
      return res.status(200).json({ collection });
    } catch (err) {
      return res.status(200).json({ collection: null, error: err.message });
    }
  }

  // ── Write shared plant collection ─────────────────────────────
  if (req.body.type === "write_collection") {
    try {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return res.status(200).json({ ok: false, error: "No database configured" });
      }
      const payload = JSON.stringify(req.body.collection);
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/plant_collection`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([payload]),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(200).json({ ok: false, error: err.message });
    }
  }

  // ── Claude AI request ─────────────────────────────────────────
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
        max_tokens: 1500,
        messages: req.body.messages,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}