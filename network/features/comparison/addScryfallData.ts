import axios from 'axios';
import NodeCache from 'node-cache';

const ONE_DAY = 60 * 60 * 24;
const scryfallCache = new NodeCache({ stdTTL: ONE_DAY, useClones: false }); // keyed by Scryfall card id

const SCRYFALL_COLLECTION_URL = 'https://api.scryfall.com/cards/collection';
const BATCH_SIZE = 75; // Scryfall's max identifiers per collection request

// 17Lands serves Scryfall-hosted card images, so the card's Scryfall id is embedded in the URL,
// e.g. https://cards.scryfall.io/large/front/9/5/95318d85-4a08-47ac-a43d-ea83c0bea81c.jpg
const getScryfallId = (imageUrl: string): string | null => {
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(imageUrl || '');
  return match ? match[1] : null;
};

interface ScryfallCacheEntry {
  keywords: string[];
  priceUsd: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCacheEntry = (scryfallCard: any): ScryfallCacheEntry => {
  // Foil-only cards (and some Arena-only printings) have no regular USD price
  const price = scryfallCard?.prices?.usd ?? scryfallCard?.prices?.usd_foil ?? null;
  return {
    keywords: scryfallCard?.keywords || [],
    priceUsd: price === null ? null : Number(price),
  };
};

const EMPTY_ENTRY: ScryfallCacheEntry = { keywords: [], priceUsd: null };

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Annotates 17Lands cards with the Scryfall data the 17Lands payload doesn't carry:
// `keywords` (Flash, Flying, ...) and `price_usd`. Matched by the Scryfall card id in the
// image URL. Fails soft: if Scryfall is unreachable, cards get empty keywords / null price
// and the rest of the card data is unaffected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addScryfallData = async (cards: any[]): Promise<void> => {
  const idsToFetch = [];
  cards.forEach((card) => {
    const scryfallId = getScryfallId(card?.url);
    if (scryfallId && scryfallCache.get(scryfallId) === undefined && idsToFetch.indexOf(scryfallId) === -1) {
      idsToFetch.push(scryfallId);
    }
  });

  // Steady state (everything cached) logs nothing; fetch lines only appear on cold boots
  // and cache expiry, so a log tail stays readable
  if (idsToFetch.length > 0) {
    console.log(
      `[scryfall] Fetching keywords/prices for ${idsToFetch.length} cards in ${Math.ceil(idsToFetch.length / BATCH_SIZE)} batch(es)...`,
    );
  }
  const startedAt = Date.now();

  try {
    for (let batchStart = 0; batchStart < idsToFetch.length; batchStart += BATCH_SIZE) {
      const batch = idsToFetch.slice(batchStart, batchStart + BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.post(
        SCRYFALL_COLLECTION_URL,
        { identifiers: batch.map((id) => ({ id })) },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': '17lands-visual-comparison-tool (https://17lands.mtgcb.tools)',
          },
        },
      );
      (response?.data?.data || []).forEach((scryfallCard) => {
        scryfallCache.set(scryfallCard.id, toCacheEntry(scryfallCard));
      });
      // Ids Scryfall couldn't find still get a cache entry so we don't refetch them every request
      batch.forEach((id) => {
        if (scryfallCache.get(id) === undefined) {
          scryfallCache.set(id, EMPTY_ENTRY);
        }
      });
      if (batchStart + BATCH_SIZE < idsToFetch.length) {
        // eslint-disable-next-line no-await-in-loop
        await delay(100); // Scryfall asks for ~10 requests/second
      }
    }
    if (idsToFetch.length > 0) {
      console.log(`[scryfall] Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    }
  } catch (error) {
    // Scryfall being down shouldn't take the 17Lands card data down with it
    console.log(`[scryfall] Fetch failed (cards will have no keywords/prices until retry): ${error.message}`);
  }

  cards.forEach((card) => {
    const scryfallId = getScryfallId(card?.url);
    const entry = (scryfallId && scryfallCache.get<ScryfallCacheEntry>(scryfallId)) || EMPTY_ENTRY;
    card.keywords = entry.keywords;
    card.price_usd = entry.priceUsd;
  });
};
