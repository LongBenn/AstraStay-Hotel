const { getClient, getConnectionStatus, recordCqlExecution } = require('../config/cassandra');
const mockStore = require('./mockStore');
const { v4: uuidv4 } = require('uuid');
const cassandra = require('cassandra-driver');

class CassandraService {
  getHotelRatingSummarySync(hotelId) {
    const summary = (mockStore.hotel_rating_summary || []).find(s => s.hotel_id === hotelId);
    if (summary) {
      return {
        average_rating: Number(summary.average_rating) || 5.0,
        review_count: Number(summary.review_count) || 0,
        rating_sum: Number(summary.rating_sum) || 0,
        count_1_star: Number(summary.count_1_star) || 0,
        count_2_star: Number(summary.count_2_star) || 0,
        count_3_star: Number(summary.count_3_star) || 0,
        count_4_star: Number(summary.count_4_star) || 0,
        count_5_star: Number(summary.count_5_star) || 0
      };
    }
    return {
      average_rating: 5.0,
      review_count: 0,
      rating_sum: 0,
      count_1_star: 0,
      count_2_star: 0,
      count_3_star: 0,
      count_4_star: 0,
      count_5_star: 0
    };
  }

  enrichHotel(hotel) {
    const sample = mockStore.hotels.find(item => item.hotel_id === hotel.hotel_id) || {};
    const ratingSummary = this.getHotelRatingSummarySync(hotel.hotel_id);
    return {
      ...sample,
      ...hotel,
      average_rating: ratingSummary.average_rating,
      review_count: ratingSummary.review_count,
      rating_summary: ratingSummary,
      gallery: hotel.gallery || hotel.images || hotel.image_urls || hotel.photos || sample.gallery,
      image_url: hotel.image_url || hotel.imageUrl || hotel.thumbnail || sample.image_url
    };
  }

