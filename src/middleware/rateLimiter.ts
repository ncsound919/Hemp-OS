import rateLimit from 'express-rate-limit';

/**
 * General-purpose limiter for routes that trigger outbound network calls
 * (AI inference, web scraping, Ollama proxying) or otherwise do
 * non-trivial work per request. Keeps a single abusive client from
 * exhausting server/upstream resources.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

/**
 * Stricter limiter for the most expensive/abuse-prone endpoints: scraping
 * third-party sites and re-seeding the strain database.
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
