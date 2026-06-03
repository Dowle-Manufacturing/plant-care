export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Image search
  if (req.body.type === "image_search") {
    try {
      const plantName = req.body.plant || "";
      const latinName = req.body.latin || "";

      const queries = [
        `${plantName} houseplant potted indoor`,
        `${latinName} plant`,
        `${plantName} plant`,
      ];

      let bestPhoto = null;

      for (const query of queries) {
        const encoded = encodeURIComponent(query);
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encoded}&per_page=5&orientation=squarish&content_filter=high`,
          { headers: { "Authorization": `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
        );

        if (!response.ok) {
          console.error("Unsplash error:", response.status, await response.text());
          continue;
        }

        const data = await response.json();

        if (data.results?.length > 0) {
          const plantWords = plantName.toLowerCase().split(" ").filter(w => w.length > 3);
          let best = null;
          let bestScore = -1;

          for (const photo of data.results) {
            const searchText = [
              photo.alt_description || "",
              photo.description || "",
              ...(photo.tags?.map(t => t.title) || []),
            ].join(" ").toLowerCase();

            const score = plantWords.filter(word => searchText.includes(word)).length;
            if (score > bestScore) { bestScore = score; best = photo; }
          }

          bestPhoto = best || data.results[0];
          break;
        }
      }

      if (bestPhoto) {
        return res.status(200).json({
          imageUrl: `${bestPhoto.urls.raw}&w=120&h=120&fit=crop&auto=format`
        });
      }
      return res.status(200).json({ imageUrl: null });

    } catch (err) {
      console.error("Image search error:", err.message);
      return res.status(200).json({ imageUrl: null });
    }
  }

  // Claude request
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