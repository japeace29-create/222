const { makeToken, sendVkMessage } = require('./_lib');

const KEYBOARD = {
  one_time: false,
  buttons: [[
    { action: { type: 'text', label: '💌 Создать ссылку', payload: JSON.stringify({ cmd: 'create_link' }) }, color: 'primary' }
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

      if (payload && payload.cmd === 'create_link') {
        const link = `${siteUrl}/?u=${makeToken('v', userId)}`;
        await sendVkMessage(userId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      } else {
        await sendVkMessage(
          userId,
          'Привет! 💌\n\nЭто бот для создания романтичного сайта-приглашения на свидание.\n\nНажми кнопку ниже — получишь уникальную ссылку. Отправь её тому, кого хочешь пригласить. Как только он(а) заполнит форму на сайте, я сразу пришлю тебе ответ сюда.',
          KEYBOARD
        );
      }
    }
  } catch (e) {
    // swallow errors so VK doesn't retry-storm us
  }

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('ok');
};
