export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Handle image search requests
  if (req.body.type === "image_search") {
  try {
    const plantName = req.body.plant;
    
    // Try increasingly specific queries until we get a good result
   const plantName = req.body.plant;
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
        {
          headers: {
            "Authorization": `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );
      const data = await response.json();
      
      if (data.results?.length > 0) {
        // Pick the photo whose description/alt best matches the plant name
        const plantWords = plantName.toLowerCase().split(" ");
        let best = null;
        let bestScore = -1;

        for (const photo of data.results) {
          const searchText = [
            photo.alt_description || "",
            photo.description || "",
            ...(photo.tags?.map(t => t.title) || []),
          ].join(" ").toLowerCase();

          const score = plantWords.filter(word => 
            word.length > 3 && searchText.includes(word)
          ).length;

          if (score > bestScore) {
            bestScore = score;
            best = photo;
          }
        }

        bestPhoto = best || data.results[0];
        break;
      }
    }

    if (bestPhoto) {
      const url = `${bestPhoto.urls.raw}&w=120&h=120&fit=crop&auto=format`;
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