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
      nights,
      payment_status,
      order_status,
      order_code,
      demo_mode
    } = req.body;

    if (!hotel_id || !room_number || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: hotel_id, room_number, check_in_date, check_out_date'
      });
    }

    const assignedGuestId = guest_id || `GUEST-${Date.now().toString().slice(-4)}`;
    const assignedGuestName = guest_name || 'Khách Vãng Lai';
    const normalizedPaymentStatus = payment_status === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : 'PAID';
    const normalizedOrderStatus = order_status || (normalizedPaymentStatus === 'PENDING_PAYMENT' ? 'Chờ xác nhận thanh toán' : 'CONFIRMED');

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
      nights: parseInt(nights, 10) || 1,
      payment_status: normalizedPaymentStatus,
      order_status: normalizedOrderStatus,
      order_code: order_code || `ASTRA-${Date.now()}`,
      demo_mode: Boolean(demo_mode)
    });

    return res.status(201).json({
      success: true,
      message: normalizedPaymentStatus === 'PENDING_PAYMENT'
        ? 'Đã ghi nhận yêu cầu thanh toán. Vui lòng chờ xác nhận.'
        : 'Đặt phòng thành công! Dữ liệu đã được đồng bộ qua Cassandra LOGGED BATCH vào cả hai bảng.',
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

// Q6. Tra cứu theo mã xác nhận số (confirm_number)
exports.getBookingByConfirmation = async (req, res) => {
  try {
    const { confirmNumber } = req.params;
    const reservation = await cassandraService.getReservationByConfirmNumber(confirmNumber);
    if (!reservation) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn đặt phòng với mã xác nhận: ${confirmNumber}` });
    }
    return res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Error getting reservation by confirmation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Q8. Tra cứu theo Họ khách hàng (guest_last_name)
exports.getBookingsByGuestLastName = async (req, res) => {
  try {
    const { lastName, hotelId } = req.query;
    if (!lastName) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tham số lastName (Họ của khách, ví dụ: lastName=Nguyễn)' });
    }
    const reservations = await cassandraService.getReservationsByGuestLastName(lastName, hotelId);
    return res.json({
      success: true,
      data: reservations,
      count: reservations.length,
      query: { lastName, hotelId: hotelId || 'Tất cả' }
    });
  } catch (error) {
    console.error('Error fetching reservations by guest last name:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
