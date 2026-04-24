"use server";



const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// Lightweight HTML text extractor using regex — no external DOM parser needed
function extractTextFromHtml(html: string): string {
  let text = html;
  // Remove script/style/noscript blocks entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Extract og:image or first img src from HTML
function extractImageFromHtml(html: string): string | null {
  let match = null;
  // Try og:image first
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) match = ogMatch[1];

  // Try twitter:image
  if (!match) {
    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
    if (twMatch) match = twMatch[1];
  }

  // Fallback: first <img> with src
  if (!match) {
    const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
    if (imgMatch) match = imgMatch[1];
  }

  if (match) {
    return match.replace(/&amp;/g, '&');
  }
  return null;
}

// Helper function to extract website text
async function scrapeWebsiteContent(url: string) {
  try {
    console.log(`📡 Fetching URL: ${url}`);
    
    // Standardize URL formatting to ensure reliable fetching
    let fetchUrl = url;
    if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
      fetchUrl = 'https://' + fetchUrl;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('📝 Extracting content...');

    const cleanText = extractTextFromHtml(html).substring(0, 10000);
    let foundImageUrl = extractImageFromHtml(html);

    if (foundImageUrl) {
      // Resolve relative URLs using the site URL
      try {
        foundImageUrl = new URL(foundImageUrl, fetchUrl).href;
      } catch (e) {
        console.warn(`[SCRAPER] Invalid image URL encountered: ${foundImageUrl}`);
        foundImageUrl = null;
      }
    }

    if (foundImageUrl) {
      console.log(`📸 Found image: ${foundImageUrl}`);
    }

    return { text: cleanText, imageUrl: foundImageUrl };
  } catch (error: any) {
    console.error(`[SCRAPER] Fatal error for ${url}:`, error.message);
    throw error;
  }
}

export async function generateAdContent(clickUrl: string) {
  try {
    console.log(`[GEN_AD] Starting generation for ${clickUrl}`);
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
      console.error("[GEN_AD] Missing API Key");
      throw new Error("DeepSeek API Key is missing.");
    }

    const scrapedData = await scrapeWebsiteContent(clickUrl);
    const plainText = scrapedData.text;
    const imageUrl = scrapedData.imageUrl;

    let base64Image = null;
    let imageMimeType = null;

    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });
        if (imgRes.ok) {
          imageMimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 800 * 1024) {
            console.warn(`[GEN_AD] Image too large (${buffer.length} bytes), skipping`);
          } else {
            base64Image = buffer.toString('base64');
          }
        } else {
          console.warn(`[GEN_AD] Image fetch failed with status: ${imgRes.status}`);
        }
      } catch (e: any) {
        console.warn(`[GEN_AD] Image fetch error: ${e.message}`);
      }
    }

    console.log('🤖 DeepSeek generating ad content');

    const messages = [
      {
        role: "system",
        content: "You are an expert ad copywriter. Generate a catchy ad title (max 30 characters) and a brief description (max 90 characters) based on the URL context. Return ONLY valid JSON in the format {\"title\": \"...\", \"description\": \"...\"} without any markdown code block formatting."
      },
      {
        role: "user",
        content: `Target URL: ${clickUrl}\n\nWebsite content (partial): ${plainText}\n\nPlease generate the title and description for this ad. Output ONLY JSON.`
      }
    ];

    // Truncate content if too long
    const truncatedMessages = messages.map(msg => {
      if (msg.content && msg.content.length > 25000) {
        return {
          ...msg,
          content: msg.content.substring(0, 25000) + '\n\n[Content truncated due to length]'
        };
      }
      return msg;
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const aiResponse = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: truncatedMessages,
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        stream: false,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ DeepSeek API error:', errorText);
      throw new Error(`AI Api Error: ${aiResponse.status} ${errorText}`);
    }

    const data = await aiResponse.json();
    console.log('✅ DeepSeek response received');

    const content = data.choices[0].message.content;
    let jsonStr = content;
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    let parsed;
    try {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", jsonStr);
      throw new Error(`AI generated invalid format: ${jsonStr.substring(0, 50)}...`);
    }

    return {
      success: true,
      title: parsed.title,
      description: parsed.description,
      imageBase64: base64Image,
      imageMimeType: imageMimeType
    };
  } catch (error: any) {
    console.error("[GEN_AD] FATAL ERROR:", error);
    return {
      success: false,
      error: `Server Error: ${error.message || "Unknown error occurred"}`
    };
  }
}

export async function screenAdContent(title: string, description: string, clickUrl: string) {
  try {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API Key is missing. Please configure it in your environment or Firestore config/secrets.");
    }

    console.log('🤖 DeepSeek screening ad content...');

    const messages = [
      {
        role: "system",
        content: "You are an AI ad moderation assistant. Review the following ad title, description, and destination URL. Your job is to strictly enforce our content policy. Ads MUST be rejected if they contain or promote: 1. Sex, nudity, porn, or adult dating. 2. Violence, gore, or harm. 3. Drugs, illegal substances, or irresponsible use of regulated items. 4. Hate speech or discrimination. If the ad is safe, return {\"passed\": true, \"reason\": \"\"}. If it violates policy, return {\"passed\": false, \"reason\": \"<Specific reason for rejection>\"}. Response MUST be valid JSON, nothing else."
      },
      {
        role: "user",
        content: `Title: ${title}\nDescription: ${description}\nDestination URL: ${clickUrl}\n\nPlease analyze and output JSON only.`
      }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const aiResponse = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: messages,
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        stream: false,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ DeepSeek API error during screening:', errorText);
      throw new Error(`AI Api Error: ${aiResponse.status} ${errorText}`);
    }

    const data = await aiResponse.json();
    const content = data.choices[0].message.content;
    let jsonStr = content;
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI output:", jsonStr);
      throw new Error("Failed to parse AI screening output");
    }

    return {
      success: true,
      passed: parsed.passed,
      reason: parsed.reason
    };
  } catch (error: any) {
    console.error("Ad Screening Error:", error.message);
    return { success: false, error: error.message || "Failed to screen ad content" };
  }
}
