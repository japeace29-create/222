const { verifyToken, formatRuDateTime, notifyUser } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { u, date, time, food } = req.body || {};
  const parsed = verifyToken(u);
  if (!parsed) return res.status(400).json({ error: 'invalid token' });

  const text =
    'Она ответила на свидание! 💌\n\n' +
    `📅 ${formatRuDateTime(date, time)}\n` +
    `🍽️ ${(food || []).join(', ') || 'не выбрано'}`;

  try {
    await notifyUser(parsed.platform, parsed.id, text);
  } catch (e) {
    return res.status(502).json({ error: 'send failed' });
  }

  res.status(200).json({ ok: true });
};
