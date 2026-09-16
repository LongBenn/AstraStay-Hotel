const cassandraService = require('../services/cassandraService');

exports.createBooking = async (req, res) => {
  try {
    const {
      guest_id,
      guest_name,
      hotel_id,
      hotel_name,
      room_number,
      room_id,
      check_in_date,
      check_out_date,
      price_per_night,
      nights
    } = req.body;

    if (!hotel_id || !room_number || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: hotel_id, room_number, check_in_date, check_out_date'
      });
    }

    const assignedGuestId = guest_id || `GUEST-${Date.now().toString().slice(-4)}`;
    const assignedGuestName = guest_name || 'Khách Vãng Lai';

    const result = await cassandraService.createBooking({
      guest_id: assignedGuestId,
      guest_name: assignedGuestName,
      hotel_id,
      hotel_name: hotel_name || 'Khách sạn liên kết',
      room_number,
      room_id,
      check_in_date,
      check_out_date,
      price_per_night: parseFloat(price_per_night) || 1000000,
      nights: parseInt(nights, 10) || 1
    });

    return res.status(201).json({
      success: true,
      message: 'Đặt phòng thành công! Dữ liệu đã được đồng bộ qua Cassandra LOGGED BATCH vào cả hai bảng.',
      data: result
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingsByGuest = async (req, res) => {
  try {
    const { guestId } = req.params;
    const bookings = await cassandraService.getBookingsByGuest(guestId);
    return res.json({ success: true, data: bookings, guest_id: guestId });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingsByHotelDate = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { start_date, end_date } = req.query;
    const bookings = await cassandraService.getBookingsByHotelDate(hotelId, start_date, end_date);
    return res.json({
      success: true,
      data: bookings,
      hotel_id: hotelId,
      filter: { start_date, end_date }
    });
  } catch (error) {
    console.error('Error fetching hotel date bookings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await cassandraService.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đặt phòng với mã này' });
    }
    const invoice = await cassandraService.getInvoiceByBooking(bookingId);
    return res.json({ success: true, data: { ...booking, invoice } });
  } catch (error) {
    console.error('Error getting booking detail:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await cassandraService.cancelBooking(bookingId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getRecentBookings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;
    const bookings = await cassandraService.getRecentBookings(limit);
    return res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
