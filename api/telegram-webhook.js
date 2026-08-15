const {
  makeToken, sendTelegramMessage, incrCounter, getStats, kvReady,
  setPendingState, getPendingState, clearPendingState
} = require('./_lib');

function buildLink(siteUrl, platform, id, state) {
  let link = `${siteUrl}/invite.html?u=${makeToken(platform, id)}&g=${state.gender}`;
  if (state.name) link += `&n=${encodeURIComponent(state.name)}`;
  if (state.extras && state.extras.length) link += `&e=${encodeURIComponent(state.extras.join(','))}`;
  return link;
}

async function sendFinalLink(chatId, siteUrl, state) {
  await clearPendingState('t', chatId);
  const link = buildLink(siteUrl, 't', chatId, state);
  await incrCounter('links_created');
  await sendTelegramMessage(chatId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
}

async function askExtras(chatId, state) {
  await setPendingState('t', chatId, { ...state, stage: 'extras_choice' });
  await sendTelegramMessage(
    chatId,
    'Добавить на сайт блок «Дополнительно» (например: кальян, ресторан, баня, массаж)?',
    { inline_keyboard: [[
      { text: 'Да', callback_data: 'extras_yes' },
      { text: 'Нет', callback_data: 'extras_no' }
    ]] }
  );
}

async function answerCallback(id) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id })
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const update = req.body || {};
  const siteUrl = `https://${req.headers.host}`;

  try {
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;
      await clearPendingState('t', chatId);
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
      await askExtras(chatId, { gender });
      await answerCallback(update.callback_query.id);
    } else if (update.callback_query && update.callback_query.data === 'custom') {
      const chatId = update.callback_query.message.chat.id;
      await setPendingState('t', chatId, { gender: 'x', stage: 'name' });
      await sendTelegramMessage(chatId, 'Напиши свой вариант обращения (например: «Зайка,» или «Катюша,») — он появится на сайте вместо «Моя любимая,».');
      await answerCallback(update.callback_query.id);
    } else if (update.callback_query && (update.callback_query.data === 'extras_yes' || update.callback_query.data === 'extras_no')) {
      const chatId = update.callback_query.message.chat.id;
      const state = (await getPendingState('t', chatId)) || { gender: 'f' };
      if (update.callback_query.data === 'extras_yes') {
        await setPendingState('t', chatId, { ...state, stage: 'extras_text' });
        await sendTelegramMessage(chatId, 'Напиши варианты через запятую (например: кальян, ресторан, баня, массаж).');
      } else {
        await sendFinalLink(chatId, siteUrl, state);
      }
      await answerCallback(update.callback_query.id);
    } else if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const state = await getPendingState('t', chatId);
      if (state && state.stage === 'name') {
        const name = update.message.text.trim().slice(0, 40);
        await askExtras(chatId, { gender: state.gender, name });
      } else if (state && state.stage === 'extras_text') {
        const extras = update.message.text.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
        await sendFinalLink(chatId, siteUrl, { ...state, extras });
      }
    }
  } catch (e) {
    // swallow errors so Telegram doesn't retry-storm us
  }

  res.status(200).json({ ok: true });
};
