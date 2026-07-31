const { verifyToken, formatRuDateTime, sendMessage } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { u, date, time, food } = req.body || {};
  const chatId = verifyToken(u);
  if (!chatId) return res.status(400).json({ error: 'invalid token' });

  const text =
    'Она ответила на свидание! 💌\n\n' +
    `📅 ${formatRuDateTime(date, time)}\n` +
    `🍽️ ${(food || []).join(', ') || 'не выбрано'}`;

  try {
    await sendMessage(chatId, text);
  } catch (e) {
    return res.status(502).json({ error: 'telegram send failed' });
  }

  res.status(200).json({ ok: true });
};
