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

    // 9. Nạp available_rooms_by_hotel_date
    console.log('-> Nạp bảng available_rooms_by_hotel_date...');
    for (const ar of (mockStore.available_rooms_by_hotel_date || [])) {
      await client.execute(
        'INSERT INTO available_rooms_by_hotel_date (hotel_id, start_date, room_number, room_id, room_type, price, is_available, average_rating, review_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [ar.hotel_id, ar.start_date, ar.room_number, ar.room_id, ar.room_type, ar.price, ar.is_available, ar.average_rating, ar.review_count],
        { prepare: true }
      );
    }

    // 10. Nạp reviews_by_room
    console.log('-> Nạp bảng reviews_by_room...');
    for (const rev of (mockStore.reviews_by_room || [])) {
      await client.execute(
        'INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [rev.hotel_id, rev.room_id, rev.review_date, rev.review_id, rev.guest_id, rev.confirm_number, rev.rating, rev.comment],
        { prepare: true }
      );
    }

    // 11. Nạp room_rating_summary
    console.log('-> Nạp bảng room_rating_summary...');
    for (const rs of (mockStore.room_rating_summary || [])) {
      await client.execute(
        'INSERT INTO room_rating_summary (hotel_id, room_id, average_rating, review_count, rating_sum) VALUES (?, ?, ?, ?, ?);',
        [rs.hotel_id, rs.room_id, rs.average_rating, rs.review_count, rs.rating_sum],
        { prepare: true }
      );
    }

    // 12. Nạp rooms_by_hotel_rating
    console.log('-> Nạp bảng rooms_by_hotel_rating...');
    for (const rr of (mockStore.rooms_by_hotel_rating || [])) {
      await client.execute(
        'INSERT INTO rooms_by_hotel_rating (hotel_id, average_rating, room_id, room_number, room_type, review_count, price_per_night) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [rr.hotel_id, rr.average_rating, rr.room_id, rr.room_number, rr.room_type, rr.review_count, rr.price_per_night],
        { prepare: true }
      );
    }

    // 13. Nạp reviews_by_confirmation
    console.log('-> Nạp bảng reviews_by_confirmation...');
    for (const rc of (mockStore.reviews_by_confirmation || [])) {
      await client.execute(
        'INSERT INTO reviews_by_confirmation (confirm_number, review_id, hotel_id, room_id, guest_id, rating, review_date) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [rc.confirm_number, rc.review_id, rc.hotel_id, rc.room_id, rc.guest_id, rc.rating, rc.review_date],
        { prepare: true }
      );
    }

    // 14. Nạp featured_reviews
    console.log('-> Nạp bảng featured_reviews...');
    for (const fr of (mockStore.featured_reviews || [])) {
      await client.execute(
        'INSERT INTO featured_reviews (hotel_id, rating, review_id, guest_id, guest_name, guest_avatar, hotel_name, room_id, room_number, room_type, comment, review_date, is_featured, helpful_count, stay_date, badge_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [fr.hotel_id, fr.rating, fr.review_id, fr.guest_id, fr.guest_name, fr.guest_avatar, fr.hotel_name, fr.room_id, fr.room_number, fr.room_type, fr.comment, fr.review_date, fr.is_featured, fr.helpful_count, fr.stay_date, fr.badge_title],
        { prepare: true }
      );
    // 15. Nạp reservations_by_confirmation (Q6)
    console.log('-> Nạp bảng reservations_by_confirmation (Q6)...');
    for (const r of (mockStore.reservations_by_confirmation || [])) {
      try {
        await client.execute(
          'INSERT INTO reservations_by_confirmation (confirm_number, hotel_id, room_id, start_date, end_date, guest_id) VALUES (?, ?, ?, ?, ?, ?);',
          [r.confirm_number, r.hotel_id, r.room_id, r.start_date, r.end_date, r.guest_id],
          { prepare: true }
        );
      } catch (e) {
        // Skip duplicate or format warning
      }
    }

    // 16. Nạp reservations_by_guest (Q8)
    console.log('-> Nạp bảng reservations_by_guest (Q8)...');
    for (const r of (mockStore.reservations_by_guest || [])) {
      try {
        await client.execute(
          'INSERT INTO reservations_by_guest (guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [r.guest_last_name, r.hotel_id, r.guest_id, r.room_id, r.start_date, r.end_date, r.confirm_number],
          { prepare: true }
        );
      } catch (e) {
        // Skip duplicate or format warning
      }
    }

    console.log('\n Đã nạp thành công toàn bộ dữ liệu mẫu mở rộng (Q1-Q9) lên Astra DB!');
  } catch (err) {
    console.error('\n Lỗi khi nạp dữ liệu mẫu:', err);
  } finally {
    if (client) await client.shutdown();
    process.exit(0);
  }
}

seedDatabase();
