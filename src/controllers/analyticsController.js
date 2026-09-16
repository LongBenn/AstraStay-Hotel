const cassandraService = require('../services/cassandraService');
const { getCqlHistory, getConnectionStatus } = require('../config/cassandra');

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await cassandraService.getDashboardStats();
    const systemStatus = getConnectionStatus();
    return res.json({
      success: true,
      data: stats,
      systemStatus
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCqlHistory = (req, res) => {
  try {
    const history = getCqlHistory();
    const systemStatus = getConnectionStatus();
    return res.json({
      success: true,
      data: history,
      systemStatus
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSystemStatus = (req, res) => {
  return res.json({
    success: true,
    data: getConnectionStatus()
  });
};
