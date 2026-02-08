import nodemailer from 'nodemailer';

interface EmailJobData {
  type: 'order_confirmation' | 'event_reminder' | 'event_started';
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function emailProcessor(data: EmailJobData): Promise<void> {
  console.log('Processing email job:', data.type);

  const { type, to, subject, data: templateData } = data;

  let html = '';

  switch (type) {
    case 'order_confirmation':
      html = `
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase.</p>
        <p><strong>Order ID:</strong> ${templateData.orderId}</p>
        <p><strong>Amount:</strong> $${templateData.amount}</p>
        <p><strong>Product:</strong> ${templateData.productName}</p>
      `;
      break;

    case 'event_reminder':
      html = `
        <h1>Event Starting Soon!</h1>
        <p>${templateData.eventTitle} is starting in ${templateData.minutesUntil} minutes.</p>
        <p><a href="${templateData.eventUrl}">Join the event</a></p>
      `;
      break;

    case 'event_started':
      html = `
        <h1>Event is Live!</h1>
        <p>${templateData.eventTitle} has started.</p>
        <p><a href="${templateData.eventUrl}">Watch now</a></p>
      `;
      break;
  }

  if (process.env.NODE_ENV === 'production') {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@shoppablewebinar.com',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } else {
    console.log(`[DEV] Would send email to ${to}:`, { subject, html });
  }
}
