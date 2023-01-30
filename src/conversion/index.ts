import { onShutdown } from 'node-graceful-shutdown';

import queueCurrencyConversion from './queue';

queueCurrencyConversion.start();

onShutdown(async () => {
  await queueCurrencyConversion.stop();
  process.exit(0);
});
