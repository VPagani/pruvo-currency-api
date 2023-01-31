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

/**
 * Cache of currency conversion rates.
 */
const currencyConversionCache: Record<string, CurrencyConversionRates> = {};

/**
 * Get the currency conversion rate from the cache.
 */
const getCurrencyConversionRateFromCache = (from: string, to: string): number | null => {
  const cacheFrom = currencyConversionCache[from];
  if (cacheFrom) {
    const now = Date.now();
    if (now - cacheFrom.timestamp > CACHE_TIMEOUT) {
      return null;
    }

    if (!(to in cacheFrom.rates)) {
      return null;
    }

    return cacheFrom.rates[to];
  }

  const cacheTo = currencyConversionCache[to];
  if (cacheTo) {
    const now = Date.now();
    if (now - cacheTo.timestamp > CACHE_TIMEOUT) {
      return null;
    }

    if (!(from in cacheTo.rates)) {
      return null;
    }

    return 1 / cacheTo.rates[from];
  }

  return null;
};

/**
 * Fetches the latest currency conversion rates from Open Exchange Rates
 * and simulate a long running task (for the sake of the assignment).
 */
const getCurrencyConversionRates = async (from: string): Promise<CurrencyConversionRates | null> => {
  try {
    const response = await axios.get(`https://openexchangerates.org/api/latest.json`, {
      params: {
        [`app_id`]: env.OXR_APP_ID,
        [`base`]: from,
        [`prettyprint`]: false,
        [`show_alternative`]: false,
      },
    });

    const result = CurrencyConversionRates.safeParse(response.data);
    if (!result.success) {
      console.error(`Invalid response from Open Exchange Rates`);
      console.error(`Response:`, response.data);
      console.error(`Issues:`, result.error.issues);
      return null;
    }

    result.data.timestamp *= 1000;

    // Simluate a long running task
    await new Promise((resolve) => setTimeout(resolve, 1000 * 10));

    return result.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(`Error fetching currency conversion rates from Open Exchange Rates:`, e.response?.data);
    }

    return null;
  }
};

/**
 * Converts an amount from one currency to another.
 *
 * If the conversion rate is not cached, it will be fetched from Open Exchange Rates
 * and cached for future use (for 1 hour).
 */
const getCurrencyConversion = async (amount: number, from: string, to: string): Promise<number | null> => {
  const cachedRate = getCurrencyConversionRateFromCache(from, to);
  if (cachedRate != null) {
    const convertedAmountCached = amount * cachedRate;
    console.log(`Converted ${amount} ${from} to ${convertedAmountCached} ${to} (cached rate ${cachedRate})`);
    return convertedAmountCached;
  }

  const currencyRates = await getCurrencyConversionRates(from);
  if (currencyRates == null) {
    return null;
  }

  currencyConversionCache[from] = currencyRates;
  if (!(to in currencyRates.rates)) {
    console.error(`Currency "${to}" not found in rates`);
    return null;
  }

  const convertedAmount = amount * currencyRates.rates[to];

  console.log(`Converted ${amount} ${from} to ${convertedAmount} ${to} (fetched rate ${convertedAmount})`);

  return convertedAmount;
};

/**
 * Process messages from the queue to convert currencies
 */
queueCurrencyConversion.onMessage(async (data) => {
  const { amount, baseCurrency, targetCurrency, email } = data;

  const convertedAmount = await getCurrencyConversion(amount, baseCurrency, targetCurrency);

  // If the conversion failed, send an email to the user
  if (convertedAmount == null) {
    await queueSendMail.sendMessage({
      from: env.MAIL_SENDER,
      to: email,
      subject: `Currency Conversion`,
      text: `Failed to convert ${amount} ${baseCurrency} to ${targetCurrency}`,
    });
    return;
  }

  // Otherwise, send an email to the user with the conversion result
  await queueSendMail.sendMessage({
    from: env.MAIL_SENDER,
    to: email,
    subject: `Currency Conversion`,
    text: `Converted ${amount} ${baseCurrency} to ${convertedAmount} ${targetCurrency}`,
  });
});

export const start = async (): Promise<void> => {
  await queueCurrencyConversion.start();
};

export const stop = async (): Promise<void> => {
  await queueCurrencyConversion.stop();
};
