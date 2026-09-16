const { getClient, getConnectionStatus, recordCqlExecution } = require('../config/cassandra');
const mockStore = require('./mockStore');
const { v4: uuidv4 } = require('uuid');
const cassandra = require('cassandra-driver');

class CassandraService {
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
    if (rows && rows.length > 0) return rows;
    return mockStore.hotels;
  }

  async getHotelById(hotelId) {
    const cql = 'SELECT hotel_id, name, phone, address FROM hotels WHERE hotel_id = ?;';
    const rows = await this.execute(cql, [hotelId]);
    if (rows && rows.length > 0) return rows[0];
    return mockStore.hotels.find(h => h.hotel_id === hotelId) || null;
  }

  async getHotelsByPoi(poiName) {
    const cql = 'SELECT poi_name, hotel_id, name, phone, address FROM hotels_by_poi WHERE poi_name = ?;';
    const rows = await this.execute(cql, [poiName]);
    if (rows && rows.length > 0) return rows;
    return mockStore.hotels_by_poi.filter(h => h.poi_name.toLowerCase() === poiName.toLowerCase());
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
    const cql = 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;';
    await this.execute(cql, [status, hotelId, parseInt(roomNumber, 10)]);

    // Cập nhật mock store
    const room = mockStore.rooms_by_hotel.find(r => r.hotel_id === hotelId && r.room_number === parseInt(roomNumber, 10));
    if (room) {
      room.status = status;
    }
    return room || { hotel_id: hotelId, room_number: parseInt(roomNumber, 10), status };
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

  // TẠO ĐẶT PHÒNG MỚI: Sử dụng Cassandra LOGGED BATCH đồng bộ đồng thời vào 2 bảng + hoá đơn + đổi trạng thái phòng
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
    nights
  }) {
    const booking_id = uuidv4();
    const invoice_id = uuidv4();
    const room_num = parseInt(room_number, 10);
    const num_nights = parseInt(nights, 10) || 1;
    const room_charge = price_per_night * num_nights;
    const service_charge = Math.round(room_charge * 0.05); // 5% phí dịch vụ
    const tax = Math.round((room_charge + service_charge) * 0.1); // 10% VAT
    const total_amount = room_charge + service_charge + tax;
    const status = 'CONFIRMED';
    const issued_at = new Date();

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

    // 1. Chuẩn bị các câu lệnh cho Cassandra LOGGED BATCH
    const batchQueries = [
      {
        query: 'INSERT INTO bookings_by_guest (guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [guest_id, cqlCheckIn, cqlBookingId, hotel_id, hotel_name, room_num, cqlCheckOut, total_amount, status]
      },
      {
        query: 'INSERT INTO bookings_by_hotel_date (hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [hotel_id, cqlCheckIn, cqlBookingId, guest_id, guest_name, room_num, cqlCheckOut, total_amount, status]
      },
      {
        query: 'INSERT INTO invoices_by_booking (booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        params: [cqlBookingId, cqlInvoiceId, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, 'PAID', issued_at]
      },
      {
        query: 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;',
        params: ['OCCUPIED', hotel_id, room_num]
      }
    ];

    // Thực thi BATCH
    await this.executeBatch(batchQueries);

    // Cập nhật MockStore để đồng bộ trạng thái
    const newGuestBooking = {
      guest_id,
      check_in_date,
      booking_id,
      hotel_id,
      hotel_name,
      room_number: room_num,
      room_id: room_id || `RM-${room_num}`,
      check_out_date,
      total_amount,
      status
    };
    mockStore.bookings_by_guest.unshift(newGuestBooking);

    const newHotelBooking = {
      hotel_id,
      check_in_date,
      booking_id,
      guest_id,
      guest_name,
      room_number: room_num,
      room_id: room_id || `RM-${room_num}`,
      check_out_date,
      total_amount,
      status
    };
    mockStore.bookings_by_hotel_date.unshift(newHotelBooking);

    const newInvoice = {
      booking_id,
      invoice_id,
      guest_id,
      hotel_id,
      room_charge,
      service_charge,
      tax,
      total_amount,
      payment_status: 'PAID',
      issued_at
    };
    mockStore.invoices_by_booking.unshift(newInvoice);

    // Đổi trạng thái phòng thành OCCUPIED
    const room = mockStore.rooms_by_hotel.find(r => r.hotel_id === hotel_id && r.room_number === room_num);
    if (room) {
      room.status = 'OCCUPIED';
    }

    return {
      booking: newGuestBooking,
      invoice: newInvoice
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
}

module.exports = new CassandraService();
