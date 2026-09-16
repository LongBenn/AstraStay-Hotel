const express = require('express');
const router = express.Router();

const hotelController = require('../controllers/hotelController');
const roomController = require('../controllers/roomController');
const bookingController = require('../controllers/bookingController');
const invoiceController = require('../controllers/invoiceController');
const analyticsController = require('../controllers/analyticsController');

// Hotels & POIs (Q1, Q2, Q3 theo Hotel.cql)
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/pois', hotelController.getAllPois);
router.get('/hotels/:hotelId', hotelController.getHotelById);
router.get('/hotels/:hotelId/rooms', roomController.getRoomsByHotel);
router.get('/hotels/:hotelId/rooms/:roomId/amenities', roomController.getAmenitiesByRoom);

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
