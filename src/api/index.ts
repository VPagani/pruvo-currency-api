import { onShutdown } from 'node-graceful-shutdown';

import { start, stop } from './app';

start();

onShutdown(async () => {
  await stop();
  process.exit(0);
});
