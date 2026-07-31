const { getStats, kvReady } = require('./_lib');

module.exports = async (req, res) => {
  if (!kvReady()) {
    return res.status(200).json({ kvReady: false, linksCreated: null, completed: null });
  }
  const { linksCreated, completed } = await getStats();
  res.status(200).json({ kvReady: true, linksCreated, completed });
};