  // Helper thực thi truy vấn CQL hoặc mô phỏng qua MockStore
  async execute(query, params = [], options = { prepare: true }) {
    const startTime = Date.now();
    const { isConnected, connectionMode } = getConnectionStatus();
    const client = getClient();

    if (connectionMode !== 'MOCK' && client && isConnected) {
      try {
        const result = await client.execute(query, params, options);
        const duration = Date.now() - startTime;
        recordCqlExecution(query, params, duration, true);
        return result.rows || [];
      } catch (err) {
        const duration = Date.now() - startTime;
        recordCqlExecution(query, params, duration, false, err.message);
        throw err;
      }
    } else {
      // Giả lập độ trễ truy vấn Cassandra (3-15ms)
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 12) + 3));
      const duration = Date.now() - startTime;
      recordCqlExecution(query, params, duration, true);
      return null; // Báo hiệu cho mock handler thực thi
    }
  }

  // Helper thực thi BATCH statement (LOGGED)
  async executeBatch(queries, options = { prepare: true, logged: true }) {
    const startTime = Date.now();
    const { isConnected, connectionMode } = getConnectionStatus();
    const client = getClient();

    const batchSummary = `BEGIN BATCH (${queries.length} statements)\n` + 
      queries.map(q => `  -> ${q.query} [${(q.params || []).map(p => typeof p === 'object' ? p.toString() : p).join(', ')}]`).join('\n') + 
      '\nAPPLY BATCH;';

    if (connectionMode !== 'MOCK' && client && isConnected) {
      try {
        const result = await client.batch(queries, options);
        const duration = Date.now() - startTime;
        recordCqlExecution(batchSummary, [], duration, true);
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        recordCqlExecution(batchSummary, [], duration, false, err.message);
        throw err;
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 15) + 5));
      const duration = Date.now() - startTime;
      recordCqlExecution(batchSummary, [], duration, true);
      return true;
    }
  }

  // Q1 & Q2: Lấy thông tin khách sạn
  async getAllHotels() {
    const cql = 'SELECT hotel_id, name, phone, address FROM hotels;';
    const rows = await this.execute(cql);
    if (rows && rows.length > 0) return rows.map(hotel => this.enrichHotel(hotel));
    return mockStore.hotels.map(hotel => this.enrichHotel(hotel));
  }

  async getHotelById(hotelId) {
    const cql = 'SELECT hotel_id, name, phone, address FROM hotels WHERE hotel_id = ?;';
    const rows = await this.execute(cql, [hotelId]);
    if (rows && rows.length > 0) return this.enrichHotel(rows[0]);
    const hotel = mockStore.hotels.find(h => h.hotel_id === hotelId);
    return hotel ? this.enrichHotel(hotel) : null;
  }

  async getHotelsByPoi(poiName) {
    const cql = 'SELECT poi_name, hotel_id, name, phone, address FROM hotels_by_poi WHERE poi_name = ?;';
    const rows = await this.execute(cql, [poiName]);
    if (rows && rows.length > 0) return rows.map(hotel => this.enrichHotel(hotel));
    return mockStore.hotels_by_poi
      .filter(h => h.poi_name.toLowerCase() === poiName.toLowerCase())
      .map(hotel => this.enrichHotel(hotel));
  }

  async getPoisByHotel(hotelId) {
    const cql = 'SELECT hotel_id, poi_name, description FROM pois_by_hotel WHERE hotel_id = ?;';
    const rows = await this.execute(cql, [hotelId]);
    if (rows && rows.length > 0) return rows;
    return mockStore.pois_by_hotel.filter(p => p.hotel_id === hotelId);
  }

  async getAllPois() {
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      const rows = await this.execute('SELECT poi_name FROM hotels_by_poi;');
      if (rows && rows.length > 0) {
        return [...new Set(rows.map(r => r.poi_name))];
      }
    }
    const poisMap = new Map();
    mockStore.hotels_by_poi.forEach(item => {
      poisMap.set(item.poi_name, item);
    });
    return Array.from(poisMap.keys());
  }

  // Q2 & Q4: Lấy danh sách phòng của khách sạn
  async getRoomsByHotel(hotelId) {
    const cql = 'SELECT hotel_id, room_number, room_type, price_per_night, status FROM rooms_by_hotel WHERE hotel_id = ?;';
    const rows = await this.execute(cql, [hotelId]);
    if (rows && rows.length > 0) {
      return rows.map(r => ({
        ...r,
        price_per_night: typeof r.price_per_night === 'object' ? parseFloat(r.price_per_night.toString()) : r.price_per_night
      }));
    }
    return mockStore.rooms_by_hotel.filter(r => r.hotel_id === hotelId);
  }

  async updateRoomStatus(hotelId, roomNumber, status) {
    const num = parseInt(roomNumber, 10);
    const cql = 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;';
    await this.execute(cql, [status, hotelId, num]);

    // Cập nhật mock store rooms_by_hotel
    const room = mockStore.rooms_by_hotel.find(r => r.hotel_id === hotelId && r.room_number === num);
    if (room) {
      room.status = status;
    }

    // Đồng bộ tức thì sang available_rooms_by_hotel_date trong mock store
    const isAvailNumber = status === 'AVAILABLE' ? 1 : 0;
    if (Array.isArray(mockStore.available_rooms_by_hotel_date)) {
      mockStore.available_rooms_by_hotel_date.forEach(ar => {
        if (ar.hotel_id === hotelId && ar.room_number === num) {
          ar.is_available = isAvailNumber;
        }
      });
    }

    return room || { hotel_id: hotelId, room_number: num, status };
  }

  async getAmenitiesByRoom(hotelId, roomId) {
    const cql = 'SELECT hotel_id, room_id, amenity_name, description, rate FROM amenities_by_room WHERE hotel_id = ? AND room_id = ?;';
    const rows = await this.execute(cql, [hotelId, roomId]);
    if (rows && rows.length > 0) return rows;
    return mockStore.amenities_by_room.filter(a => a.hotel_id === hotelId && a.room_id === roomId);
  }

  // Q3: Lịch sử đặt phòng theo khách hàng
  async getBookingsByGuest(guestId) {
    const cql = 'SELECT guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status FROM bookings_by_guest WHERE guest_id = ?;';
    const rows = await this.execute(cql, [guestId]);
    if (rows && rows.length > 0) {
      return rows.map(r => ({
        ...r,
        check_in_date: r.check_in_date?.toString() || r.check_in_date,
        check_out_date: r.check_out_date?.toString() || r.check_out_date,
        booking_id: r.booking_id?.toString() || r.booking_id,
        total_amount: typeof r.total_amount === 'object' ? parseFloat(r.total_amount.toString()) : r.total_amount
      }));
    }
    return mockStore.bookings_by_guest
      .filter(b => b.guest_id.toLowerCase() === guestId.toLowerCase())
      .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
  }

  // Lấy danh sách các đơn đặt phòng mới nhất phục vụ gợi ý tra cứu
  async getRecentBookings(limit = 8) {
    const list = [...mockStore.bookings_by_hotel_date]
      .map(b => {
        const hotel = mockStore.hotels.find(h => h.hotel_id === b.hotel_id);
        return {
          ...b,
          hotel_name: hotel ? hotel.name : (b.hotel_name || 'Khách sạn liên kết')
        };
      })
      .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date))
      .slice(0, limit);
    return list;
  }

  // Q4: Danh sách đặt phòng theo khách sạn và ngày
  async getBookingsByHotelDate(hotelId, startDate, endDate) {
    let cql, params;
    if (startDate && endDate) {
      cql = 'SELECT hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status FROM bookings_by_hotel_date WHERE hotel_id = ? AND check_in_date >= ? AND check_in_date <= ?;';
      params = [hotelId, startDate, endDate];
    } else if (startDate) {
      cql = 'SELECT hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status FROM bookings_by_hotel_date WHERE hotel_id = ? AND check_in_date = ?;';
      params = [hotelId, startDate];
    } else {
      cql = 'SELECT hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status FROM bookings_by_hotel_date WHERE hotel_id = ?;';
      params = [hotelId];
    }
    const rows = await this.execute(cql, params);
    if (rows && rows.length > 0) {
      return rows.map(r => ({
        ...r,
        check_in_date: r.check_in_date?.toString() || r.check_in_date,
        check_out_date: r.check_out_date?.toString() || r.check_out_date,
        booking_id: r.booking_id?.toString() || r.booking_id,
        total_amount: typeof r.total_amount === 'object' ? parseFloat(r.total_amount.toString()) : r.total_amount
      }));
    }

    return mockStore.bookings_by_hotel_date.filter(b => {
      if (b.hotel_id !== hotelId) return false;
      if (startDate && endDate) {
        return b.check_in_date >= startDate && b.check_in_date <= endDate;
      }
      if (startDate) {
        return b.check_in_date === startDate;
      }
      return true;
    });
  }

  // Q5: Tra cứu hoá đơn theo mã đặt phòng
  async getInvoiceByBooking(bookingId) {
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = 'SELECT booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at FROM invoices_by_booking WHERE booking_id = ?;';
        const rows = await this.execute(cql, [cassandra.types.Uuid.fromString(bookingId.toString())]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            ...r,
            booking_id: r.booking_id?.toString(),
            invoice_id: r.invoice_id?.toString(),
            total_amount: typeof r.total_amount === 'object' ? parseFloat(r.total_amount.toString()) : r.total_amount,
            room_charge: typeof r.room_charge === 'object' ? parseFloat(r.room_charge.toString()) : r.room_charge,
            service_charge: typeof r.service_charge === 'object' ? parseFloat(r.service_charge.toString()) : r.service_charge,
            tax: typeof r.tax === 'object' ? parseFloat(r.tax.toString()) : r.tax
          };
        }
      } catch (err) {
        // Fallback
      }
    }
    return mockStore.invoices_by_booking.find(i => String(i.booking_id).toLowerCase() === String(bookingId).toLowerCase()) || null;
  }

  // Tra cứu đặt phòng theo booking_id (duyệt tìm thông tin)
  async getBookingById(bookingId) {
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const invRows = await this.execute(
          'SELECT booking_id, guest_id, hotel_id, total_amount FROM invoices_by_booking WHERE booking_id = ?;',
          [cassandra.types.Uuid.fromString(bookingId.toString())]
        );
        if (invRows && invRows.length > 0) {
          const inv = invRows[0];
          const bRows = await this.execute(
            'SELECT guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status FROM bookings_by_guest WHERE guest_id = ?;',
            [inv.guest_id]
          );
          const found = (bRows || []).find(b => b.booking_id?.toString().toLowerCase() === bookingId.toLowerCase());
          if (found) {
            return {
              ...found,
              check_in_date: found.check_in_date?.toString(),
              check_out_date: found.check_out_date?.toString(),
              booking_id: found.booking_id?.toString(),
              total_amount: typeof found.total_amount === 'object' ? parseFloat(found.total_amount.toString()) : found.total_amount
            };
          }
        }
      } catch (err) {
        // Fallback sang mock store
      }
    }

    const guestBooking = mockStore.bookings_by_guest.find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (guestBooking) return guestBooking;
    const hotelBooking = mockStore.bookings_by_hotel_date.find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    return hotelBooking || null;
  }

  // Q6. Tra cứu đặt phòng theo mã xác nhận số nguyên (confirm_number)
  async getReservationByConfirmNumber(confirmNumber) {
    const num = parseInt(confirmNumber, 10);
    if (isNaN(num)) return null;

    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = 'SELECT * FROM reservations_by_confirmation WHERE confirm_number = ?;';
        const rows = await this.execute(cql, [num]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          const bookingDetail = r.booking_id ? await this.getBookingById(r.booking_id) : null;
          return {
            ...r,
            confirm_number: r.confirm_number,
            start_date: r.start_date?.toString(),
            end_date: r.end_date?.toString(),
            ...(bookingDetail || {})
          };
        }
      } catch (err) {
        console.error('Lỗi khi tra cứu reservations_by_confirmation:', err);
      }
    }

    const found = (mockStore.reservations_by_confirmation || []).find(r => Number(r.confirm_number) === num);
    if (found) {
      const invoice = mockStore.invoices_by_booking.find(i => String(i.booking_id).toLowerCase() === String(found.booking_id).toLowerCase());
      return { ...found, invoice };
    }
    return null;
  }

  // Q8. Tìm kiếm tất cả đặt phòng theo họ của khách (guest_last_name)
  async getReservationsByGuestLastName(lastName, hotelId = null) {
    if (!lastName) return [];
    const cleanLastName = lastName.trim();

    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        let cql, params;
        if (hotelId) {
          cql = 'SELECT * FROM reservations_by_guest WHERE guest_last_name = ? AND hotel_id = ?;';
          params = [cleanLastName, hotelId];
        } else {
          cql = 'SELECT * FROM reservations_by_guest WHERE guest_last_name = ?;';
          params = [cleanLastName];
        }
        const rows = await this.execute(cql, params);
        return (rows || []).map(r => ({
          ...r,
          start_date: r.start_date?.toString(),
          end_date: r.end_date?.toString(),
          total_amount: typeof r.total_amount === 'object' ? parseFloat(r.total_amount.toString()) : r.total_amount
        }));
      } catch (err) {
        console.error('Lỗi khi tra cứu reservations_by_guest:', err);
      }
    }

    return (mockStore.reservations_by_guest || []).filter(r => {
      const match = r.guest_last_name && r.guest_last_name.toLowerCase() === cleanLastName.toLowerCase();
      if (!match) return false;
      if (hotelId) return r.hotel_id === hotelId;
      return true;
    });
  }

  // Q9. Tìm kiếm thông tin chi tiết khách hàng theo ID (guests)
  async getGuestById(guestId) {
    if (!guestId) return null;
    const cleanId = String(guestId).trim();

    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = 'SELECT guest_id, first_name, last_name, email, phone_numbers, addresses FROM guests WHERE guest_id = ?;';
        const rows = await this.execute(cql, [cleanId]);
        if (rows && rows.length > 0) return rows[0];
      } catch (err) {
        console.error('Lỗi khi tra cứu guests theo ID:', err);
      }
    }

    const guest = (mockStore.guests || []).find(g => String(g.guest_id).toLowerCase() === cleanId.toLowerCase());
    if (guest) {
      const guestBookings = (mockStore.bookings_by_guest || []).filter(b => String(b.guest_id).toLowerCase() === cleanId.toLowerCase());
      const totalSpent = guestBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      return {
        ...guest,
        full_name: `${guest.last_name || ''} ${guest.first_name || ''}`.trim(),
        total_bookings: guestBookings.length,
        total_spent: totalSpent,
        recent_bookings: guestBookings.slice(0, 5)
      };
    }
    return null;
  }

  // Q9. Lấy danh sách toàn bộ khách hàng
  async getAllGuests() {
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = 'SELECT guest_id, first_name, last_name, email, phone_numbers, addresses FROM guests;';
        const rows = await this.execute(cql, []);
        return (rows || []).map(g => ({
          ...g,
          full_name: `${g.last_name || ''} ${g.first_name || ''}`.trim()
        }));
      } catch (err) {
        console.error('Lỗi khi lấy danh sách guests:', err);
      }
    }

    return (mockStore.guests || []).map(g => {
      const guestBookings = (mockStore.bookings_by_guest || []).filter(b => String(b.guest_id).toLowerCase() === String(g.guest_id).toLowerCase());
      const totalSpent = guestBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      return {
        ...g,
        full_name: `${g.last_name || ''} ${g.first_name || ''}`.trim(),
        total_bookings: guestBookings.length,
        total_spent: totalSpent
      };
    });
  }

  // TẠO ĐẶT PHÒNG MỚI: Sử dụng Cassandra LOGGED BATCH đồng bộ đồng thời vào các bảng (Q3, Q4, Q6, Q8) + hoá đơn + đổi trạng thái phòng
  async createBooking({
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
  }) {
    const booking_id = uuidv4();
    const invoice_id = uuidv4();
    const confirm_number = Math.floor(10000000 + Math.random() * 90000000); // Mã xác nhận 8 chữ số cho Q6
    const guest_last_name = (guest_name || 'Khách').trim().split(/\s+/)[0]; // Trích xuất Họ cho Q8
    const room_num = parseInt(room_number, 10);
    const num_nights = parseInt(nights, 10) || 1;
    const room_charge = price_per_night * num_nights;
    const service_charge = Math.round(room_charge * 0.05); // 5% phí dịch vụ
    const tax = Math.round((room_charge + service_charge) * 0.1); // 10% VAT
    const total_amount = room_charge + service_charge + tax;
    const status = payment_status === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : 'CONFIRMED';
    const effectiveOrderStatus = order_status || (status === 'PENDING_PAYMENT' ? 'Chờ xác nhận thanh toán' : 'CONFIRMED');
    const issued_at = new Date();
    const paymentState = payment_status === 'PENDING_PAYMENT' ? 'PENDING' : 'PAID';

    const { isConnected, connectionMode } = getConnectionStatus();

    // Chuẩn bị tham số cho Cassandra driver (tự động wrap types nếu chạy trên Astra/Local thật)
    let cqlBookingId = booking_id;
    let cqlInvoiceId = invoice_id;
    let cqlCheckIn = check_in_date;
    let cqlCheckOut = check_out_date;

    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        cqlBookingId = cassandra.types.Uuid.fromString(booking_id);
        cqlInvoiceId = cassandra.types.Uuid.fromString(invoice_id);
        cqlCheckIn = cassandra.types.LocalDate.fromString(check_in_date);
        cqlCheckOut = cassandra.types.LocalDate.fromString(check_out_date);
      } catch (err) {
        // Bỏ qua nếu kiểu string được driver tự ép kiểu
      }
    }

    // 1. Chuẩn bị các câu lệnh cho Cassandra LOGGED BATCH (Đồng bộ nguyên tử các bảng NoSQL)
    const batchQueries = [
      {
        // 1. Lưu vào lịch sử khách hàng (Q3)
        query: 'INSERT INTO bookings_by_guest (guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [guest_id, cqlCheckIn, cqlBookingId, hotel_id, hotel_name, room_num, cqlCheckOut, total_amount, status]
      },
      {
        // 2. Lưu vào lịch trình đón khách của khách sạn (Q7: bookings_by_hotel_date)
        query: 'INSERT INTO bookings_by_hotel_date (hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [hotel_id, cqlCheckIn, cqlBookingId, guest_id, guest_name, room_num, cqlCheckOut, total_amount, status]
      },
      {
        // 3. Tra cứu nhanh theo mã xác nhận 8 số (Q6: reservations_by_confirmation)
        query: 'INSERT INTO reservations_by_confirmation (confirm_number, hotel_id, room_id, start_date, end_date, guest_id) VALUES (?, ?, ?, ?, ?, ?);',
        params: [confirm_number, hotel_id, room_id || `RM-${room_num}`, cqlCheckIn, cqlCheckOut, guest_id]
      },
      {
        // 4. Tra cứu đặt phòng theo họ khách (Q8: reservations_by_guest)
        query: 'INSERT INTO reservations_by_guest (guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number) VALUES (?, ?, ?, ?, ?, ?, ?);',
        params: [guest_last_name, hotel_id, guest_id, room_id || `RM-${room_num}`, cqlCheckIn, cqlCheckOut, confirm_number]
      },
      {
        // 5. Tạo hoá đơn điện tử (Q5)
        query: 'INSERT INTO invoices_by_booking (booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [cqlBookingId, cqlInvoiceId, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, paymentState, issued_at]
      },
      {
        // 6. Đổi trạng thái phòng sang OCCUPIED (Q2)
        query: 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;',
        params: ['OCCUPIED', hotel_id, room_num]
      }
    ];

    // Thực thi BATCH
    await this.executeBatch(batchQueries);

    // Cập nhật MockStore để đồng bộ trạng thái
    const newGuestBooking = {
      guest_id,
      guest_name,
      check_in_date,
      booking_id,
      confirm_number,
      hotel_id,
      hotel_name,
      room_number: room_num,
      room_id: room_id || `RM-${room_num}`,
      check_out_date,
      total_amount,
      status,
      order_status: effectiveOrderStatus,
      order_code: order_code || `ASTRA-${Date.now()}`,
      demo_mode: Boolean(demo_mode),
      payment_status: paymentState
    };
    mockStore.bookings_by_guest.unshift(newGuestBooking);

    const newHotelBooking = {
      hotel_id,
      check_in_date,
      booking_id,
      confirm_number,
      guest_id,
      guest_name,
      room_number: room_num,
      room_id: room_id || `RM-${room_num}`,
      check_out_date,
      total_amount,
      status,
      order_status: effectiveOrderStatus,
      order_code: order_code || `ASTRA-${Date.now()}`,
      demo_mode: Boolean(demo_mode),
      payment_status: paymentState
    };
    mockStore.bookings_by_hotel_date.unshift(newHotelBooking);

    // Bổ sung Q6 và Q8 vào MockStore
    if (mockStore.reservations_by_confirmation) {
      mockStore.reservations_by_confirmation.unshift({
        confirm_number,
        hotel_id,
        hotel_name,
        room_id: room_id || `RM-${room_num}`,
        room_number: room_num,
        start_date: check_in_date,
        end_date: check_out_date,
        guest_id,
        guest_name,
        booking_id,
        total_amount,
        status
      });
    }

    if (mockStore.reservations_by_guest) {
      mockStore.reservations_by_guest.unshift({
        guest_last_name,
        hotel_id,
        hotel_name,
        guest_id,
        guest_name,
        room_id: room_id || `RM-${room_num}`,
        room_number: room_num,
        start_date: check_in_date,
        end_date: check_out_date,
        confirm_number,
        booking_id,
        total_amount,
        status
      });
    }

    const newInvoice = {
      booking_id,
      invoice_id,
      guest_id,
      hotel_id,
      room_charge,
      service_charge,
      tax,
      total_amount,
      payment_status: paymentState,
      issued_at,
      order_code: order_code || `ASTRA-${Date.now()}`,
      order_status: effectiveOrderStatus,
      demo_mode: Boolean(demo_mode)
    };
    mockStore.invoices_by_booking.unshift(newInvoice);

    // Đổi trạng thái phòng thành OCCUPIED
    const room = mockStore.rooms_by_hotel.find(r => r.hotel_id === hotel_id && r.room_number === room_num);
    if (room) {
      room.status = 'OCCUPIED';
    }

    return {
      booking: newGuestBooking,
      invoice: newInvoice,
      confirm_number
    };
  }

  // HUỶ ĐẶT PHÒNG: Cập nhật đồng bộ cả 2 bảng bằng BATCH và chuyển phòng về AVAILABLE
  async cancelBooking(bookingId) {
    let booking = await this.getBookingById(bookingId);
    if (!booking) {
      booking = mockStore.bookings_by_guest.find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    }

    if (!booking) {
      throw new Error(`Không tìm thấy đơn đặt phòng với mã: ${bookingId}`);
    }

    const { guest_id, check_in_date, hotel_id, room_number } = booking;
    const dateStr = typeof check_in_date === 'object' && check_in_date.toString ? check_in_date.toString() : check_in_date;

    const { isConnected, connectionMode } = getConnectionStatus();
    let cqlBookingId = bookingId;
    let cqlDate = dateStr;

    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        cqlBookingId = cassandra.types.Uuid.fromString(bookingId.toString());
        cqlDate = cassandra.types.LocalDate.fromString(dateStr);
      } catch (err) {
        // Driver format
      }
    }

    const batchQueries = [
      {
        query: 'UPDATE bookings_by_guest SET status = ? WHERE guest_id = ? AND check_in_date = ? AND booking_id = ?;',
        params: ['CANCELLED', guest_id, cqlDate, cqlBookingId]
      },
      {
        query: 'UPDATE bookings_by_hotel_date SET status = ? WHERE hotel_id = ? AND check_in_date = ? AND booking_id = ?;',
        params: ['CANCELLED', hotel_id, cqlDate, cqlBookingId]
      },
      {
        query: 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;',
        params: ['AVAILABLE', hotel_id, parseInt(room_number, 10)]
      }
    ];

    await this.executeBatch(batchQueries);

    // Cập nhật MockStore
    const guestBooking = mockStore.bookings_by_guest.find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (guestBooking) guestBooking.status = 'CANCELLED';

    const hotelBooking = mockStore.bookings_by_hotel_date.find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (hotelBooking) hotelBooking.status = 'CANCELLED';

    const confBooking = (mockStore.reservations_by_confirmation || []).find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (confBooking) confBooking.status = 'CANCELLED';

    const guestRes = (mockStore.reservations_by_guest || []).find(b => String(b.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (guestRes) guestRes.status = 'CANCELLED';

    const room = mockStore.rooms_by_hotel.find(r => r.hotel_id === hotel_id && r.room_number === parseInt(room_number, 10));
    if (room) room.status = 'AVAILABLE';

    const invoice = mockStore.invoices_by_booking.find(i => String(i.booking_id).toLowerCase() === String(bookingId).toLowerCase());
    if (invoice) invoice.payment_status = 'REFUNDED';

    return { bookingId, status: 'CANCELLED', message: 'Đã huỷ đặt phòng thành công và hoàn trả trạng thái phòng.' };
  }

  // ĐỀ TÀI 2 & 4: Analytics, Dashboard & Báo cáo doanh thu
  async getDashboardStats() {
    const totalRooms = mockStore.rooms_by_hotel.length;
    const occupiedRooms = mockStore.rooms_by_hotel.filter(r => r.status === 'OCCUPIED').length;
    const availableRooms = mockStore.rooms_by_hotel.filter(r => r.status === 'AVAILABLE').length;
    const maintenanceRooms = mockStore.rooms_by_hotel.filter(r => r.status === 'MAINTENANCE').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Tổng doanh thu từ các hoá đơn hợp lệ (PAID)
    const validInvoices = mockStore.invoices_by_booking.filter(i => i.payment_status === 'PAID');
    const totalRevenue = validInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    const totalBookings = mockStore.bookings_by_guest.filter(b => b.status !== 'CANCELLED').length;

    // Doanh thu theo từng khách sạn
    const revenueByHotel = {};
    mockStore.hotels.forEach(h => {
      revenueByHotel[h.name] = 0;
    });

    validInvoices.forEach(inv => {
      const hotel = mockStore.hotels.find(h => h.hotel_id === inv.hotel_id);
      const name = hotel ? hotel.name : inv.hotel_id;
      revenueByHotel[name] = (revenueByHotel[name] || 0) + Number(inv.total_amount);
    });

    // Thống kê đặt phòng theo tháng (Đề tài 2)
    const monthlyRevenue = {
      'T1/2026': 12500000,
      'T2/2026': 18900000,
      'T3/2026': 24562000,
      'T4/2026': 19200000,
      'T5/2026': 27800000,
      'T6/2026': 35400000,
      'T7/2026': 42100000,
      'T8/2026': 38900000,
      'T9/2026': 31200000,
      'T10/2026': totalRevenue // Tháng hiện tại
    };

    // Khách hàng thân thiết (Đề tài 4)
    const guestBookingCount = {};
    mockStore.bookings_by_guest.forEach(b => {
      guestBookingCount[b.guest_id] = (guestBookingCount[b.guest_id] || 0) + 1;
    });

    const topGuests = Object.entries(guestBookingCount)
      .map(([guest_id, count]) => {
        const guestInfo = mockStore.guests.find(g => g.guest_id === guest_id);
        const name = guestInfo ? `${guestInfo.last_name} ${guestInfo.first_name}` : guest_id;
        return {
          guest_id,
          name,
          booking_count: count,
          email: guestInfo ? guestInfo.email : 'N/A'
        };
      })
      .sort((a, b) => b.booking_count - a.booking_count);

    return {
      kpi: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        occupancyRate,
        totalRevenue,
        totalBookings
      },
      revenueByHotel,
      monthlyRevenue,
      topGuests
    };
  }

  // ==============================================================================
  // BƯỚC 2: TÌM GIÁ PHÒNG & KIỂM TRA PHÒNG TRỐNG THEO NGÀY CHECK-IN / CHECK-OUT
  // ==============================================================================
  async searchAvailableRooms(hotelId, checkIn, checkOut, options = {}, maybeRating = null) {
    let minPrice, maxPrice, minRating;
    if (typeof options === 'object' && options !== null) {
      minPrice = options.minPrice;
      maxPrice = options.maxPrice;
      minRating = options.minRating;
    } else if (typeof options === 'number' || typeof options === 'string') {
      maxPrice = options;
      minRating = maybeRating;
    }

    // Sinh danh sách các đêm lưu trú [checkIn, checkOut) dùng UTC tránh lệch múi giờ
    const [inY, inM, inD] = checkIn.split('-').map(Number);
    const [outY, outM, outD] = checkOut.split('-').map(Number);
    const inDate = new Date(Date.UTC(inY, inM - 1, inD));
    const outDate = new Date(Date.UTC(outY, outM - 1, outD));
    const stayDates = [];

    for (let d = new Date(inDate); d < outDate; d.setUTCDate(d.getUTCDate() + 1)) {
      stayDates.push(d.toISOString().split('T')[0]);
    }

    const totalNights = stayDates.length;
    if (totalNights <= 0) {
      throw new Error('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.');
    }

    const { isConnected, connectionMode } = getConnectionStatus();
    let rows = [];

    if (connectionMode !== 'MOCK' && isConnected) {
      const cql = `SELECT hotel_id, start_date, room_number, room_id, room_type, price, is_available, average_rating, review_count 
                   FROM available_rooms_by_hotel_date 
                   WHERE hotel_id = ? AND start_date >= ? AND start_date < ?;`;
      rows = await this.execute(cql, [hotelId, checkIn, checkOut]);
    } else {
      rows = (mockStore.available_rooms_by_hotel_date || []).filter(item => {
        return item.hotel_id === hotelId && item.start_date >= checkIn && item.start_date < checkOut;
      });

      // Bổ sung linh hoạt cho chế độ Demo/Mock:
      // Tự động sinh lịch giá và phòng trống cho bất kỳ khoảng ngày nào (hiện tại, tương lai) nếu mockStore chưa có sẵn
      const hotelRooms = (mockStore.rooms_by_hotel || []).filter(rm => rm.hotel_id === hotelId);
      const existingKeySet = new Set(rows.map(r => `${r.room_number}_${r.start_date}`));

      for (const rm of hotelRooms) {
        const isAvailByStatus = (rm.status || '').toUpperCase() === 'AVAILABLE' ? 1 : 0;
        const basePrice = Number(rm.price_per_night) || 1500000;

        for (const dateStr of stayDates) {
          const key = `${rm.room_number}_${dateStr}`;
          if (!existingKeySet.has(key)) {
            const d = new Date(`${dateStr}T00:00:00`);
            const isWeekend = (d.getDay() === 5 || d.getDay() === 6);
            const price = isWeekend ? Math.round(basePrice * 1.2) : basePrice;

            // Kiểm tra trùng lịch trong bookings_by_hotel_date
            const hasBooking = (mockStore.bookings_by_hotel_date || []).some(b =>
              b.hotel_id === hotelId &&
              parseInt(b.room_number, 10) === parseInt(rm.room_number, 10) &&
              dateStr >= (b.start_date?.toString().slice(0, 10)) &&
              dateStr < (b.end_date?.toString().slice(0, 10))
            );

            const isAvail = (isAvailByStatus === 1 && !hasBooking) ? 1 : 0;

            rows.push({
              hotel_id: hotelId,
              start_date: dateStr,
              room_number: rm.room_number,
              room_id: rm.room_id,
              room_type: rm.room_type,
              price: price,
              is_available: isAvail,
              average_rating: 4.8,
              review_count: 50,
              is_weekend: isWeekend
            });
            existingKeySet.add(key);
          }
        }
      }
    }

    // Nhóm theo room_id / room_number
    const roomsMap = new Map();

    rows.forEach(r => {
      const roomKey = r.room_id || `RM-${r.room_number}`;
      if (!roomsMap.has(roomKey)) {
        roomsMap.set(roomKey, {
          room_id: r.room_id,
          room_number: r.room_number,
          room_type: r.room_type,
          daily_prices: [],
          is_available: true,
          total_price: 0,
          average_rating: typeof r.average_rating === 'object' ? parseFloat(r.average_rating.toString()) : (r.average_rating || 5.0),
          review_count: r.review_count || 0
        });
      }

      const roomEntry = roomsMap.get(roomKey);
      const dayPrice = typeof r.price === 'object' ? parseFloat(r.price.toString()) : (Number(r.price) || 0);
      const isAvail = Number(r.is_available) === 1;

      roomEntry.daily_prices.push({
        date: r.start_date?.toString() || r.start_date,
        price: dayPrice,
        is_available: isAvail
      });

      roomEntry.total_price += dayPrice;

      // QUY TẮC BƯỚC 2: Chỉ cần một ngày is_available = 0 thì phòng KHÔNG còn trống cho kỳ nghỉ này
      if (!isAvail) {
        roomEntry.is_available = false;
      }
    });

    // Bổ sung các phòng nếu thiếu bản ghi ngày trong khoảng -> không đủ điều kiện available
    const resultRooms = [];
    for (const [roomKey, roomData] of roomsMap.entries()) {
      // Kiểm tra có đủ số đêm không
      if (roomData.daily_prices.length < totalNights) {
        roomData.is_available = false;
      }

      // Lấy rating mới nhất từ precomputed summary nếu có
      const ratingSummary = (mockStore.room_rating_summary || []).find(s => s.hotel_id === hotelId && s.room_id === roomData.room_id);
      if (ratingSummary) {
        roomData.average_rating = ratingSummary.average_rating;
        roomData.review_count = ratingSummary.review_count;
      }

      roomData.price_per_night = Math.round(roomData.total_price / (roomData.daily_prices.length || 1));

      // Áp dụng bộ lọc giá và rating (Bước 9)
      if (minPrice && roomData.price_per_night < Number(minPrice)) continue;
      if (maxPrice && roomData.price_per_night > Number(maxPrice)) continue;
      if (minRating && roomData.average_rating < Number(minRating)) continue;

      resultRooms.push(roomData);
    }

    // Sắp xếp: Phòng còn trống lên trước, sau đó xếp theo rating giảm dần
    resultRooms.sort((a, b) => {
      if (a.is_available === b.is_available) {
        return b.average_rating - a.average_rating;
      }
      return a.is_available ? -1 : 1;
    });

    Object.assign(resultRooms, {
      hotel_id: hotelId,
      check_in: checkIn,
      check_out: checkOut,
      nights: totalNights,
      rooms: resultRooms
    });

    return resultRooms;
  }

  // ==============================================================================
  // BƯỚC 3 & 4: ĐÁNH GIÁ PHÒNG (REVIEWS & RATING SUMMARY)
  // ==============================================================================
  async getRoomReviews(hotelId, roomId) {
    const { isConnected, connectionMode } = getConnectionStatus();
    let reviews = [];

    if (connectionMode !== 'MOCK' && isConnected) {
      const cql = `SELECT guest_id, confirm_number, rating, comment, review_date, review_id 
                   FROM reviews_by_room 
                   WHERE hotel_id = ? AND room_id = ?;`;
      reviews = await this.execute(cql, [hotelId, roomId]);
    } else {
      reviews = (mockStore.reviews_by_room || []).filter(r => r.hotel_id === hotelId && r.room_id === roomId);
    }

    // Luôn sắp xếp review mới nhất lên trước
    reviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date));

    // Bổ sung tên khách hàng từ bảng guests
    return reviews.map(r => {
      const guest = (mockStore.guests || []).find(g => g.guest_id === r.guest_id);
      const guestName = guest ? `${guest.last_name} ${guest.first_name}` : (r.guest_name || r.guest_id);
      return {
        ...r,
        guest_name: guestName,
        review_date: r.review_date instanceof Date ? r.review_date.toISOString() : r.review_date
      };
    });
  }

  async getRoomRating(hotelId, roomId) {
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      const cql = `SELECT hotel_id, room_id, average_rating, review_count, rating_sum 
                   FROM room_rating_summary 
                   WHERE hotel_id = ? AND room_id = ?;`;
      const rows = await this.execute(cql, [hotelId, roomId]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          hotel_id: r.hotel_id,
          room_id: r.room_id,
          average_rating: typeof r.average_rating === 'object' ? parseFloat(r.average_rating.toString()) : Number(r.average_rating),
          review_count: Number(r.review_count),
          rating_sum: Number(r.rating_sum)
        };
      }
    }

    const summary = (mockStore.room_rating_summary || []).find(s => s.hotel_id === hotelId && s.room_id === roomId);
    if (summary) {
      return {
        hotel_id: summary.hotel_id,
        room_id: summary.room_id,
        average_rating: Number(summary.average_rating),
        review_count: Number(summary.review_count),
        rating_sum: Number(summary.rating_sum)
      };
    }

    return {
      hotel_id: hotelId,
      room_id: roomId,
      average_rating: 5.0,
      review_count: 0,
      rating_sum: 0
    };
  }

  // BƯỚC 5: TÌM PHÒNG THEO RATING TRONG KHÁCH SẠN (Không dùng ALLOW FILTERING)
  async getTopRatedRooms(hotelId, minRating = 4.0) {
    const minR = parseFloat(minRating) || 4.0;
    const { isConnected, connectionMode } = getConnectionStatus();

    if (connectionMode !== 'MOCK' && isConnected) {
      const cql = `SELECT room_id, room_number, room_type, average_rating, review_count, price_per_night 
                   FROM rooms_by_hotel_rating 
                   WHERE hotel_id = ? AND average_rating >= ?;`;
      const rows = await this.execute(cql, [hotelId, minR]);
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          ...r,
          average_rating: typeof r.average_rating === 'object' ? parseFloat(r.average_rating.toString()) : Number(r.average_rating),
          price_per_night: typeof r.price_per_night === 'object' ? parseFloat(r.price_per_night.toString()) : Number(r.price_per_night)
        }));
      }
    }

    return (mockStore.rooms_by_hotel_rating || [])
      .filter(r => r.hotel_id === hotelId && Number(r.average_rating) >= minR)
      .sort((a, b) => b.average_rating - a.average_rating);
  }

  // ==============================================================================
  // BƯỚC BỔ SUNG: ĐÁNH GIÁ & BÌNH LUẬN NỔI BẬT (FEATURED REVIEWS)
  // ==============================================================================
  async getFeaturedReviews(hotelId = null) {
    const { isConnected, connectionMode } = getConnectionStatus();

    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        if (hotelId) {
          const cql = `SELECT * FROM featured_reviews WHERE hotel_id = ? AND rating = 5;`;
          const rows = await this.execute(cql, [hotelId]);
          if (rows && rows.length > 0) {
            return rows.map(r => ({
              ...r,
              rating: Number(r.rating),
              helpful_count: Number(r.helpful_count || 0)
            }));
          }
        } else {
          // Lấy đánh giá nổi bật từ các khách sạn chính
          const allHotelReviews = [];
          for (const h of (mockStore.hotels || []).slice(0, 5)) {
            const cql = `SELECT * FROM featured_reviews WHERE hotel_id = ? AND rating = 5;`;
            const rows = await this.execute(cql, [h.hotel_id]);
            if (rows && rows.length > 0) {
              allHotelReviews.push(...rows);
            }
          }
          if (allHotelReviews.length > 0) {
            return allHotelReviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
          }
        }
      } catch (err) {
        console.warn('Fallback to mockStore for featured_reviews:', err.message);
      }
    }

    let list = mockStore.featured_reviews || [];
    if (hotelId) {
      list = list.filter(r => r.hotel_id === hotelId);
    }
    return list.slice().sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
  }

  async markReviewHelpful(reviewId) {
    const review = (mockStore.featured_reviews || []).find(r => r.review_id === reviewId);
    if (!review) {
      throw new Error(`Không tìm thấy đánh giá với ID: ${reviewId}`);
    }
    review.helpful_count = (review.helpful_count || 0) + 1;

    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = `UPDATE featured_reviews SET helpful_count = ? WHERE hotel_id = ? AND rating = ? AND review_id = ?;`;
        await this.execute(cql, [
          review.helpful_count,
          review.hotel_id,
          review.rating,
          cassandra.types.Uuid.fromString(review.review_id)
        ]);
      } catch (err) {
        console.warn('Lỗi cập nhật helpful_count trên Cassandra:', err.message);
      }
    }

    return {
      review_id: review.review_id,
      helpful_count: review.helpful_count
    };
  }

  // ==============================================================================
  // BƯỚC 6: VALIDATION & TẠO ĐÁNH GIÁ MỚI
  // ==============================================================================
  async createRoomReview({ hotel_id, room_id, guest_id, confirm_number, rating, comment }) {
    // 1. Kiểm tra rating hợp lệ từ 1 đến 5
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('Điểm đánh giá (rating) không hợp lệ. Phải là số nguyên từ 1 đến 5 sao.');
    }

    // 2. Kiểm tra comment không được rỗng
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      throw new Error('Nội dung đánh giá không được để trống.');
    }

    // 3. Kiểm tra guest_id tồn tại
    const guestExists = (mockStore.guests || []).find(g => g.guest_id.toLowerCase() === guest_id.toLowerCase());
    if (!guestExists) {
      throw new Error(`Mã khách hàng ${guest_id} không tồn tại trong hệ thống.`);
    }

    // 4. Kiểm tra confirm_number tồn tại
    const cNum = parseInt(confirm_number, 10);
    if (isNaN(cNum)) {
      throw new Error('Mã xác nhận đặt phòng (confirm_number) phải là số hợp lệ.');
    }

    // Tra cứu reservation từ bookings_by_guest hoặc bookings_by_hotel_date
    const reservation = (mockStore.bookings_by_guest || []).find(b => {
      const matchConfirm = (b.confirm_number && b.confirm_number === cNum) ||
                           (b.booking_id && b.booking_id.toString().startsWith(cNum.toString()));
      return matchConfirm;
    }) || (mockStore.bookings_by_hotel_date || []).find(b => {
      const matchConfirm = (b.confirm_number && b.confirm_number === cNum) ||
                           (b.booking_id && b.booking_id.toString().startsWith(cNum.toString()));
      return matchConfirm;
    });

    if (!reservation) {
      throw new Error(`Không tìm thấy đơn đặt phòng nào với mã xác nhận ${cNum}.`);
    }

    // 5. Kiểm tra reservation thuộc đúng guest_id
    if (reservation.guest_id.toLowerCase() !== guest_id.toLowerCase()) {
      throw new Error(`Đơn đặt phòng ${cNum} không thuộc về khách hàng ${guest_id}.`);
    }

    // 6. Kiểm tra reservation thuộc đúng hotel_id và room_id
    if (reservation.hotel_id !== hotel_id) {
      throw new Error(`Đơn đặt phòng ${cNum} không thuộc khách sạn này.`);
    }
    if (reservation.room_id && reservation.room_id !== room_id) {
      throw new Error(`Đơn đặt phòng ${cNum} không thuộc phòng ${room_id}.`);
    }

    // 7. Kiểm tra reservation đã hoàn thành lưu trú (CHECKED_OUT)
    const isCompleted = reservation.status === 'CHECKED_OUT' || reservation.status === 'COMPLETED';
    if (!isCompleted) {
      throw new Error(`Chỉ được đánh giá phòng sau khi đã hoàn thành thời gian lưu trú (Check-out). Trạng thái hiện tại: ${reservation.status}.`);
    }

    // 8. Chống đánh giá trùng lặp: một reservation chỉ được review 1 lần
    const alreadyReviewed = (mockStore.reviews_by_confirmation || []).find(r => r.confirm_number === cNum);
    if (alreadyReviewed) {
      throw new Error(`Mã đặt phòng ${cNum} đã được gửi đánh giá trước đó vào ${new Date(alreadyReviewed.review_date).toLocaleDateString('vi-VN')}. Không thể đánh giá lại.`);
    }

    // TẤT CẢ VALIDATION ĐÃ ĐẠT -> TIẾN HÀNH TẠO REVIEW & ĐỒNG BỘ CSDL CASSANDRA
    const review_id = uuidv4();
    const review_date = new Date();

    // Tính toán cập nhật rating summary
    let summary = (mockStore.room_rating_summary || []).find(s => s.hotel_id === hotel_id && s.room_id === room_id);
    let oldRatingSum = summary ? summary.rating_sum : 0;
    let oldReviewCount = summary ? summary.review_count : 0;

    const newRatingSum = oldRatingSum + parsedRating;
    const newReviewCount = oldReviewCount + 1;
    const newAverageRating = Math.round((newRatingSum / newReviewCount) * 10) / 10;

    const { isConnected, connectionMode } = getConnectionStatus();

    if (connectionMode !== 'MOCK' && isConnected) {
      // Thực thi BATCH trên Cassandra thật
      const batchQueries = [
        {
          query: `INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          params: [hotel_id, room_id, review_date, cassandra.types.Uuid.fromString(review_id), guest_id, cNum, parsedRating, comment]
        },
        {
          query: `INSERT INTO reviews_by_confirmation (confirm_number, review_id, hotel_id, room_id, guest_id, rating, review_date) 
                  VALUES (?, ?, ?, ?, ?, ?, ?);`,
          params: [cNum, cassandra.types.Uuid.fromString(review_id), hotel_id, room_id, guest_id, parsedRating, review_date]
        },
        {
          query: `INSERT INTO room_rating_summary (hotel_id, room_id, average_rating, review_count, rating_sum) 
                  VALUES (?, ?, ?, ?, ?);`,
          params: [hotel_id, room_id, newAverageRating, newReviewCount, newRatingSum]
        }
      ];
      await this.executeBatch(batchQueries);
    }

    // Cập nhật Mock Store đồng bộ
    const newReview = {
      hotel_id,
      room_id,
      review_date,
      review_id,
      guest_id,
      guest_name: `${guestExists.last_name} ${guestExists.first_name}`,
      confirm_number: cNum,
      rating: parsedRating,
      comment
    };
    mockStore.reviews_by_room.unshift(newReview);

    mockStore.reviews_by_confirmation.push({
      confirm_number: cNum,
      review_id,
      hotel_id,
      room_id,
      guest_id,
      rating: parsedRating,
      review_date
    });

    if (summary) {
      summary.average_rating = newAverageRating;
      summary.review_count = newReviewCount;
      summary.rating_sum = newRatingSum;
    } else {
      summary = {
        hotel_id,
        room_id,
        average_rating: newAverageRating,
        review_count: newReviewCount,
        rating_sum: newRatingSum
      };
      mockStore.room_rating_summary.push(summary);
    }

    // Cập nhật bảng xếp hạng rooms_by_hotel_rating
    let ratingRank = (mockStore.rooms_by_hotel_rating || []).find(r => r.hotel_id === hotel_id && r.room_id === room_id);
    if (ratingRank) {
      ratingRank.average_rating = newAverageRating;
      ratingRank.review_count = newReviewCount;
    }

    // Đồng bộ sang available_rooms_by_hotel_date
    (mockStore.available_rooms_by_hotel_date || []).forEach(r => {
      if (r.hotel_id === hotel_id && r.room_id === room_id) {
        r.average_rating = newAverageRating;
        r.review_count = newReviewCount;
      }
    });

    return {
      review: newReview,
      summary: {
        average_rating: newAverageRating,
        review_count: newReviewCount,
        rating_sum: newRatingSum
      }
    };
  }

  // ==============================================================================
  // MODULE ĐÁNH GIÁ KHÁCH SẠN TOÀN DIỆN (HOTEL REVIEWS & RATINGS)
  // ==============================================================================

  // 1. Tính toán lại hotel_rating_summary theo dữ liệu thật (chỉ tính review ACTIVE)
  async recalculateHotelRatingSummary(hotelId) {
    const activeReviews = (mockStore.hotel_reviews || []).filter(
      r => r.hotel_id === hotelId && r.status === 'ACTIVE'
    );

    const count = activeReviews.length;
    const ratingSum = activeReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    const averageRating = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 5.0;

    const count1 = activeReviews.filter(r => Number(r.rating) === 1).length;
    const count2 = activeReviews.filter(r => Number(r.rating) === 2).length;
    const count3 = activeReviews.filter(r => Number(r.rating) === 3).length;
    const count4 = activeReviews.filter(r => Number(r.rating) === 4).length;
    const count5 = activeReviews.filter(r => Number(r.rating) === 5).length;

    let summary = (mockStore.hotel_rating_summary || []).find(s => s.hotel_id === hotelId);
    if (summary) {
      summary.average_rating = averageRating;
      summary.review_count = count;
      summary.rating_sum = ratingSum;
      summary.count_1_star = count1;
      summary.count_2_star = count2;
      summary.count_3_star = count3;
      summary.count_4_star = count4;
      summary.count_5_star = count5;
    } else {
      summary = {
        hotel_id: hotelId,
        average_rating: averageRating,
        review_count: count,
        rating_sum: ratingSum,
        count_1_star: count1,
        count_2_star: count2,
        count_3_star: count3,
        count_4_star: count4,
        count_5_star: count5
      };
      if (!mockStore.hotel_rating_summary) mockStore.hotel_rating_summary = [];
      mockStore.hotel_rating_summary.push(summary);
    }

    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cql = `INSERT INTO hotel_rating_summary (hotel_id, average_rating, review_count, rating_sum, count_1_star, count_2_star, count_3_star, count_4_star, count_5_star)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        await this.execute(cql, [hotelId, averageRating, count, ratingSum, count1, count2, count3, count4, count5]);
      } catch (err) {
        console.warn('Lỗi cập nhật hotel_rating_summary trên Cassandra:', err.message);
      }
    }

    return this.getHotelRatingStats(hotelId);
  }

  // 2. Lấy thống kê chi tiết điểm đánh giá và phân bố sao của khách sạn
  getHotelRatingStats(hotelId) {
    let summary = (mockStore.hotel_rating_summary || []).find(s => s.hotel_id === hotelId);
    if (!summary) {
      const activeReviews = (mockStore.hotel_reviews || []).filter(
        r => r.hotel_id === hotelId && r.status === 'ACTIVE'
      );
      const count = activeReviews.length;
      const ratingSum = activeReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
      const averageRating = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 5.0;
      summary = {
        hotel_id: hotelId,
        average_rating: averageRating,
        review_count: count,
        rating_sum: ratingSum,
        count_1_star: activeReviews.filter(r => Number(r.rating) === 1).length,
        count_2_star: activeReviews.filter(r => Number(r.rating) === 2).length,
        count_3_star: activeReviews.filter(r => Number(r.rating) === 3).length,
        count_4_star: activeReviews.filter(r => Number(r.rating) === 4).length,
        count_5_star: activeReviews.filter(r => Number(r.rating) === 5).length
      };
    }

    const total = Number(summary.review_count) || 0;
    const c1 = Number(summary.count_1_star) || 0;
    const c2 = Number(summary.count_2_star) || 0;
    const c3 = Number(summary.count_3_star) || 0;
    const c4 = Number(summary.count_4_star) || 0;
    const c5 = Number(summary.count_5_star) || 0;

    return {
      hotel_id: hotelId,
      average_rating: Number(summary.average_rating) || 5.0,
      total_reviews: total,
      review_count: total,
      rating_sum: Number(summary.rating_sum) || 0,
      breakdown: {
        '1': c1,
        '2': c2,
        '3': c3,
        '4': c4,
        '5': c5
      },
      percentages: {
        '1': total > 0 ? Math.round((c1 / total) * 1000) / 10 : 0,
        '2': total > 0 ? Math.round((c2 / total) * 1000) / 10 : 0,
        '3': total > 0 ? Math.round((c3 / total) * 1000) / 10 : 0,
        '4': total > 0 ? Math.round((c4 / total) * 1000) / 10 : 0,
        '5': total > 0 ? Math.round((c5 / total) * 1000) / 10 : 0
      }
    };
  }

  // 3. Lấy danh sách đánh giá của khách sạn (lọc theo số sao, sắp xếp, phân trang)
  async getHotelReviews(hotelId, options = {}) {
    const {
      star,
      sort = 'newest',
      page = 1,
      limit = 10,
      status = 'ACTIVE'
    } = options;

    let reviews = (mockStore.hotel_reviews || []).filter(r => r.hotel_id === hotelId);

    // Lọc theo trạng thái kiểm duyệt (mặc định chỉ lấy review ACTIVE đối với khách công khai)
    if (status !== 'ALL') {
      reviews = reviews.filter(r => r.status === status);
    }

    // Lọc theo số sao nếu người dùng chọn
    if (star !== undefined && star !== null && star !== '' && star !== 'ALL') {
      const starNum = parseInt(star, 10);
      if (!isNaN(starNum)) {
        reviews = reviews.filter(r => Number(r.rating) === starNum);
      }
    }

    // Sắp xếp
    reviews = reviews.slice().sort((a, b) => {
      const dateA = new Date(a.created_at || a.review_date || 0).getTime();
      const dateB = new Date(b.created_at || b.review_date || 0).getTime();

      if (sort === 'oldest') {
        return dateA - dateB;
      }
      if (sort === 'highest') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return dateB - dateA;
      }
      if (sort === 'lowest') {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return dateB - dateA;
      }
      // Mặc định: newest (mới nhất xếp trước)
      return dateB - dateA;
    });

    const total = reviews.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const pagedReviews = reviews.slice(offset, offset + limitNum);

    const stats = this.getHotelRatingStats(hotelId);

    return {
      hotel_id: hotelId,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum) || 1,
      stats,
      data: pagedReviews
    };
  }

  // 4. Lấy chi tiết một đánh giá theo review_id
  async getHotelReviewById(reviewId) {
    if (!reviewId) return null;
    const rev = (mockStore.hotel_reviews_by_id || []).find(
      r => String(r.review_id).toLowerCase() === String(reviewId).toLowerCase()
    );
    return rev || null;
  }

  // 5. Kiểm tra quyền đánh giá đơn đặt phòng của người dùng (Eligibility Check)
  async checkReviewEligibility(bookingId, guestId) {
    if (!bookingId) {
      return { eligible: false, reason: 'Mã đặt phòng không được để trống.' };
    }
    if (!guestId) {
      return { eligible: false, reason: 'Vui lòng đăng nhập để thực hiện đánh giá.' };
    }

    // Tìm booking trong bookings_by_guest hoặc bookings_by_hotel_date
    const bIdStr = String(bookingId).toLowerCase();
    const guestBooking = (mockStore.bookings_by_guest || []).find(
      b => String(b.booking_id).toLowerCase() === bIdStr || String(b.confirm_number) === bIdStr
    ) || (mockStore.bookings_by_hotel_date || []).find(
      b => String(b.booking_id).toLowerCase() === bIdStr || String(b.confirm_number) === bIdStr
    );

    if (!guestBooking) {
      return { eligible: false, reason: 'Không tìm thấy thông tin đơn đặt phòng trong hệ thống.' };
    }

    // 1. Kiểm tra booking thuộc đúng user
    if (!guestBooking.guest_id || guestBooking.guest_id.toLowerCase() !== guestId.toLowerCase()) {
      return { eligible: false, reason: 'Đơn đặt phòng này không thuộc về tài khoản của bạn.' };
    }

    // 2. Không được review booking bị hủy
    if (guestBooking.status === 'CANCELLED') {
      return { eligible: false, reason: 'Đơn đặt phòng đã bị hủy, không thể đánh giá.' };
    }

    // 3. Chỉ được review khi booking đã hoàn thành lưu trú (CHECKED_OUT hoặc COMPLETED)
    const isCompleted = guestBooking.status === 'CHECKED_OUT' || guestBooking.status === 'COMPLETED';
    if (!isCompleted) {
      return {
        eligible: false,
        reason: `Bạn chỉ có thể đánh giá sau khi hoàn thành kỳ nghỉ và đã Check-out. Trạng thái hiện tại: ${guestBooking.status}.`
      };
    }

    // 4. Mỗi booking chỉ được đánh giá một lần (Chống đánh giá trùng lặp)
    const canonicalBookingId = String(guestBooking.booking_id);
    const existingEntry = (mockStore.reviews_by_booking || []).find(
      r => String(r.booking_id).toLowerCase() === canonicalBookingId.toLowerCase()
    );

    if (existingEntry) {
      const existingReview = (mockStore.hotel_reviews_by_id || []).find(
        r => String(r.review_id).toLowerCase() === String(existingEntry.review_id).toLowerCase()
      );
      return {
        eligible: false,
        already_reviewed: true,
        reason: 'Đơn đặt phòng này đã được đánh giá trước đó. Bạn có thể xem hoặc chỉnh sửa đánh giá của mình.',
        existing_review: existingReview
      };
    }

    return {
      eligible: true,
      booking: guestBooking
    };
  }

  // 6. Tạo đánh giá khách sạn mới
  async createHotelReview({ hotel_id, booking_id, user_id, rating, comment }) {
    // 1. Validate rating 1 - 5
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('Điểm đánh giá không hợp lệ. Vui lòng chọn từ 1 đến 5 sao.');
    }

    // 2. Validate comment
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      throw new Error('Nội dung nhận xét không được để trống.');
    }
    const cleanComment = comment.trim();
    if (cleanComment.length < 10) {
      throw new Error('Nội dung nhận xét quá ngắn. Vui lòng nhập tối thiểu 10 ký tự.');
    }
    if (cleanComment.length > 2000) {
      throw new Error('Nội dung nhận xét quá dài. Vui lòng nhập tối đa 2000 ký tự.');
    }

    // 3. Kiểm tra quyền hạn & trạng thái booking
    const eligibility = await this.checkReviewEligibility(booking_id, user_id);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    const booking = eligibility.booking;
    const actualHotelId = hotel_id || booking.hotel_id;

    // 4. Chống gửi review trùng lặp (Concurrency Safe)
    const canonicalBookingId = String(booking.booking_id);
    const alreadyExists = (mockStore.reviews_by_booking || []).some(
      r => String(r.booking_id).toLowerCase() === canonicalBookingId.toLowerCase()
    );
    if (alreadyExists) {
      throw new Error('Đơn đặt phòng này đã được đánh giá trước đó. Không thể gửi thêm đánh giá.');
    }

    // Lấy thông tin user
    const guest = (mockStore.guests || []).find(g => g.guest_id.toLowerCase() === user_id.toLowerCase());
    const userName = guest ? `${guest.last_name} ${guest.first_name}` : (booking.guest_name || user_id);
    const userAvatar = guest?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

    const review_id = uuidv4();
    const now = new Date();
    const stayDateText = `${booking.check_in_date} - ${booking.check_out_date}`;

    const newReview = {
      hotel_id: actualHotelId,
      review_id,
      user_id,
      user_name: userName,
      user_avatar: userAvatar,
      booking_id: canonicalBookingId,
      confirm_number: booking.confirm_number || null,
      room_number: booking.room_number || null,
      room_type: booking.room_type || 'Phòng nghỉ',
      rating: parsedRating,
      comment: cleanComment,
      status: 'ACTIVE',
      is_verified_stay: true,
      stay_date: stayDateText,
      created_at: now,
      updated_at: now
    };

    // Lưu vào mockStore
    if (!mockStore.hotel_reviews) mockStore.hotel_reviews = [];
    if (!mockStore.hotel_reviews_by_id) mockStore.hotel_reviews_by_id = [];
    if (!mockStore.reviews_by_booking) mockStore.reviews_by_booking = [];

    mockStore.hotel_reviews.unshift(newReview);
    mockStore.hotel_reviews_by_id.unshift(newReview);
    mockStore.reviews_by_booking.push({
      booking_id: canonicalBookingId,
      review_id,
      hotel_id: actualHotelId,
      user_id,
      rating: parsedRating,
      created_at: now
    });

    // Thực thi trên Cassandra nếu có kết nối
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const batchQueries = [
          {
            query: `INSERT INTO hotel_reviews (hotel_id, review_id, user_id, user_name, user_avatar, booking_id, confirm_number, room_number, room_type, rating, comment, status, is_verified_stay, stay_date, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            params: [
              actualHotelId,
              cassandra.types.Uuid.fromString(review_id),
              user_id,
              userName,
              userAvatar,
              canonicalBookingId,
              booking.confirm_number || null,
              booking.room_number || null,
              booking.room_type || 'Phòng nghỉ',
              parsedRating,
              cleanComment,
              'ACTIVE',
              true,
              stayDateText,
              now,
              now
            ]
          },
          {
            query: `INSERT INTO hotel_reviews_by_id (review_id, hotel_id, user_id, booking_id, confirm_number, rating, comment, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            params: [
              cassandra.types.Uuid.fromString(review_id),
              actualHotelId,
              user_id,
              canonicalBookingId,
              booking.confirm_number || null,
              parsedRating,
              cleanComment,
              'ACTIVE',
              now,
              now
            ]
          },
          {
            query: `INSERT INTO reviews_by_booking (booking_id, review_id, hotel_id, user_id, rating, created_at)
                    VALUES (?, ?, ?, ?, ?, ?);`,
            params: [
              canonicalBookingId,
              cassandra.types.Uuid.fromString(review_id),
              actualHotelId,
              user_id,
              parsedRating,
              now
            ]
          }
        ];
        await this.executeBatch(batchQueries);
      } catch (err) {
        console.warn('Lỗi ghi hotel_reviews lên Cassandra cluster:', err.message);
      }
    }

    // Tự động tính toán lại hotel_rating_summary
    const summary = await this.recalculateHotelRatingSummary(actualHotelId);

    return {
      review: newReview,
      summary
    };
  }

  // 7. Sửa đánh giá (Chỉ cho phép chính người dùng sở hữu review chỉnh sửa)
  async updateHotelReview({ review_id, user_id, rating, comment }) {
    if (!review_id) {
      throw new Error('Mã đánh giá không hợp lệ.');
    }

    const review = await this.getHotelReviewById(review_id);
    if (!review) {
      throw new Error(`Không tìm thấy đánh giá với ID: ${review_id}`);
    }

    // Kiểm tra authorization: chỉ chính chủ mới được sửa
    if (!review.user_id || review.user_id.toLowerCase() !== (user_id || '').toLowerCase()) {
      throw new Error('Bạn không có quyền chỉnh sửa đánh giá của người dùng khác.');
    }

    // Validate rating
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new Error('Điểm đánh giá không hợp lệ. Vui lòng chọn từ 1 đến 5 sao.');
    }

    // Validate comment
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      throw new Error('Nội dung nhận xét không được để trống.');
    }
    const cleanComment = comment.trim();
    if (cleanComment.length < 10) {
      throw new Error('Nội dung nhận xét quá ngắn. Vui lòng nhập tối thiểu 10 ký tự.');
    }
    if (cleanComment.length > 2000) {
      throw new Error('Nội dung nhận xét quá dài. Vui lòng nhập tối đa 2000 ký tự.');
    }

    const now = new Date();
    review.rating = parsedRating;
    review.comment = cleanComment;
    review.updated_at = now;

    // Cập nhật cả trong hotel_reviews
    const inHotelList = (mockStore.hotel_reviews || []).find(
      r => String(r.review_id).toLowerCase() === String(review_id).toLowerCase()
    );
    if (inHotelList) {
      inHotelList.rating = parsedRating;
      inHotelList.comment = cleanComment;
      inHotelList.updated_at = now;
    }

    // Cập nhật trong reviews_by_booking
    const inBooking = (mockStore.reviews_by_booking || []).find(
      r => String(r.review_id).toLowerCase() === String(review_id).toLowerCase()
    );
    if (inBooking) {
      inBooking.rating = parsedRating;
    }

    // Cập nhật Cassandra
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cqlId = cassandra.types.Uuid.fromString(review_id.toString());
        await this.execute(
          `UPDATE hotel_reviews SET rating = ?, comment = ?, updated_at = ? WHERE hotel_id = ? AND review_id = ?;`,
          [parsedRating, cleanComment, now, review.hotel_id, cqlId]
        );
        await this.execute(
          `UPDATE hotel_reviews_by_id SET rating = ?, comment = ?, updated_at = ? WHERE review_id = ?;`,
          [parsedRating, cleanComment, now, cqlId]
        );
      } catch (err) {
        console.warn('Lỗi cập nhật review trên Cassandra:', err.message);
      }
    }

    // Cập nhật lại rating summary
    const summary = await this.recalculateHotelRatingSummary(review.hotel_id);

    return {
      review,
      summary
    };
  }

  // 8. Xóa đánh giá (Chỉ cho phép chính người dùng sở hữu review xóa)
  async deleteHotelReview({ review_id, user_id }) {
    if (!review_id) {
      throw new Error('Mã đánh giá không hợp lệ.');
    }

    const review = await this.getHotelReviewById(review_id);
    if (!review) {
      throw new Error(`Không tìm thấy đánh giá với ID: ${review_id}`);
    }

    // Kiểm tra authorization: chỉ chính chủ mới được xóa
    if (!review.user_id || review.user_id.toLowerCase() !== (user_id || '').toLowerCase()) {
      throw new Error('Bạn không có quyền xóa đánh giá của người dùng khác.');
    }

    const hotelId = review.hotel_id;
    const rIdStr = String(review_id).toLowerCase();

    // Xóa khỏi mockStore
    mockStore.hotel_reviews = (mockStore.hotel_reviews || []).filter(
      r => String(r.review_id).toLowerCase() !== rIdStr
    );
    mockStore.hotel_reviews_by_id = (mockStore.hotel_reviews_by_id || []).filter(
      r => String(r.review_id).toLowerCase() !== rIdStr
    );
    mockStore.reviews_by_booking = (mockStore.reviews_by_booking || []).filter(
      r => String(r.review_id).toLowerCase() !== rIdStr
    );

    // Xóa trên Cassandra
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cqlId = cassandra.types.Uuid.fromString(review_id.toString());
        await this.execute(`DELETE FROM hotel_reviews WHERE hotel_id = ? AND review_id = ?;`, [hotelId, cqlId]);
        await this.execute(`DELETE FROM hotel_reviews_by_id WHERE review_id = ?;`, [cqlId]);
        if (review.booking_id) {
          await this.execute(`DELETE FROM reviews_by_booking WHERE booking_id = ?;`, [review.booking_id]);
        }
      } catch (err) {
        console.warn('Lỗi xóa review trên Cassandra:', err.message);
      }
    }

    // Cập nhật lại rating summary sau khi xóa
    const summary = await this.recalculateHotelRatingSummary(hotelId);

    return {
      success: true,
      message: 'Đã xóa đánh giá thành công.',
      deleted_review_id: review_id,
      summary
    };
  }

  // 9. Lấy danh sách đánh giá toàn hệ thống cho Admin (tìm kiếm, lọc khách sạn/sao/trạng thái)
  async getAdminReviews(options = {}) {
    const {
      search = '',
      hotelId = '',
      star = '',
      status = 'ALL',
      page = 1,
      limit = 15
    } = options;

    let reviews = [...(mockStore.hotel_reviews_by_id || mockStore.hotel_reviews || [])];

    // Lọc theo hotelId
    if (hotelId && hotelId !== 'ALL') {
      reviews = reviews.filter(r => r.hotel_id === hotelId);
    }

    // Lọc theo star
    if (star && star !== 'ALL') {
      const sNum = parseInt(star, 10);
      if (!isNaN(sNum)) {
        reviews = reviews.filter(r => Number(r.rating) === sNum);
      }
    }

    // Lọc theo status
    if (status && status !== 'ALL') {
      reviews = reviews.filter(r => (r.status || 'ACTIVE').toUpperCase() === status.toUpperCase());
    }

    // Tìm kiếm theo từ khóa
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      reviews = reviews.filter(r => {
        const matchComment = r.comment && r.comment.toLowerCase().includes(q);
        const matchUser = (r.user_name && r.user_name.toLowerCase().includes(q)) || (r.user_id && r.user_id.toLowerCase().includes(q));
        const matchBooking = r.booking_id && r.booking_id.toLowerCase().includes(q);
        const matchHotel = r.hotel_id && r.hotel_id.toLowerCase().includes(q);
        return matchComment || matchUser || matchBooking || matchHotel;
      });
    }

    // Sắp xếp mới nhất trước
    reviews.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    // Bổ sung tên khách sạn
    reviews = reviews.map(r => {
      const hotel = (mockStore.hotels || []).find(h => h.hotel_id === r.hotel_id);
      return {
        ...r,
        hotel_name: hotel ? hotel.name : (r.hotel_name || r.hotel_id)
      };
    });

    const total = reviews.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;
    const pagedData = reviews.slice(offset, offset + limitNum);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum) || 1,
      data: pagedData
    };
  }

  // 10. Admin cập nhật trạng thái kiểm duyệt (ACTIVE | HIDDEN) - Không cho sửa nội dung
  async updateReviewStatus(reviewId, status) {
    const validStatuses = ['ACTIVE', 'HIDDEN'];
    const normStatus = (status || '').toUpperCase();
    if (!validStatuses.includes(normStatus)) {
      throw new Error('Trạng thái kiểm duyệt không hợp lệ. Phải là ACTIVE hoặc HIDDEN.');
    }

    const review = await this.getHotelReviewById(reviewId);
    if (!review) {
      throw new Error(`Không tìm thấy đánh giá với ID: ${reviewId}`);
    }

    review.status = normStatus;
    review.updated_at = new Date();

    const inHotelList = (mockStore.hotel_reviews || []).find(
      r => String(r.review_id).toLowerCase() === String(reviewId).toLowerCase()
    );
    if (inHotelList) {
      inHotelList.status = normStatus;
      inHotelList.updated_at = new Date();
    }

    // Cassandra UPDATE status
    const { isConnected, connectionMode } = getConnectionStatus();
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const cqlId = cassandra.types.Uuid.fromString(reviewId.toString());
        await this.execute(
          `UPDATE hotel_reviews SET status = ?, updated_at = ? WHERE hotel_id = ? AND review_id = ?;`,
          [normStatus, new Date(), review.hotel_id, cqlId]
        );
        await this.execute(
          `UPDATE hotel_reviews_by_id SET status = ?, updated_at = ? WHERE review_id = ?;`,
          [normStatus, new Date(), cqlId]
        );
      } catch (err) {
        console.warn('Lỗi cập nhật trạng thái review trên Cassandra:', err.message);
      }
    }

    // Tính toán lại rating summary (chỉ tính review ACTIVE)
    const summary = await this.recalculateHotelRatingSummary(review.hotel_id);

    return {
      review,
      summary,
      message: `Đã chuyển trạng thái đánh giá thành ${normStatus === 'ACTIVE' ? 'Hiển thị' : 'Đã ẩn'}.`
    };
  }

  // 11. Thống kê xếp hạng và nhận xét tiêu biểu toàn hệ thống (Dành cho trang About AstraStay)
  async getSystemRatingSummary() {
    const { isConnected, connectionMode } = getConnectionStatus();

    let summaries = [...(mockStore.hotel_rating_summary || [])];
    if (connectionMode !== 'MOCK' && isConnected) {
      try {
        const rs = await this.execute(`SELECT * FROM hotel_rating_summary;`);
        if (rs && rs.rows && rs.rows.length > 0) {
          summaries = rs.rows;
        }
      } catch (err) {
        console.warn('Lỗi đọc hotel_rating_summary từ Cassandra:', err.message);
      }
    }

    let totalReviews = 0;
    let weightedRatingSum = 0;
    let dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    summaries.forEach(s => {
      const count = Number(s.review_count || 0);
      const avg = Number(s.average_rating || 0);
      if (count > 0) {
        totalReviews += count;
        weightedRatingSum += avg * count;
      }
      dist['1'] += Number(s.star_1_count ?? s.count_1_star ?? 0);
      dist['2'] += Number(s.star_2_count ?? s.count_2_star ?? 0);
      dist['3'] += Number(s.star_3_count ?? s.count_3_star ?? 0);
      dist['4'] += Number(s.star_4_count ?? s.count_4_star ?? 0);
      dist['5'] += Number(s.star_5_count ?? s.count_5_star ?? 0);
    });

    const averageRating = totalReviews > 0
      ? Math.round((weightedRatingSum / totalReviews) * 10) / 10
      : 5.0;

    const positiveReviews = dist['4'] + dist['5'];
    const satisfactionRate = totalReviews > 0
      ? Math.round((positiveReviews / totalReviews) * 100)
      : 100;

    // Lấy 3 review tiêu biểu có trạng thái ACTIVE
    const allReviews = (mockStore.hotel_reviews_by_id || mockStore.hotel_reviews || [])
      .filter(r => (r.status || 'ACTIVE').toUpperCase() === 'ACTIVE');

    // Sắp xếp ưu tiên: rating cao nhất, sau đó đến ngày mới nhất
    allReviews.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      const dateA = new Date(a.created_at || a.review_date || 0).getTime();
      const dateB = new Date(b.created_at || b.review_date || 0).getTime();
      return dateB - dateA;
    });

    const featuredReviews = allReviews.slice(0, 3).map(r => {
      const hotel = (mockStore.hotels || []).find(h => h.hotel_id === r.hotel_id);
      return {
        review_id: r.review_id,
        hotel_id: r.hotel_id,
        hotel_name: r.hotel_name || hotel?.name || 'Khách Sạn AstraStay',
        room_number: r.room_number || '',
        room_type: r.room_type || 'Phòng Nghỉ Dưỡng',
        guest_name: r.user_name || r.guest_name || 'Khách Lưu Trú',
        guest_avatar: r.user_avatar || r.guest_avatar || null,
        rating: Number(r.rating || 5),
        comment: r.comment,
        stay_date: r.stay_date || 'Gần đây',
        created_at: r.created_at || r.review_date,
        is_verified_stay: r.is_verified_stay !== false,
        status: r.status || 'ACTIVE'
      };
    });

    const totalHotels = (mockStore.hotels || []).length;

    return {
      average_rating: averageRating,
      review_count: totalReviews,
      star_distribution: dist,
      satisfaction_rate: satisfactionRate,
      total_hotels: totalHotels,
      featured_reviews: featuredReviews
    };
  }
}

module.exports = new CassandraService();


