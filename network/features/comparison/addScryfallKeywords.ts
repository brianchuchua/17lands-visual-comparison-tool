import axios from 'axios';
import NodeCache from 'node-cache';

const ONE_DAY = 60 * 60 * 24;
const keywordCache = new NodeCache({ stdTTL: ONE_DAY, useClones: false }); // keyed by Scryfall card id

const SCRYFALL_COLLECTION_URL = 'https://api.scryfall.com/cards/collection';
const BATCH_SIZE = 75; // Scryfall's max identifiers per collection request

// 17Lands serves Scryfall-hosted card images, so the card's Scryfall id is embedded in the URL,
// e.g. https://cards.scryfall.io/large/front/9/5/95318d85-4a08-47ac-a43d-ea83c0bea81c.jpg
const getScryfallId = (imageUrl: string): string | null => {
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(imageUrl || '');
  return match ? match[1] : null;
};

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Annotates 17Lands cards with Scryfall's `keywords` list (Flash, Flying, ...), which the
// 17Lands payload doesn't carry. Fails soft: if Scryfall is unreachable, cards get an empty
// keywords list and the rest of the card data is unaffected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addScryfallKeywords = async (cards: any[]): Promise<void> => {
  const idsToFetch = [];
  cards.forEach((card) => {
    const scryfallId = getScryfallId(card?.url);
    if (scryfallId && keywordCache.get(scryfallId) === undefined && idsToFetch.indexOf(scryfallId) === -1) {
      idsToFetch.push(scryfallId);
    }
  });

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
        keywordCache.set(scryfallCard.id, scryfallCard.keywords || []);
      });
      // Ids Scryfall couldn't find still get a cache entry so we don't refetch them every request
      batch.forEach((id) => {
        if (keywordCache.get(id) === undefined) {
          keywordCache.set(id, []);
        }
      });
      if (batchStart + BATCH_SIZE < idsToFetch.length) {
        // eslint-disable-next-line no-await-in-loop
        await delay(100); // Scryfall asks for ~10 requests/second
      }
    }
  } catch (error) {
    // Scryfall being down shouldn't take the 17Lands card data down with it
  }

  cards.forEach((card) => {
    const scryfallId = getScryfallId(card?.url);
    card.keywords = (scryfallId && keywordCache.get(scryfallId)) || [];
  });
};
