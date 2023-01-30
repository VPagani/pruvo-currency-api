import * as z from 'zod';
import { createQueue } from '../sqs';

const queueCurrencyConversion = createQueue(
  `currency-conversion`,
  z.object({
    amount: z.number(),
    baseCurrency: z.string(),
    targetCurrency: z.string(),
    email: z.string().email(),
  })
);

export default queueCurrencyConversion;
