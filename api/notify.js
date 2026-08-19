const { verifyToken, formatRuDateTime, notifyUser, incrCounter } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { u, date, time, food, extras, gender } = req.body || {};
  const parsed = verifyToken(u);
  if (!parsed) return res.status(400).json({ error: 'invalid token' });

  const heading = gender === 'm'
    ? 'Он ответил на свидание! 💌'
    : gender === 'x'
      ? 'Получен ответ на свидание! 💌'
      : 'Она ответила на свидание! 💌';

  let text =
    heading + '\n\n' +
    `📅 ${formatRuDateTime(date, time)}\n` +
    `🍽️ ${(food || []).join(', ') || 'не выбрано'}`;

  if (extras && extras.length) {
    text += `\n✨ ${extras.join(', ')}`;
  }

  const followUp =
    'Хорошего свидания! 🥂\n\n' +
    'Подписывайся на наш паблик — там идеи для свиданий и обновления бота:\n' +
    'https://vk.com/club240596184';

  try {
    await notifyUser(parsed.platform, parsed.id, text);
    await incrCounter('completed');
  } catch (e) {
    return res.status(502).json({ error: 'send failed' });
  }

  // Sent separately so a failure here never breaks the main notification.
  try {
    await notifyUser(parsed.platform, parsed.id, followUp);
  } catch (e) {}

  res.status(200).json({ ok: true });
};
