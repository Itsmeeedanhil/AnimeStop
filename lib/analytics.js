import crypto from 'crypto';

// Comprehensive Bot & Crawler detection list
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
];

export function isBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return true;
  const lower = userAgent.toLowerCase();
  return BOT_SIGNATURES.some((pattern) => lower.includes(pattern));
}

export function generateVisitorHash(ip, userAgent) {
  const raw = `${ip || 'unknown'}-${userAgent || 'unknown'}-${new Date().toISOString().slice(0, 10)}`;
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

