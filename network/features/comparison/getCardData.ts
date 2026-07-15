import getWithCache from '../../getWithCache';
import { addScryfallKeywords } from './addScryfallKeywords';

export interface GetCardDataFunction {
  (params: CardDataParams): any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface CardDataParams {
  expansion: string;
  format: string;
  colors?: string;
  timePeriod?: string;
}

export const getCardData: GetCardDataFunction = async ({ expansion, format, colors, timePeriod }) => {
  try {
    const response = await getWithCache(`https://api.17lands.com/api/card_data`, {
      expansion,
      event_type: format,
      colors,
      time_period: timePeriod || 'ALL_TIME',
    });

    // The card list is nested under a "data" key, alongside copyright/notes fields
    const cards = response?.data ?? [];
    await addScryfallKeywords(cards);
    return cards;
  } catch (error) {
    return null;
  }
};
