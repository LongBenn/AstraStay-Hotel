const cassandraService = require('../services/cassandraService');

/**
 * Controller xử lý toàn bộ logic cho Module Đánh Giá Khách Sạn (Hotel Reviews & Ratings)
 */

// 1. Lấy danh sách đánh giá của khách sạn (Lọc sao, sắp xếp, phân trang)
exports.getHotelReviews = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { star, sort, page, limit } = req.query;

    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã khách sạn (hotelId).' });
    }

    const result = await cassandraService.getHotelReviews(hotelId, {
      star,
      sort,
      page,
      limit,
      status: 'ACTIVE' // Khách công khai chỉ thấy review ACTIVE
    });

    return res.json({
      success: true,
      summary: result.stats,
      ...result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đánh giá khách sạn:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Lấy thống kê rating và phân bố 1 - 5 sao của khách sạn
exports.getHotelReviewStats = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã khách sạn (hotelId).' });
    }

    const stats = cassandraService.getHotelRatingStats(hotelId);
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê đánh giá khách sạn:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Kiểm tra user có quyền đánh giá booking hay không
exports.checkEligibility = async (req, res) => {
  try {
    const bookingId = req.query.bookingId || req.query.booking_id || req.body?.booking_id;
    const userId = req.user ? req.user.guest_id : (req.query.userId || req.headers['x-user-id']);

    if (!userId) {
      return res.status(401).json({
        success: false,
        eligible: false,
        message: 'Vui lòng đăng nhập để kiểm tra quyền đánh giá.'
      });
    }

    const result = await cassandraService.checkReviewEligibility(bookingId, userId);
    return res.json({
      success: true,
      data: result,
      ...result
    });
  } catch (error) {
    console.error('Lỗi kiểm tra quyền đánh giá:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Tạo đánh giá khách sạn mới
exports.createHotelReview = async (req, res) => {
  try {
    const hotelIdFromParam = req.params.hotelId;
    const { hotel_id, booking_id, rating, comment } = req.body;
    const actualHotelId = hotelIdFromParam || hotel_id;
    const userId = req.user.guest_id;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Mã đặt phòng (booking_id) là bắt buộc.'
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá (rating) là bắt buộc.'
      });
    }

    const result = await cassandraService.createHotelReview({
      hotel_id: actualHotelId,
      booking_id,
      user_id: userId,
      rating,
      comment
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công! Cảm ơn nhận xét của quý khách.',
      data: result
    });
  } catch (error) {
    console.error('Lỗi tạo đánh giá khách sạn:', error);
    const msg = error.message.toLowerCase();
    let status = 400;

    if (msg.includes('đã được đánh giá trước đó') || msg.includes('trùng lặp')) {
      status = 409; // Conflict
    } else if (msg.includes('không thuộc về tài khoản')) {
      status = 403; // Forbidden
    } else if (msg.includes('đăng nhập')) {
      status = 401; // Unauthorized
    }

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// 5. Lấy chi tiết đánh giá theo ID
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await cassandraService.getHotelReviewById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đánh giá với ID: ${reviewId}`
      });
    }

    return res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết đánh giá:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Sửa đánh giá (Chỉ tác giả mới được sửa)
exports.updateHotelReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.guest_id;

    const result = await cassandraService.updateHotelReview({
      review_id: reviewId,
      user_id: userId,
      rating,
      comment
    });

    return res.json({
      success: true,
      message: 'Cập nhật đánh giá thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi cập nhật đánh giá:', error);
    const msg = error.message.toLowerCase();
    const status = msg.includes('không có quyền') ? 403 : (msg.includes('không tìm thấy') ? 404 : 400);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// 7. Xóa đánh giá (Chỉ tác giả mới được xóa)
exports.deleteHotelReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.guest_id;

    const result = await cassandraService.deleteHotelReview({
      review_id: reviewId,
      user_id: userId
    });

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Lỗi xóa đánh giá:', error);
    const msg = error.message.toLowerCase();
    const status = msg.includes('không có quyền') ? 403 : (msg.includes('không tìm thấy') ? 404 : 400);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// 8. Admin: Xem danh sách review toàn hệ thống (Tìm kiếm, lọc)
exports.getAdminReviews = async (req, res) => {
  try {
    const { search, hotelId, star, status, page, limit } = req.query;
    const result = await cassandraService.getAdminReviews({
      search,
      hotelId,
      star,
      status,
      page,
      limit
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách review cho Admin:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin: Cập nhật trạng thái kiểm duyệt (Ẩn / Hiện review) - Không cho sửa nội dung
exports.updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái kiểm duyệt (status) là bắt buộc (ACTIVE hoặc HIDDEN).'
      });
    }

    const result = await cassandraService.updateReviewStatus(reviewId, status);
    return res.json({
      success: true,
      message: result.message,
      data: result.review,
      ...result
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái kiểm duyệt:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// 10. Lấy thống kê tổng hợp toàn hệ thống cho trang About AstraStay
exports.getSystemRatingSummary = async (req, res) => {
  try {
    const summary = await cassandraService.getSystemRatingSummary();
    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê toàn hệ thống:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
