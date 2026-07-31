const { makeToken, sendTelegramMessage } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body || {};
  const siteUrl = `https://${req.headers.host}`;

  try {
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      await sendTelegramMessage(
        chatId,
        'Привет! 💌\n\nЭто бот для создания романтичного сайта-приглашения на свидание.\n\nДля кого создаём приглашение?',
        { inline_keyboard: [[
          { text: '👩 Любимой', callback_data: 'gender_f' },
          { text: '🧑 Любимому', callback_data: 'gender_m' }
        ]] }
      );
    } else if (update.callback_query && (update.callback_query.data === 'gender_f' || update.callback_query.data === 'gender_m')) {
      const chatId = update.callback_query.message.chat.id;
      const gender = update.callback_query.data === 'gender_m' ? 'm' : 'f';
      const link = `${siteUrl}/invite.html?u=${makeToken('t', chatId)}&g=${gender}`;
      await sendTelegramMessage(chatId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
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
