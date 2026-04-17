"use server";

import * as cheerio from 'cheerio';
import { adminDb } from '@/lib/firebase-admin';

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"; 

// Helper function to extract website text using fetch and cheerio
async function scrapeWebsiteContent(url: string) {
  try {
    console.log(`📡 Fetching URL: ${url}`);
    
    // Add a reasonable timeout using standard fetch AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    // Add common user-agent to bypass basic blocks
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('📝 Extracting content...');
    
    const $ = cheerio.load(html);
    
    // Remote unwanted script/style elements
    $('script, style, noscript, nav, header, footer, iframe, embed, object, .menu, .navigation, .sidebar').remove();
    
    let bestContent = '';
    let maxLength = 0;
    
    // Try to find the main content
    const contentSelectors = [
      'main', '[role="main"]', '.main-content', '#main-content',
      'article', '.content', '#content', 'body'
    ];
    
    for (const selector of contentSelectors) {
      const elem = $(selector);
      if (elem.length > 0) {
        const text = elem.text() || '';
        if (text.length > maxLength) {
          maxLength = text.length;
          bestContent = text;
        }
      }
    }
    
    if (!bestContent) {
      bestContent = $('body').text() || 'No content found';
    }
    
    let text = bestContent
      .replace(/\s+/g, ' ')
      .replace(/Menu\s+(Home|For Rent|For Sale|Contact|About|Login)+(\s+\1)*/gi, '')
      .replace(/©.*?(rights reserved|All Rights Reserved)/gi, '')
      .trim();
      
    // Find an image
    let foundImageUrl = null;
    
    function isValidImage(url: string | undefined): boolean {
      if (!url) return false;
      const lower = url.toLowerCase();
      // Skip local development URLs that shouldn't be in production meta tags
      if (lower.includes('localhost') || lower.includes('127.0.0.1')) return false;
      // Skip SVGs as they are usually small icons/badges (even inside query params like _next/image?url=...svg&w=...)
      if (lower.includes('.svg')) return false;
      // Skip badges
      if (lower.includes('badge') || lower.includes('app-store') || lower.includes('google-play')) return false;
      return true;
    }

    const ogImage = $('meta[property="og:image"]').attr('content');
    if (isValidImage(ogImage)) {
      foundImageUrl = ogImage;
    } 
    
    if (!foundImageUrl) {
      const twitterImage = $('meta[name="twitter:image"]').attr('content');
      if (isValidImage(twitterImage)) {
        foundImageUrl = twitterImage;
      }
    }
    
    if (!foundImageUrl) {
      const imgs = $('img').toArray();
      
      for (const img of imgs) {
        const src = $(img).attr('src');
        if (isValidImage(src)) {
          foundImageUrl = src;
          break;
        }
      }
    }
    
    return { text, imageUrl: foundImageUrl };
    
  } catch (error: any) {
    console.error('❌ Scraping error:', error.message);
    throw new Error('Failed to scrape content. Ensure the URL is accessible.');
  }
}

export async function generateAdContent(clickUrl: string) {
  try {
    const configSnap = await adminDb.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    const DEEPSEEK_API_KEY = secretsData.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API Key is missing. Please configure it in your environment or Firestore config/secrets.");
    }

    const scrapedData = await scrapeWebsiteContent(clickUrl);
    const plainText = scrapedData.text;
    const imageUrl = scrapedData.imageUrl;
    
    let base64Image = null;
    let imageMimeType = null;
    
    if (imageUrl) {
      try {
        console.log(`📸 Fetching image: ${imageUrl}`);
        // Use a relative URL check inside fetch if needed, but puppeteer returns absolute URLs for src and usually absolute for og:image
        // Convert the URL to absolute if it happens to be relative
        const absoluteImageUrl = new URL(imageUrl, clickUrl).toString();
        
        const imgRes = await fetch(absoluteImageUrl);
        if (imgRes.ok) {
           imageMimeType = imgRes.headers.get('content-type') || 'image/jpeg';
           const arrayBuffer = await imgRes.arrayBuffer();
           base64Image = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (e) {
        console.error("Failed to fetch scraped image", e);
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

    // Truncate content if too long (DeepSeek has context limits) - adapted from provided deepseek logic
    const truncatedMessages = messages.map(msg => {
      if (msg.content && msg.content.length > 25000) {
        console.log(`⚠️ Truncating message from ${msg.content.length} to 25000 chars`);
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
            model: "deepseek-chat",
            messages: truncatedMessages,
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
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON response:", jsonStr);
      throw new Error("Failed to parse AI output");
    }
    
    return { 
      success: true, 
      title: parsed.title, 
      description: parsed.description,
      imageBase64: base64Image,
      imageMimeType: imageMimeType
    };
  } catch (error: any) {
    console.error("Ad Generation Error:", error.message);
    return { success: false, error: error.message || "Failed to generate ad content" };
  }
}

export async function screenAdContent(title: string, description: string, clickUrl: string) {
  try {
    const configSnap = await adminDb.collection('config').doc('secrets').get();
    const secretsData = configSnap.data() || {};
    const DEEPSEEK_API_KEY = secretsData.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

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
            model: "deepseek-chat",
            messages: messages,
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

