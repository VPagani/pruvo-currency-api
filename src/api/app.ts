import * as z from 'zod';
import fastify from 'fastify';

import env from '../env';
import queueCurrencyConversion from '../conversion/queue';

const app = fastify({ logger: true });
export default app;

const schemaCurrencyConversionBody = z.object({
  amount: z.number(),
  baseCurrency: z.string(),
  targetCurrency: z.string(),
  email: z.string().email(),
});

app.post(`/conversion`, async (request, reply) => {
  // validate request body
  const { amount, baseCurrency, targetCurrency, email } = schemaCurrencyConversionBody.parse(request.body);

  // add currency conversion to queue
  queueCurrencyConversion.sendMessage({
    amount,
    baseCurrency,
    targetCurrency,
    email,
  });

  return reply.code(200).send({ ok: true });
});

export const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT });

    app.log.info(`server listening on ${app.server.address()}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

export const stop = async (): Promise<void> => {
  await app.close();
};
