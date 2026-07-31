function initHeartsBg() {
  const bg = document.createElement('div');
  bg.className = 'hearts-bg';
  document.body.prepend(bg);

  const symbols = ['❤️', '💗', '💕', '💖'];
  const count = 16;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = 14 + Math.random() * 18 + 'px';
    el.style.animationDuration = 9 + Math.random() * 10 + 's';
    el.style.animationDelay = -(Math.random() * 15) + 's';
    bg.appendChild(el);
  }
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

document.addEventListener('DOMContentLoaded', initHeartsBg);
