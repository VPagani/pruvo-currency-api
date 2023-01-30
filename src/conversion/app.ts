import axios from 'axios';
import * as z from 'zod';

import env from '../env';
import queueSendMail from '../mailer/queue';
import queueCurrencyConversion from './queue';

const CACHE_TIMEOUT = 1000 * 60 * 60; // 1 hour

const CurrencyConversionRates = z.object({
  timestamp: z.number(),
  rates: z.record(z.number()),
});

type CurrencyConversionRates = z.infer<typeof CurrencyConversionRates>;

const currencyConversionCache: Record<string, CurrencyConversionRates> = {};

const getCurrencyConversionRateFromCache = (from: string, to: string): number | void => {
  const cacheFrom = currencyConversionCache[from];
  if (cacheFrom) {
    const now = Date.now();
    if (now - cacheFrom.timestamp > CACHE_TIMEOUT) {
      return;
    }

    return cacheFrom.rates[to];
  }

  const cacheTo = currencyConversionCache[to];
  if (cacheTo) {
    const now = Date.now();
    if (now - cacheTo.timestamp > CACHE_TIMEOUT) {
      return;
    }

    return 1 / cacheTo.rates[from];
  }
};

const getCurrencyConversionRates = async (from: string): Promise<CurrencyConversionRates> => {
  const response = await axios.get(`https://api.exchangeratesapi.io/latest`, {
    params: {
      [`app_id`]: env.OER_API_KEY,
      [`base`]: from,
      [`prettyprint`]: false,
      [`show_alternative`]: false,
    },
  });
  const currencyRates = CurrencyConversionRates.parse(response.data);

  return currencyRates;
};

const getCurrencyConversion = async (amount: number, from: string, to: string): Promise<number> => {
  const cachedRate = getCurrencyConversionRateFromCache(from, to);
  if (cachedRate) {
    return amount * cachedRate;
  }

  const currencyRates = await getCurrencyConversionRates(from);
  currencyConversionCache[from] = currencyRates;

  return amount * currencyRates.rates[to];
};

queueCurrencyConversion.onMessage(async (message) => {
  const { amount, baseCurrency, targetCurrency, email } = message;

  const convertedAmount = await getCurrencyConversion(amount, baseCurrency, targetCurrency);

  console.log(`Converted ${amount} ${baseCurrency} to ${convertedAmount} ${targetCurrency}`);

  queueSendMail.sendMessage({
    from: env.MAIL_SENDER,
    to: email,
    subject: `Currency Conversion`,
    text: `Converted ${amount} ${baseCurrency} to ${convertedAmount} ${targetCurrency}`,
  });
});
