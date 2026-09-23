const cassandraService = require('../services/cassandraService');

exports.getRoomsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status } = req.query;
    let rooms = await cassandraService.getRoomsByHotel(hotelId);
    if (status) {
      rooms = rooms.filter(r => r.status.toUpperCase() === status.toUpperCase());
    }
    return res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoomStatus = async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Phải là AVAILABLE, OCCUPIED, hoặc MAINTENANCE.'
      });
    }

    const updatedRoom = await cassandraService.updateRoomStatus(hotelId, roomNumber, status.toUpperCase());
    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái phòng ${roomNumber} thành ${status.toUpperCase()}`,
      data: updatedRoom
    });
  } catch (error) {
    console.error('Error updating room status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAmenitiesByRoom = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const amenities = await cassandraService.getAmenitiesByRoom(hotelId, roomId);
    return res.json({ success: true, data: amenities });
  } catch (error) {
    console.error('Error fetching room amenities:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BƯỚC 2 & 7: Tìm kiếm phòng kèm giá theo ngày và kiểm tra phòng trống
exports.searchRoomsWithPricing = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const checkIn = req.query.checkIn || req.query.check_in || req.query.checkin;
    const checkOut = req.query.checkOut || req.query.check_out || req.query.checkout;
    const minPrice = req.query.minPrice || req.query.min_price;
    const maxPrice = req.query.maxPrice || req.query.max_price;
    const minRating = req.query.minRating || req.query.min_rating;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ ngày nhận phòng (checkIn) và ngày trả phòng (checkOut).'
      });
    }

    const result = await cassandraService.searchAvailableRooms(hotelId, checkIn, checkOut, {
      minPrice,
      maxPrice,
      minRating
    });

    const roomList = Array.isArray(result) ? result : (result.rooms || []);

    return res.json({
      success: true,
      hotel_id: hotelId,
      check_in: checkIn,
      check_out: checkOut,
      nights: result.nights || 1,
      rooms: roomList,
      data: roomList
    });
  } catch (error) {
    console.error('Error searching rooms with pricing:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// BƯỚC 3 & 7: Xem danh sách review của phòng (mới nhất trước)
exports.getRoomReviews = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const reviews = await cassandraService.getRoomReviews(hotelId, roomId);
    return res.json({
      success: true,
      data: reviews,
      hotel_id: hotelId,
      room_id: roomId,
      total: reviews.length
    });
  } catch (error) {
    console.error('Error fetching room reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BƯỚC 4 & 7: Xem điểm đánh giá trung bình của phòng
exports.getRoomRating = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const rating = await cassandraService.getRoomRating(hotelId, roomId);
    return res.json({
      success: true,
      ...rating
    });
  } catch (error) {
    console.error('Error fetching room rating:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BƯỚC 6 & 7: Tạo đánh giá mới (Validation nghiêm ngặt)
exports.createRoomReview = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const { guest_id, confirm_number, rating, comment } = req.body;

    if (!guest_id || confirm_number === undefined || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: guest_id, confirm_number, rating, comment.'
      });
    }

    const result = await cassandraService.createRoomReview({
      hotel_id: hotelId,
      room_id: roomId,
      guest_id,
      confirm_number,
      rating,
      comment
    });

    return res.status(201).json({
      success: true,
      message: 'Đánh giá phòng thành công! Cảm ơn quý khách đã gửi nhận xét.',
      data: result
    });
  } catch (error) {
    console.error('Error creating room review:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// BƯỚC 5: Lấy danh sách phòng theo rating cao
exports.getTopRatedRooms = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const minRating = req.query.minRating || 4.0;
    const rooms = await cassandraService.getTopRatedRooms(hotelId, minRating);
    return res.json({
      success: true,
      hotel_id: hotelId,
      min_rating: parseFloat(minRating),
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching top rated rooms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BƯỚC BỔ SUNG: Lấy danh sách đánh giá nổi bật (Featured Reviews)
exports.getFeaturedReviews = async (req, res) => {
  try {
    const hotelId = req.query.hotelId || req.query.hotel_id || null;
    const reviews = await cassandraService.getFeaturedReviews(hotelId);
    return res.json({
      success: true,
      total: reviews.length,
      hotel_id: hotelId,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// BƯỚC BỔ SUNG: Đánh dấu đánh giá hữu ích (Thả tim)
exports.markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const result = await cassandraService.markReviewHelpful(reviewId);
    return res.json({
      success: true,
      message: 'Cảm ơn bạn đã bình chọn nhận xét hữu ích!',
      data: result
    });
  } catch (error) {
    console.error('Error marking review helpful:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

