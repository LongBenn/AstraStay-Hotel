const cassandraService = require('../services/cassandraService');

exports.getInvoiceByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const invoice = await cassandraService.getInvoiceByBooking(bookingId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hoá đơn cho mã đặt phòng này' });
    }
    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
