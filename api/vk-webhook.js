const {
  makeToken, sendVkMessage, incrCounter, getStats, kvReady,
  setPendingState, getPendingState, clearPendingState
} = require('./_lib');

const GENDER_KEYBOARD = {
  one_time: true,
  buttons: [[
    { action: { type: 'text', label: '👩 Любимой', payload: JSON.stringify({ cmd: 'gender', g: 'f' }) }, color: 'primary' },
    { action: { type: 'text', label: '🧑 Любимому', payload: JSON.stringify({ cmd: 'gender', g: 'm' }) }, color: 'primary' }
  ], [
    { action: { type: 'text', label: '✏️ Свой вариант', payload: JSON.stringify({ cmd: 'custom' }) }, color: 'secondary' }
  ]]
};

const EXTRAS_KEYBOARD = {
  one_time: true,
  buttons: [[
    { action: { type: 'text', label: 'Да', payload: JSON.stringify({ cmd: 'extras', v: 'yes' }) }, color: 'positive' },
    { action: { type: 'text', label: 'Нет', payload: JSON.stringify({ cmd: 'extras', v: 'no' }) }, color: 'negative' }
  ]]
};

function buildLink(siteUrl, platform, id, state) {
  let link = `${siteUrl}/invite.html?u=${makeToken(platform, id)}&g=${state.gender}`;
  if (state.name) link += `&n=${encodeURIComponent(state.name)}`;
  if (state.extras && state.extras.length) link += `&e=${encodeURIComponent(state.extras.join(','))}`;
  return link;
}

async function sendFinalLink(userId, siteUrl, state) {
  await clearPendingState('v', userId);
  const link = buildLink(siteUrl, 'v', userId, state);
  await incrCounter('links_created');
  await sendVkMessage(userId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
}

async function askExtras(userId, state) {
  await setPendingState('v', userId, { ...state, stage: 'extras_choice' });
  await sendVkMessage(userId, 'Добавить на сайт блок «Дополнительно» (например: кальян, ресторан, баня, массаж)?', EXTRAS_KEYBOARD);
}

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
      const text = (message.text || '').trim();
      const lower = text.toLowerCase();

      let payload = null;
      try { payload = message.payload ? JSON.parse(message.payload) : null; } catch (e) {}

      const state = await getPendingState('v', userId);

      if (payload && payload.cmd === 'gender' && (payload.g === 'f' || payload.g === 'm')) {
        await askExtras(userId, { gender: payload.g });
      } else if (payload && payload.cmd === 'custom') {
        await setPendingState('v', userId, { gender: 'x', stage: 'name' });
        await sendVkMessage(userId, 'Напиши свой вариант обращения (например: «Зайка,» или «Катюша,») — он появится на сайте вместо «Моя любимая,».');
      } else if (payload && payload.cmd === 'extras' && state && state.stage === 'extras_choice') {
        if (payload.v === 'yes') {
          await setPendingState('v', userId, { ...state, stage: 'extras_text' });
          await sendVkMessage(userId, 'Напиши варианты через запятую (например: кальян, ресторан, баня, массаж).');
        } else {
          await sendFinalLink(userId, siteUrl, state);
        }
      } else if (lower === 'статистика' || lower === '/stats') {
        if (!kvReady()) {
          await sendVkMessage(userId, 'Счётчик статистики ещё не подключён (нужен Vercel KV).');
        } else {
          const { linksCreated, completed } = await getStats();
          await sendVkMessage(userId, `📊 Статистика\n\nСоздано ссылок: ${linksCreated ?? 0}\nОтветили на приглашение: ${completed ?? 0}`);
        }
      } else if (state && state.stage === 'name' && text) {
        const name = text.slice(0, 40);
        await askExtras(userId, { gender: state.gender, name });
      } else if (state && state.stage === 'extras_text' && text) {
        const extras = text.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
        await sendFinalLink(userId, siteUrl, { ...state, extras });
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
