module.exports = async (req, res) => {
  if (!process.env.BOT_TOKEN) {
    return res.status(200).json({ ok: false, error: 'BOT_TOKEN not set' });
  }

  const resp = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: '💌 Создать приглашение на свидание' }
      ]
    })
  });
  const data = await resp.json();
  res.status(200).json(data);
};
