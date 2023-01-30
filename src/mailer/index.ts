import { onShutdown } from 'node-graceful-shutdown';

import queueSendMail from './queue';

queueSendMail.start();

onShutdown(async () => {
  await queueSendMail.stop();
  process.exit(0);
});
