const { makeToken, sendVkMessage } = require('./_lib');

const GENDER_KEYBOARD = {
  one_time: true,
  buttons: [[
    { action: { type: 'text', label: '👩 Любимой', payload: JSON.stringify({ cmd: 'gender', g: 'f' }) }, color: 'primary' },
    { action: { type: 'text', label: '🧑 Любимому', payload: JSON.stringify({ cmd: 'gender', g: 'm' }) }, color: 'primary' }
  ]]
};

module.exports = async (req, res) => {
  const body = req.body || {};

  if (body.type === 'confirmation') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(process.env.VK_CONFIRMATION || '');
  }

  if (process.env.VK_SECRET && body.secret !== process.env.VK_SECRET) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('ok');
  }

  try {
    if (body.type === 'message_new') {
      const message = body.object.message;
      const userId = message.from_id;
      const siteUrl = `https://${req.headers.host}`;

      let payload = null;
      try { payload = message.payload ? JSON.parse(message.payload) : null; } catch (e) {}

      if (payload && payload.cmd === 'gender' && (payload.g === 'f' || payload.g === 'm')) {
        const link = `${siteUrl}/?u=${makeToken('v', userId)}&g=${payload.g}`;
        await sendVkMessage(userId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      } else {
        await sendVkMessage(
          userId,
          'Привет! 💌\n\nЭто бот для создания романтичного сайта-приглашения на свидание.\n\nДля кого создаём приглашение?',
          GENDER_KEYBOARD
        );
      }
    }
  } catch (e) {
    // swallow errors so VK doesn't retry-storm us
  }

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('ok');
};
