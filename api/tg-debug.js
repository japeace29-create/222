module.exports = async (req, res) => {
  const hasToken = !!process.env.BOT_TOKEN;
  let username = null;
  let error = null;

  if (hasToken) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe`);
      const data = await resp.json();
      if (data.ok) {
        username = data.result.username;
      } else {
        error = data.description;
      }
    } catch (e) {
      error = String(e);
    }
  }

  res.status(200).json({ hasToken, username, error });
};
