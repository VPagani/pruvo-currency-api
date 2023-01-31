import * as z from 'zod';
import fastify from 'fastify';

import env from '../env';
import queueCurrencyConversion from '../conversion/queue';

const app = fastify({ logger: true });
export default app;

const toUppercase = (value: string): string => value.toUpperCase();

const schemaCurrencyConversionBody = z.object({
  amount: z.number(),
  baseCurrency: z.string().transform(toUppercase),
  targetCurrency: z.string().transform(toUppercase),
  email: z.string().email(),
});

app.post(`/conversion`, async (request, reply) => {
  // validate request body
  const body = schemaCurrencyConversionBody.safeParse(request.body);
  if (!body.success) {
    return reply.code(400).send({ ok: false, issues: body.error.issues });
  }

  const { amount, baseCurrency, targetCurrency, email } = body.data;

  // add currency conversion to queue
  await queueCurrencyConversion.sendMessage({
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
