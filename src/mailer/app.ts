import queueSendMail from './queue';

/**
 * Dummy async function to simulate sending an email
 */
const sendMail = async (from: string, to: string, subject: string, text: string): Promise<void> => {
  console.log(`Send mail to ${to} from ${from} with subject ${subject} and text ${text}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
};

/**
 * Process messages from the queue to send emails
 */
queueSendMail.onMessage(async (data) => {
  await sendMail(data.from, data.to, data.subject, data.text);
});
