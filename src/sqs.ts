import { Squiss, Message } from 'squiss-ts';
import { ZodSchema } from 'zod';
import env from './env';

export interface Queue<QueueMessage> {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendMessage: (message: QueueMessage) => Promise<void>;
  onMessage: (handler: (message: QueueMessage) => Promise<void>) => void;
}

export const createQueue = <QueueMessage>(
  name: string,
  messageSchema: ZodSchema<QueueMessage>
): Queue<QueueMessage> => {
  const squiss = new Squiss({
    awsConfig: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      endpoint: env.AWS_ENDPOINT,
    },
    queueName: `pruvo-currency-api:${name}`,
    bodyFormat: `json`,
    maxInFlight: 15,
  });

  return {
    start: async (): Promise<void> => {
      await squiss.start();
    },

    stop: async (): Promise<void> => {
      await squiss.stop();
    },

    sendMessage: async (message: QueueMessage): Promise<void> => {
      await squiss.sendMessage({
        body: messageSchema.parse(message),
      });
    },

    onMessage: (handler: (message: QueueMessage) => Promise<void>): void => {
      squiss.on(`message`, async (message: Message) => {
        await handler(messageSchema.parse(message.body));
        await message.del();
      });
    },
  };
};
