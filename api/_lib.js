const crypto = require('crypto');

// Not a real secret — only guards against casual URL tampering, so it can live in code.
const LINK_SECRET = '0d43455cc1a4e915f3bc7161376355e2c9352b1d7bc04bbb';

function sign(platform, id) {
  return crypto.createHmac('sha256', LINK_SECRET).update(`${platform}:${id}`).digest('hex').slice(0, 16);
}

// platform: 't' (Telegram) or 'v' (VK)
function makeToken(platform, id) {
  return `${platform}${id}.${sign(platform, id)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [head, sig] = token.split('.');
  if (!head || !sig) return null;

  // legacy tokens issued before multi-platform support: plain "<chatId>.<sig>" == Telegram
  const legacy = /^\d+$/.test(head);
  const platform = legacy ? 't' : head[0];
  const id = legacy ? head : head.slice(1);
  if (!id) return null;

  const expected = legacy ? sign('t', id) : sign(platform, id);
  if (sig !== expected) return null;

  return { platform, id };
}

const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function formatRuDateTime(dateStr, time) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = RU_WEEKDAYS[dateObj.getDay()];
  const month = RU_MONTHS[dateObj.getMonth()];
  let result = `${weekday}, ${d} ${month} ${y} г.`;
  if (time) result += ` в ${time}`;
  return result;
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const token = process.env.BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup })
  });
}

async function sendVkMessage(userId, text, keyboard) {
  const token = process.env.VK_TOKEN;
  const params = new URLSearchParams({
    access_token: token,
    v: '5.199',
    peer_id: String(userId),
    message: text,
    random_id: String(Math.floor(Math.random() * 2 ** 31))
  });
  if (keyboard) params.set('keyboard', JSON.stringify(keyboard));
  await fetch('https://api.vk.com/method/messages.send', { method: 'POST', body: params });
}

// Unified sender used by /api/notify — picks the right platform.
async function notifyUser(platform, id, text) {
  if (platform === 'v') return sendVkMessage(id, text);
  return sendTelegramMessage(id, text);
}

module.exports = { makeToken, verifyToken, formatRuDateTime, sendTelegramMessage, sendVkMessage, notifyUser };
