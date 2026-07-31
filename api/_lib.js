const crypto = require('crypto');

// Not a real secret — only guards against casual URL tampering, so it can live in code.
const LINK_SECRET = '0d43455cc1a4e915f3bc7161376355e2c9352b1d7bc04bbb';

function sign(chatId) {
  return crypto.createHmac('sha256', LINK_SECRET).update(String(chatId)).digest('hex').slice(0, 16);
}

function makeToken(chatId) {
  return `${chatId}.${sign(chatId)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [chatId, sig] = token.split('.');
  if (!chatId || !sig) return null;
  if (sig !== sign(chatId)) return null;
  return chatId;
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

async function sendMessage(chatId, text, replyMarkup) {
  const token = process.env.BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup, parse_mode: 'HTML' })
  });
}

module.exports = { makeToken, verifyToken, formatRuDateTime, sendMessage };
