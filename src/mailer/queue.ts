import * as z from 'zod';
import { createQueue } from '../sqs';

const queueSendMail = createQueue(
  `send-mail`,
  z.object({
    from: z.string().email(),
    to: z.string().email(),
    subject: z.string(),
    text: z.string(),
  })
);

export default queueSendMail;
