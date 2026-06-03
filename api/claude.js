export default async function handler(req, res) {

  // ── GET request — proxy images ────────────────────────────────
  if (req.method === "GET") {
    const imgUrl = req.query.img;
    if (!imgUrl) return res.status(400).end();
    try {
      const response = await fetch(decodeURIComponent(imgUrl), {
        headers: { "User-Agent": "Mozilla/5.0 PlantCareApp/1.0" },
      });
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(buffer));
    } catch {
      return res.status(404).end();
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Make sure body is parsed ──────────────────────────────────
  const body = req.body;
  if (!body) return res.status(400).json({ error: "No body" });

  // ── Wikipedia + Google image search ──────────────────────────
  if (body.type === "image_search") {
  try {
    const plantName = body.plant || "";
    const latinName = body.latin || "";
    let imageUrl = null;

    // ── Try Google first ─────────────────────────────────────
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx     = process.env.GOOGLE_SEARCH_CX;
  if (apiKey && cx) {
  try {
    console.log("Trying Google for:", plantName, "| key:", !!apiKey, "| cx:", !!cx);
    const query = encodeURIComponent(`${latinName || plantName} plant`);
        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}&searchType=image&num=3&imgType=photo`
        );
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          const first = googleData?.items?.[0];
          if (first?.link) imageUrl = first.link;
        }
      } catch {}
    }

    // ── Fall back to Wikipedia ────────────────────────────────
    if (!imageUrl) {
      const searchTerms = [
        latinName,
        plantName,
        `${latinName} plant`,
        `${plantName} houseplant`,
        latinName.split(" ")[0],
      ];
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
    }

    return res.status(200).json({ imageUrl: imageUrl || null });

  } catch (err) {
    console.error("Image search error:", err.message);
    return res.status(200).json({ imageUrl: null });
  }
}

  // ── Read shared collection from Upstash ───────────────────────
  if (body.type === "read_collection") {
    try {
      const url   = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return res.status(200).json({ collection: null });
      const r = await fetch(`${url}/get/plant_collection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      const collection = data.result ? JSON.parse(data.result) : null;
      return res.status(200).json({ collection });
    } catch (err) {
      console.error("Read collection error:", err.message);
      return res.status(200).json({ collection: null });
    }
  }

  // ── Write shared collection to Upstash ────────────────────────
  if (body.type === "write_collection") {
    try {
      const url   = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return res.status(200).json({ ok: false });
      const payload = JSON.stringify(body.collection);
      await fetch(`${url}/set/plant_collection`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([payload]),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Write collection error:", err.message);
      return res.status(200).json({ ok: false });
    }
  }

  // ── Claude AI request ─────────────────────────────────────────
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

    if (!body.messages || !Array.isArray(body.messages)) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: body.messages,
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