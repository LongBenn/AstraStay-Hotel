const cassandraService = require('../services/cassandraService');

// Q9. Lấy thông tin chi tiết của một khách hàng theo ID (guests)
exports.getGuestProfile = async (req, res) => {
  try {
    const { guestId } = req.params;
    if (!guestId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã khách hàng (guestId)' });
    }
    const guest = await cassandraService.getGuestById(guestId);
    if (!guest) {
      return res.status(404).json({ success: false, message: `Không tìm thấy thông tin khách hàng với ID: ${guestId}` });
    }
    return res.json({ success: true, data: guest });
  } catch (error) {
    console.error('Error fetching guest profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Q9. Lấy danh sách toàn bộ khách hàng
exports.getAllGuests = async (req, res) => {
  try {
    const guests = await cassandraService.getAllGuests();
    return res.json({ success: true, data: guests, count: guests.length });
  } catch (error) {
    console.error('Error fetching all guests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
