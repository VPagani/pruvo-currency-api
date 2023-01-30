import * as z from 'zod';
import { parseEnv } from 'znv';

const env = parseEnv(process.env, {
  NODE_ENV: z.enum([`development`, `production`, `test`]).default(`development`),
  PORT: z.number({ coerce: true }).default(3000),

  MAIL_SENDER: z.string().default(`no-reply@home.local`),

  OER_API_KEY: z.string(),

  AWS_ACCESS_KEY_ID: z.string().default(`dummy`),
  AWS_SECRET_ACCESS_KEY: z.string().default(`dummy`),
  AWS_REGION: z.string().default(`dummy`),
  AWS_ENDPOINT: z.string().default(`http://localhost:9324`),
});

export default env;
