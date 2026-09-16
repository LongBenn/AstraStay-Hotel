const path = require('path');
const { initCassandraClient, getClient, getConnectionStatus } = require('../config/cassandra');
const mockStore = require('../services/mockStore');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seedDatabase() {
  console.log('=====================================================');
  console.log('NẠP DỮ LIỆU MẪU CASSANDRA TỪ HOTEL.CQL & TÀI LIỆU PDF');
  console.log('=====================================================');

  await initCassandraClient();
  const { connectionMode } = getConnectionStatus();
  const client = getClient();

  if (connectionMode === 'MOCK' || !client) {
    console.log('[Seed] Đang ở chế độ Mock Engine. Dữ liệu mẫu đã sẵn sàng trong RAM.');
    process.exit(0);
  }

  try {
    // 1. Nạp hotels
    console.log('-> Nạp bảng hotels...');
    for (const h of mockStore.hotels) {
      await client.execute(
        'INSERT INTO hotels (hotel_id, name, phone, address) VALUES (?, ?, ?, ?) IF NOT EXISTS;',
        [h.hotel_id, h.name, h.phone, h.address],
        { prepare: true }
      );
    }

    // 2. Nạp hotels_by_poi
    console.log('-> Nạp bảng hotels_by_poi...');
    for (const p of mockStore.hotels_by_poi) {
      await client.execute(
        'INSERT INTO hotels_by_poi (poi_name, hotel_id, name, phone, address) VALUES (?, ?, ?, ?, ?) IF NOT EXISTS;',
        [p.poi_name, p.hotel_id, p.name, p.phone, p.address],
        { prepare: true }
      );
    }

    // 3. Nạp pois_by_hotel
    console.log('-> Nạp bảng pois_by_hotel...');
    for (const p of mockStore.pois_by_hotel) {
      await client.execute(
        'INSERT INTO pois_by_hotel (hotel_id, poi_name, description) VALUES (?, ?, ?) IF NOT EXISTS;',
        [p.hotel_id, p.poi_name, p.description],
        { prepare: true }
      );
    }

    // 4. Nạp rooms_by_hotel
    console.log('-> Nạp bảng rooms_by_hotel...');
    for (const r of mockStore.rooms_by_hotel) {
      await client.execute(
        'INSERT INTO rooms_by_hotel (hotel_id, room_number, room_type, price_per_night, status) VALUES (?, ?, ?, ?, ?) IF NOT EXISTS;',
        [r.hotel_id, r.room_number, r.room_type, r.price_per_night, r.status],
        { prepare: true }
      );
    }

    // 5. Nạp amenities_by_room
    console.log('-> Nạp bảng amenities_by_room...');
    for (const a of mockStore.amenities_by_room) {
      await client.execute(
        'INSERT INTO amenities_by_room (hotel_id, room_id, amenity_name, description, rate) VALUES (?, ?, ?, ?, ?) IF NOT EXISTS;',
        [a.hotel_id, a.room_id, a.amenity_name, a.description, a.rate],
        { prepare: true }
      );
    }

    // 6. Nạp guests
    console.log('-> Nạp bảng guests...');
    for (const g of mockStore.guests) {
      await client.execute(
        'INSERT INTO guests (guest_id, first_name, last_name, email, phone_numbers, addresses) VALUES (?, ?, ?, ?, ?, ?) IF NOT EXISTS;',
        [g.guest_id, g.first_name, g.last_name, g.email, g.phone_numbers, g.addresses],
        { prepare: true }
      );
    }

    // 7. Nạp bookings_by_guest & bookings_by_hotel_date (dùng Batch để đồng bộ)
    console.log('-> Nạp dữ liệu đặt phòng (Bookings BATCH)...');
    for (let i = 0; i < mockStore.bookings_by_guest.length; i++) {
      const bg = mockStore.bookings_by_guest[i];
      const bh = mockStore.bookings_by_hotel_date[i];
      if (bg && bh) {
        const batchQueries = [
          {
            query: 'INSERT INTO bookings_by_guest (guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            params: [bg.guest_id, bg.check_in_date, bg.booking_id, bg.hotel_id, bg.hotel_name, bg.room_number, bg.check_out_date, bg.total_amount, bg.status]
          },
          {
            query: 'INSERT INTO bookings_by_hotel_date (hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            params: [bh.hotel_id, bh.check_in_date, bh.booking_id, bh.guest_id, bh.guest_name, bh.room_number, bh.check_out_date, bh.total_amount, bh.status]
          }
        ];
        await client.batch(batchQueries, { prepare: true, logged: true });
      }
    }

    // 8. Nạp invoices_by_booking
    console.log('-> Nạp bảng invoices_by_booking...');
    for (const inv of mockStore.invoices_by_booking) {
      await client.execute(
        'INSERT INTO invoices_by_booking (booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [inv.booking_id, inv.invoice_id, inv.guest_id, inv.hotel_id, inv.room_charge, inv.service_charge, inv.tax, inv.total_amount, inv.payment_status, inv.issued_at],
        { prepare: true }
      );
    }

    console.log('\n Đã nạp thành công toàn bộ dữ liệu mẫu mở rộng lên Astra DB!');
  } catch (err) {
    console.error('\n Lỗi khi nạp dữ liệu mẫu:', err);
  } finally {
    if (client) await client.shutdown();
    process.exit(0);
  }
}

seedDatabase();
