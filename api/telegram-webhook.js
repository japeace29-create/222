const {
  makeToken, sendTelegramMessage, incrCounter, getStats, kvReady,
  setPendingName, getPendingName, clearPendingName
} = require('./_lib');

function buildLink(siteUrl, platform, id, gender, name) {
  let link = `${siteUrl}/invite.html?u=${makeToken(platform, id)}&g=${gender}`;
  if (name) link += `&n=${encodeURIComponent(name)}`;
  return link;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body || {};
  const siteUrl = `https://${req.headers.host}`;

  try {
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      await clearPendingName('t', chatId);
      await sendTelegramMessage(
        chatId,
        'Привет! 💌\n\nЭто бот для создания романтичного сайта-приглашения на свидание.\n\nДля кого создаём приглашение?',
        { inline_keyboard: [[
          { text: '👩 Любимой', callback_data: 'gender_f' },
          { text: '🧑 Любимому', callback_data: 'gender_m' }
        ], [
          { text: '✏️ Свой вариант', callback_data: 'custom' }
        ]] }
      );
    } else if (update.message && update.message.text === '/stats') {
      const chatId = update.message.chat.id;
      if (!kvReady()) {
        await sendTelegramMessage(chatId, 'Счётчик статистики ещё не подключён (нужен Vercel KV).');
      } else {
        const { linksCreated, completed } = await getStats();
        await sendTelegramMessage(
          chatId,
          `📊 Статистика\n\nСоздано ссылок: ${linksCreated ?? 0}\nОтветили на приглашение: ${completed ?? 0}`
        );
      }
    } else if (update.callback_query && (update.callback_query.data === 'gender_f' || update.callback_query.data === 'gender_m')) {
      const chatId = update.callback_query.message.chat.id;
      const gender = update.callback_query.data === 'gender_m' ? 'm' : 'f';
      const link = buildLink(siteUrl, 't', chatId, gender, null);
      await incrCounter('links_created');
      await sendTelegramMessage(chatId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id })
      });
    } else if (update.callback_query && update.callback_query.data === 'custom') {
      const chatId = update.callback_query.message.chat.id;
      await setPendingName('t', chatId, 'x');
      await sendTelegramMessage(chatId, 'Напиши свой вариант обращения (например: «Зайка,» или «Катюша,») — он появится на сайте вместо «Моя любимая,».');
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id })
      });
    } else if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const pending = await getPendingName('t', chatId);
      if (pending) {
        const name = update.message.text.trim().slice(0, 40);
        await clearPendingName('t', chatId);
        const link = buildLink(siteUrl, 't', chatId, pending, name);
        await incrCounter('links_created');
        await sendTelegramMessage(chatId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      }
    }
  } catch (e) {
    // swallow errors so Telegram doesn't retry-storm us
  }

  res.status(200).json({ ok: true });
};
