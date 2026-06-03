export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Handle image search requests
  if (req.body.type === "image_search") {
    try {
      const query = encodeURIComponent(`${req.body.plant} houseplant growing pot`);
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=squarish`,
        {
          headers: {
            "Authorization": `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );
      const data = await response.json();
      const photo = data.results?.[0];
      if (photo) {
        const url = `${photo.urls.raw}&w=120&h=120&fit=crop`;
        res.status(200).json({ imageUrl: url });
      } else {
        res.status(200).json({ imageUrl: null });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Handle Claude requests
  try {
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
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}