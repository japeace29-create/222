const {
  makeToken, sendVkMessage, incrCounter, getStats, kvReady,
  setPendingName, getPendingName, clearPendingName
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

function buildLink(siteUrl, platform, id, gender, name) {
  let link = `${siteUrl}/invite.html?u=${makeToken(platform, id)}&g=${gender}`;
  if (name) link += `&n=${encodeURIComponent(name)}`;
  return link;
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

      const pending = await getPendingName('v', userId);

      if (payload && payload.cmd === 'gender' && (payload.g === 'f' || payload.g === 'm')) {
        const link = buildLink(siteUrl, 'v', userId, payload.g, null);
        await incrCounter('links_created');
        await sendVkMessage(userId, `Твоя уникальная ссылка готова 💌\n\n${link}\n\nОтправь её и жди ответа — я пришлю его прямо сюда.`);
      } else if (payload && payload.cmd === 'custom') {
        await setPendingName('v', userId, 'x');
        await sendVkMessage(userId, 'Напиши свой вариант обращения (например: «Зайка,» или «Катюша,») — он появится на сайте вместо «Моя любимая,».');
      } else if (lower === 'статистика' || lower === '/stats') {
        if (!kvReady()) {
          await sendVkMessage(userId, 'Счётчик статистики ещё не подключён (нужен Vercel KV).');
        } else {
          const { linksCreated, completed } = await getStats();
          await sendVkMessage(userId, `📊 Статистика\n\nСоздано ссылок: ${linksCreated ?? 0}\nОтветили на приглашение: ${completed ?? 0}`);
        }
      } else if (pending && text) {
        const name = text.slice(0, 40);
        await clearPendingName('v', userId);
        const link = buildLink(siteUrl, 'v', userId, pending, name);
        await incrCounter('links_created');
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
