import { Squiss, Message, IMessageToSend } from 'squiss-ts';
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
    queueName: `pruvo-currency-${name}`,
    bodyFormat: `json`,
    maxInFlight: 15,
  });

  return {
    start: async (): Promise<void> => {
      await squiss.createQueue();
      await squiss.start();
    },

    stop: async (): Promise<void> => {
      await squiss.stop();
    },

    sendMessage: async (message: QueueMessage): Promise<void> => {
      const result = messageSchema.safeParse(message);
      if (!result.success) {
        console.error(`Invalid message sent to queue "${name}":`, result.error.issues);
        return;
      }

      await squiss.sendMessage(result.data as IMessageToSend);
    },

    onMessage: (handler: (data: QueueMessage) => Promise<void>): void => {
      squiss.on(`message`, async (message: Message) => {
        const result = messageSchema.safeParse(message.body);
        if (!result.success) {
          console.error(`Invalid message received in queue "${name}":`, result.error.issues);
          await message.del();
          return;
        }

        await handler(result.data);
        await message.del();
      });
    },
  };
};
