/* eslint-disable no-console, no-await-in-loop */
const http = require('http');

// The port isn't in one reliable place: `next dev`/`next start` take it via -p
// (package.json passes $PORT to start), and PORT may also be set directly.
const getPort = () => {
  if (process.env.PORT) {
    return process.env.PORT;
  }
  const portFlagIndex = process.argv.findIndex((arg) => arg === '-p' || arg === '--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    return process.argv[portFlagIndex + 1];
  }
  return '3000';
};

const getJson = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error(`Received ${response.statusCode} from ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Self-requests the app's own API routes on boot so the newest set's data (17Lands
// card data + Scryfall keywords) is already cached when the first visitor arrives.
// Warming over HTTP (rather than importing the network modules here) matters: it
// populates the cache instances inside the compiled API route bundles — the ones
// real requests actually read. Uses the same params as the client's initial fetch
// so the cache keys match. Failures are logged and swallowed; warm-up is best-effort.
module.exports = () => {
  // Next evaluates next.config.js multiple times per boot; only warm once per process
  if (global.__cacheWarmUpScheduled) {
    return;
  }
  global.__cacheWarmUpScheduled = true;

  const baseUrl = `http://localhost:${getPort()}`;

  const warmUp = async () => {
    const startedAt = Date.now();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        console.log(`[warm-up] Fetching ${baseUrl}/api/filters to find the newest set...`);
        const filters = await getJson(`${baseUrl}/api/filters`);
        const newestExpansion = filters && filters.expansions && filters.expansions[0];
        if (!newestExpansion) {
          throw new Error('No expansions in /api/filters response');
        }
        console.log(`[warm-up] Newest set is ${newestExpansion}; warming card data (17Lands + Scryfall)...`);
        await getJson(`${baseUrl}/api/cards?expansion=${encodeURIComponent(newestExpansion)}&format=PremierDraft&timePeriod=ALL_TIME`);
        console.log(`[warm-up] Complete: ${newestExpansion} cached in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
        return;
      } catch (error) {
        if (attempt === 3) {
          console.log(`[warm-up] Giving up after 3 attempts: ${error.message}`);
          return;
        }
        console.log(`[warm-up] Attempt ${attempt} failed (${error.message}); retrying in 5s...`);
        await delay(5000);
      }
    }
  };

  // Give the server a moment to bind before self-requesting
  setTimeout(warmUp, 3000);
};
