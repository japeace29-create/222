const { makeToken, sendMessage } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body || {};
  const siteUrl = `https://${req.headers.host}`;

  try {
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      await sendMessage(
        chatId,
        'Привет! 💌\n\nЭто бот для создания романтичного сайта-приглашения на свидание.\n\nНажми кнопку ниже — получишь уникальную ссылку. Отправь её тому, кого хочешь пригласить. Как только он(а) заполнит форму на сайте, я сразу пришлю тебе ответ сюда.',
        { inline_keyboard: [[{ text: '💌 Создать ссылку', callback_data: 'create_link' }]] }
      );
    } else if (update.callback_query && update.callback_query.data === 'create_link') {
      const chatId = update.callback_query.message.chat.id;
      const link = `${siteUrl}/?u=${makeToken(chatId)}`;
      await sendMessage(chatId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id })
      });
    }
  } catch (e) {
    // swallow errors so Telegram doesn't retry-storm us
  }

  res.status(200).json({ ok: true });
};
