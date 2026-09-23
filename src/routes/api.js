const express = require('express');
const router = express.Router();

const hotelController = require('../controllers/hotelController');
const roomController = require('../controllers/roomController');
const bookingController = require('../controllers/bookingController');
const invoiceController = require('../controllers/invoiceController');
const analyticsController = require('../controllers/analyticsController');
const reviewController = require('../controllers/reviewController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// ==============================================================================
// MODULE ĐÁNH GIÁ KHÁCH SẠN (HOTEL REVIEWS & RATINGS)
// ==============================================================================
router.get('/hotels/:hotelId/reviews', reviewController.getHotelReviews);
router.get('/hotels/:hotelId/reviews/stats', reviewController.getHotelReviewStats);
router.post('/hotels/:hotelId/reviews', requireAuth, reviewController.createHotelReview);
router.post('/reviews', requireAuth, reviewController.createHotelReview);
router.get('/reviews/check-eligibility', requireAuth, reviewController.checkEligibility);
router.get('/reviews/system-summary', reviewController.getSystemRatingSummary);
router.get('/reviews/:reviewId', reviewController.getReviewById);
router.put('/reviews/:reviewId', requireAuth, reviewController.updateHotelReview);
router.delete('/reviews/:reviewId', requireAuth, reviewController.deleteHotelReview);

// Admin: Quản lý và kiểm duyệt đánh giá
router.get('/admin/reviews', reviewController.getAdminReviews);
router.patch('/admin/reviews/:reviewId/status', reviewController.updateReviewStatus);

// Hotels & POIs (Q1, Q2, Q3 theo Hotel.cql)
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/pois', hotelController.getAllPois);
router.get('/hotels/:hotelId', hotelController.getHotelById);
router.get('/hotels/:hotelId/rooms', roomController.getRoomsByHotel);
router.get('/hotels/:hotelId/rooms/search', roomController.searchRoomsWithPricing);
router.get('/hotels/:hotelId/rooms/top-rated', roomController.getTopRatedRooms);
router.get('/hotels/:hotelId/rooms/:roomId/amenities', roomController.getAmenitiesByRoom);
router.get('/hotels/:hotelId/rooms/:roomId/reviews', roomController.getRoomReviews);
router.get('/hotels/:hotelId/rooms/:roomId/rating', roomController.getRoomRating);
router.post('/hotels/:hotelId/rooms/:roomId/reviews', roomController.createRoomReview);

// Đánh giá nổi bật & Thả tim nhận xét hữu ích
router.get('/reviews/featured', roomController.getFeaturedReviews);
router.post('/reviews/:reviewId/helpful', roomController.markReviewHelpful);

// Quản lý phòng & cập nhật trạng thái (Check-in, Check-out, Bảo trì)
router.patch('/hotels/:hotelId/rooms/:roomNumber/status', roomController.updateRoomStatus);

// Đặt phòng & Tra cứu (Q3, Q4, Q6, Q7, Q8, BATCH)
router.post('/bookings', bookingController.createBooking);
router.get('/bookings/recent', bookingController.getRecentBookings);
router.get('/bookings/detail/:bookingId', bookingController.getBookingById);
router.delete('/bookings/:bookingId', bookingController.cancelBooking);
router.get('/bookings/guest/:guestId', bookingController.getBookingsByGuest);
router.get('/bookings/hotel/:hotelId', bookingController.getBookingsByHotelDate);

// Hoá đơn (Q5)
router.get('/invoices/:bookingId', invoiceController.getInvoiceByBooking);

// Dashboard & CQL Live Monitor (Đề tài 2, 4 & CQL Inspector)
router.get('/analytics/dashboard', analyticsController.getDashboardStats);
router.get('/analytics/cql-history', analyticsController.getCqlHistory);
router.get('/analytics/system-status', analyticsController.getSystemStatus);

module.exports = router;
