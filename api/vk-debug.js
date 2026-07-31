module.exports = async (req, res) => {
  const hasToken = !!process.env.VK_TOKEN;
  let groupInfo = null;
  let error = null;

  if (hasToken) {
    try {
      const params = new URLSearchParams({ access_token: process.env.VK_TOKEN, v: '5.199' });
      const resp = await fetch(`https://api.vk.com/method/groups.getById?${params}`);
      const data = await resp.json();
      if (data.error) {
        error = `${data.error.error_code}: ${data.error.error_msg}`;
      } else {
        groupInfo = data.response.groups ? data.response.groups[0] : data.response[0];
      }
    } catch (e) {
      error = String(e);
    }
  }

  res.status(200).json({
    hasToken,
    hasConfirmation: !!process.env.VK_CONFIRMATION,
    group: groupInfo ? { id: groupInfo.id, name: groupInfo.name } : null,
    error
  });
};
