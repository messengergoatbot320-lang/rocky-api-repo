const axios = require("axios");

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

// TikTok downloader using tikwm.com (free, no key needed)
async function downloadTikTok(url) {
  const res = await axios.post(
    "https://www.tikwm.com/api/",
    new URLSearchParams({ url, count: 12, cursor: 0, web: 1, hd: 1 }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000
    }
  );
  const data = res.data;
  if (data && data.code === 0 && data.data) {
    const videoUrl = data.data.hdplay || data.data.play;
    const title = data.data.title || "TikTok Video";
    return { videoUrl, title };
  }
  throw new Error("TikTok download failed");
}

// Facebook downloader using getfvid API (free)
async function downloadFacebook(url) {
  const res = await axios.get(
    `https://getfvid.com/downloader`,
    {
      params: { url },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 20000
    }
  );
  // Try snapinsta-style API for FB
  const res2 = await axios.post(
    "https://fdownloader.net/api/ajaxSearch",
    new URLSearchParams({ q: url, t: "media", lang: "en" }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000
    }
  );
  if (res2.data && res2.data.data) {
    // Parse HD link from HTML response
    const html = res2.data.data;
    const match = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { videoUrl: match[1], title: "Facebook Video" };
  }
  throw new Error("Facebook download failed");
}

// YouTube via yt-dlp style free API
async function downloadYoutube(url) {
  const res = await axios.get(
    `https://api.vevioz.com/api/button/mp4/${encodeURIComponent(url)}`,
    { timeout: 20000 }
  );
  if (res.data) {
    const match = String(res.data).match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { videoUrl: match[1], title: "YouTube Video" };
  }
  throw new Error("YouTube download failed");
}

// Instagram via snapinsta free API
async function downloadInstagram(url) {
  const res = await axios.post(
    "https://snapinsta.app/api/ajaxSearch",
    new URLSearchParams({ q: url, t: "media", lang: "en" }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000
    }
  );
  if (res.data && res.data.data) {
    const html = res.data.data;
    const match = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    if (match) return { videoUrl: match[1], title: "Instagram Video" };
  }
  throw new Error("Instagram download failed");
}

module.exports = async (req, res) => {
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
    let result = null;

    if (url.includes("tiktok.com")) {
      result = await downloadTikTok(url);
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      result = await downloadFacebook(url);
    } else if (url.includes("instagram.com")) {
      result = await downloadInstagram(url);
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      result = await downloadYoutube(url);
    } else {
      // Fallback: cobalt.tools for other platforms
      const cobaltRes = await axios.post(
        "https://api.cobalt.tools/",
        { url },
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
      const data = cobaltRes.data;
      const videoUrl = data.url || (data.picker && data.picker[0]?.url);
      if (videoUrl) result = { videoUrl, title: "Video" };
    }

    if (!result || !result.videoUrl) {
      return res.status(400).json({
        success: false,
        error: "Could not extract video URL",
        author: "Rocky Chowdhury"
      });
    }

    return res.status(200).json({
      success: true,
      result: result.videoUrl,
      cp: `✅ Downloaded by Rocky Chowdhury Bot\n📹 ${result.title}\n🔗 ${url}`,
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
