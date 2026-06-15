const axios = require("axios");

// Supported platforms check
function isSupportedUrl(url) {
  const platforms = [
    "tiktok.com", "youtube.com", "youtu.be",
    "twitter.com", "x.com", "facebook.com", "fb.watch",
    "instagram.com", "tumblr.com", "threads.net",
    "spotify.com", "soundcloud.com", "snapchat.com",
    "reddit.com", "pinterest.com", "pin.it",
    "linkedin.com", "kuaishou.com", "kwai.com",
    "douyin.com", "dailymotion.com", "dai.ly",
    "capcut.com", "bsky.app"
  ];
  return platforms.some(p => url.includes(p));
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid URL",
      author: "Rocky Chowdhury"
    });
  }

  if (!isSupportedUrl(url)) {
    return res.status(400).json({
      success: false,
      error: "Unsupported platform",
      author: "Rocky Chowdhury"
    });
  }

  try {
    // Using cobalt.tools free API (no key needed)
    const cobaltRes = await axios.post(
      "https://api.cobalt.tools/",
      { url },
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const data = cobaltRes.data;

    if (data.status === "error") {
      return res.status(400).json({
        success: false,
        error: data.error?.code || "Download failed",
        author: "Rocky Chowdhury"
      });
    }

    // cobalt returns tunnel URL or stream URL
    const videoUrl = data.url || (data.picker && data.picker[0]?.url);

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: "Could not extract video URL",
        author: "Rocky Chowdhury"
      });
    }

    return res.status(200).json({
      success: true,
      result: videoUrl,
      cp: `✅ Downloaded by Rocky Chowdhury Bot\n🔗 ${url}`,
      author: "Rocky Chowdhury"
    });

  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      author: "Rocky Chowdhury"
    });
  }
};
