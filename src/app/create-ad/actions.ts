"use server";

import puppeteer from 'puppeteer';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"; 

// Helper function to extract website text using Puppeteer
async function scrapeWebsiteContent(url: string) {
  let browser = null;

  try {
    console.log('🚀 Launching Puppeteer...');

    browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log(`📡 Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('⏳ Waiting for content...');

    try {
      await page.waitForSelector('body', { timeout: 5000 });
    } catch (e) {
      console.log('⚠️ Body selector timeout, continuing');
    }

    // Additional wait for JavaScript
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📝 Extracting content...');

    const content = await page.evaluate(() => {
      const contentSelectors = [
        '.property-list', '.rental-list', '.listings', '.properties',
        '[class*="listing"]', '[class*="property"]', '[class*="rental"]',
        'main', '[role="main"]', '.main-content', '#main-content',
        '.content', '#content', 'article', 'body',
      ];

      let bestContent: HTMLElement | null = null;
      let maxLength = 0;

      for (const selector of contentSelectors) {
        try {
          const elem = document.querySelector(selector) as HTMLElement;
          if (elem) {
            const text = elem.innerText || elem.textContent || '';
            if (text.length > maxLength) {
              maxLength = text.length;
              bestContent = elem;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (!bestContent) return 'No content found';

      const clone = bestContent.cloneNode(true) as HTMLElement;

      // Remove unwanted elements
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'nav', 'header', 'footer',
        '.menu', '.navigation', '.nav', '.header', '.footer', '.sidebar',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        'iframe', 'embed', 'object',
      ];

      for (const selector of unwantedSelectors) {
        try {
          clone.querySelectorAll(selector).forEach(el => {
            if (el?.parentNode) el.parentNode.removeChild(el);
          });
        } catch (e) {
          continue;
        }
      }

      let text = clone.innerText || clone.textContent || '';
      text = text
        .replace(/\s+/g, ' ')
        .replace(/Menu\s+(Home|For Rent|For Sale|Contact|About|Login)+(\s+\1)*/gi, '')
        .replace(/©.*?(rights reserved|All Rights Reserved)/gi, '')
        .replace(/\(\d{3}\)\s*\d{3}-\d{4}/g, '')
        .trim();

      // Find an image
      let foundImageUrl = null;
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && (ogImage as HTMLMetaElement).content) foundImageUrl = (ogImage as HTMLMetaElement).content;
      
      if (!foundImageUrl) {
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        if (twitterImage && (twitterImage as HTMLMetaElement).content) foundImageUrl = (twitterImage as HTMLMetaElement).content;
      }
      
      if (!foundImageUrl) {
        const imgs = Array.from(document.querySelectorAll('img'));
        for (const img of imgs) {
          if (img.width > 200 && img.height > 200 && img.src) {
            foundImageUrl = img.src;
            break;
          }
        }
      }

      return { text, imageUrl: foundImageUrl };
    });

    if (typeof content === 'string' || !content.text) {
      console.log(`⚠️ Scraping result: ${content}`);
      throw new Error('No content found on page');
    }

    console.log(`✅ Scraped ${content.text.length} characters`);

    await browser.close();
    browser = null;

    return content;
  } catch (error: any) {
    console.error('❌ Scraping error:', error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Failed to close browser:', e);
      }
    }
    throw error;
  }
}

export async function generateAdContent(clickUrl: string) {
  try {
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
