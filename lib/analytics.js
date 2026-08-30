import crypto from 'crypto';

// Comprehensive 60+ Bot, Crawler, and Automated Scraper Signatures
const BOT_SIGNATURES = [
  'bot',
  'crawl',
  'spider',
  'slurp',
  'mediapartners',
  'googlebot',
  'bingbot',
  'yandex',
  'duckduckbot',
  'baiduspider',
  'twitterbot',
  'facebookexternalhit',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'discordbot',
  'google page speed',
  'qwantify',
  'chrome-lighthouse',
  'telegrambot',
  'headless',
  'phantomjs',
  'puppeteer',
  'selenium',
  'playwright',
  'curl',
  'wget',
  'python',
  'postman',
  'httpclient',
  'vercel-screenshot',
  'semrush',
  'ahrefs',
  'mj12bot',
  'dotbot',
  'screaming frog',
  'feedfetcher',
  'petalbot',
  'bytespider',
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'anthropic-ai',
  'ccbot',
  'cohere-ai',
];

export function isBot(userAgent, clientSignals = {}) {
  // 1. Missing or empty User-Agent is immediately flagged as a bot
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim().length < 8) {
    return true;
  }

  // 2. Check for automation driver flags from client (Puppeteer / Selenium / Playwright)
  if (clientSignals?.webdriver === true || clientSignals?.isAutomated === true) {
    return true;
  }

  // 3. Match against known bot & crawler signatures
  const lower = userAgent.toLowerCase();
  const matched = BOT_SIGNATURES.some((pattern) => lower.includes(pattern));
  if (matched) return true;

  // 4. Check for headless browser signatures
  if (lower.includes('headlesschrome') || lower.includes('electron') || lower.includes('node.js')) {
    return true;
  }

  return false;
}

// Generate unique hash for deduplicating daily unique human visitors
export function generateVisitorHash(ip, userAgent) {
  const cleanIp = (ip || '127.0.0.1').split(',')[0].trim();
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = `${cleanIp}:::${userAgent || ''}:::${dateStr}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export function detectDevice(userAgent) {
  if (!userAgent) return 'Desktop';
  const lower = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lower)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(lower)) {
    return 'Mobile';
  }
  return 'Desktop';
}
