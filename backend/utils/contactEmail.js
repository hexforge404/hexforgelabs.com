const formData = require('form-data');
const Mailgun = require('mailgun.js');

const cleanString = (value) => String(value || '').trim();

const escapeHtml = (value) =>
  cleanString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getContactRecipients = () =>
  (process.env.CONTACT_NOTIFY_TO || process.env.TO_EMAIL || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

const getMailgunClient = () => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    return null;
  }

  const mailgun = new Mailgun(formData);
  return mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net'
  });
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(value));

const buildContactNotificationEmail = (submission) => {
  const createdAt = submission.createdAt
    ? new Date(submission.createdAt).toISOString()
    : new Date().toISOString();
  const submissionId = submission._id?.toString?.() || String(submission.id || '');
  const fields = [
    ['Name', submission.name],
    ['Email', submission.email || 'Not provided'],
    ['Phone', submission.phone || 'Not provided'],
    ['Topic', submission.topic || 'Not provided'],
    ['Page source', submission.pageSource || 'general'],
    ['Created time', createdAt],
    ['Submission ID', submissionId]
  ];

  const text = [
    'New HexForge Labs contact form submission.',
    '',
    ...fields.map(([label, value]) => `${label}: ${cleanString(value)}`),
    '',
    'Message:',
    cleanString(submission.message)
  ].join('\n');

  const html = `
    <p><strong>New HexForge Labs contact form submission.</strong></p>
    <table cellpadding="6" cellspacing="0" border="0">
      ${fields
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`
        )
        .join('')}
    </table>
    <h3>Message</h3>
    <p>${escapeHtml(submission.message).replace(/\n/g, '<br>')}</p>
  `;

  return { text, html };
};

const sendContactNotificationEmail = async (submission) => {
  const recipients = getContactRecipients();
  const fromEmail = process.env.CONTACT_NOTIFY_FROM || process.env.MAILGUN_FROM_EMAIL;
  const client = getMailgunClient();

  if (!client || !fromEmail || recipients.length === 0) {
    console.warn('⚠️ Contact notification email skipped: Mailgun contact email config is incomplete.', {
      hasMailgunKey: Boolean(process.env.MAILGUN_API_KEY),
      hasMailgunDomain: Boolean(process.env.MAILGUN_DOMAIN),
      hasFromEmail: Boolean(fromEmail),
      recipientCount: recipients.length
    });
    return { sent: false, skipped: true };
  }

  const { text, html } = buildContactNotificationEmail(submission);
  const message = {
    from: `HexForge Labs <${fromEmail}>`,
    to: recipients,
    subject: `New HexForge Labs contact: ${submission.topic || 'Other'}`,
    text,
    html
  };

  if (isValidEmail(submission.email)) {
    message['h:Reply-To'] = submission.email;
  }

  await client.messages.create(process.env.MAILGUN_DOMAIN, message);

  return { sent: true, recipientCount: recipients.length };
};

module.exports = {
  buildContactNotificationEmail,
  sendContactNotificationEmail
};
