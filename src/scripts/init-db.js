const path = require('path');
const fs = require('fs');
const { initCassandraClient, getClient, getConnectionStatus } = require('../config/cassandra');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const schemaStatements = [
  // 1. hotels
  `CREATE TABLE IF NOT EXISTS hotels (
    hotel_id text,
    name text,
    phone text,
    address text,
    PRIMARY KEY (hotel_id)
  );`,

  // 2. hotels_by_poi
  `CREATE TABLE IF NOT EXISTS hotels_by_poi (
    poi_name text,
    hotel_id text,
    name text,
    phone text,
    address text,
    PRIMARY KEY (poi_name, hotel_id)
  );`,

  // 3. pois_by_hotel
  `CREATE TABLE IF NOT EXISTS pois_by_hotel (
    hotel_id text,
    poi_name text,
    description text,
    PRIMARY KEY (hotel_id, poi_name)
  );`,

  // 4. rooms_by_hotel
  `CREATE TABLE IF NOT EXISTS rooms_by_hotel (
    hotel_id text,
    room_number int,
    room_type text,
    price_per_night decimal,
    status text,
    PRIMARY KEY (hotel_id, room_number)
  );`,

  // 5. available_rooms_by_hotel_date
  `CREATE TABLE IF NOT EXISTS available_rooms_by_hotel_date (
    hotel_id text,
    start_date date,
    room_number int,
    is_available int,
    room_id text,
    PRIMARY KEY (hotel_id, start_date, room_number)
  );`,

  // 6. amenities_by_room
  `CREATE TABLE IF NOT EXISTS amenities_by_room (
    hotel_id text,
    room_id text,
    amenity_name text,
    description text,
    rate float,
    PRIMARY KEY ((hotel_id, room_id), amenity_name)
  );`,

  // 7. bookings_by_guest
  `CREATE TABLE IF NOT EXISTS bookings_by_guest (
    guest_id text,
    check_in_date date,
    booking_id uuid,
    hotel_id text,
    hotel_name text,
    room_number int,
    check_out_date date,
    total_amount decimal,
    status text,
    PRIMARY KEY (guest_id, check_in_date, booking_id)
  ) WITH CLUSTERING ORDER BY (check_in_date DESC, booking_id DESC);`,

  // 8. bookings_by_hotel_date
  `CREATE TABLE IF NOT EXISTS bookings_by_hotel_date (
    hotel_id text,
    check_in_date date,
    booking_id uuid,
    guest_id text,
    guest_name text,
    room_number int,
    check_out_date date,
    total_amount decimal,
    status text,
    PRIMARY KEY ((hotel_id), check_in_date, booking_id)
  ) WITH CLUSTERING ORDER BY (check_in_date ASC, booking_id ASC);`,

  // 9. reservations_by_confirmation
  `CREATE TABLE IF NOT EXISTS reservations_by_confirmation (
    confirm_number int,
    hotel_id text,
    room_id text,
    start_date date,
    end_date date,
    guest_id text,
    PRIMARY KEY (confirm_number, hotel_id)
  ) WITH CLUSTERING ORDER BY (hotel_id ASC);`,

  // 10. invoices_by_booking
  `CREATE TABLE IF NOT EXISTS invoices_by_booking (
    booking_id uuid,
    invoice_id uuid,
    guest_id text,
    hotel_id text,
    room_charge decimal,
    service_charge decimal,
    tax decimal,
    total_amount decimal,
    payment_status text,
    issued_at timestamp,
    PRIMARY KEY (booking_id, invoice_id)
  );`,

  // 11. guests
  `CREATE TABLE IF NOT EXISTS guests (
    guest_id text,
    first_name text,
    last_name text,
    email text,
    phone_numbers text,
    addresses text,
    PRIMARY KEY (guest_id)
  );`
];

async function runInitDb() {
  console.log('=====================================================');
  console.log('KHỞI TẠO BẢNG CASSANDRA TRÊN ASTRA DB / LOCAL CLUSTER');
  console.log('=====================================================');

  await initCassandraClient();
  const { connectionMode } = getConnectionStatus();
  const client = getClient();

  if (connectionMode === 'MOCK' || !client) {
    console.log('[Init-DB] Đang ở chế độ Mock Engine. Không có kết nối Astra DB vật lý.');
    console.log('[Init-DB] Tất cả bảng đã được giả lập hoàn chỉnh trong In-Memory Store.');
    process.exit(0);
  }

  try {
    for (let i = 0; i < schemaStatements.length; i++) {
      const stmt = schemaStatements[i];
      const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1] || `Table #${i + 1}`;
      process.stdout.write(`Đang tạo bảng ${tableName}... `);
      await client.execute(stmt);
      console.log('OK');
    }
    console.log('\n Khởi tạo toàn bộ bảng CQL thành công!');
  } catch (err) {
    console.error('\n Lỗi khi tạo bảng:', err);
  } finally {
    if (client) await client.shutdown();
    process.exit(0);
  }
}

runInitDb();
