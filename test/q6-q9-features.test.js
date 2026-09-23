/**
 * Test Suite: Kiểm tra toàn diện các nghiệp vụ NoSQL Q6 - Q9 (AstraStay)
 * - Q6: Tra cứu theo mã xác nhận số nguyên Confirm Number (reservations_by_confirmation)
 * - Q7: Lịch trình đón khách theo Khách sạn & Ngày (bookings_by_hotel_date)
 * - Q8: Tra cứu đặt phòng theo Họ khách hàng (reservations_by_guest)
 * - Q9: Tra cứu thông tin chi tiết hồ sơ khách hàng (guests)
 * - Cassandra Logged Batch: Đồng bộ khi tạo đơn mới ghi vào Q6, Q7, Q8
 */

const cassandraService = require('../src/services/cassandraService');

let passedCount = 0;
let failedCount = 0;

async function test(title, fn) {
  try {
    await fn();
    console.log(` ✔ [PASS] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(` ✖ [FAIL] ${title}`);
    console.error(`    -> Lỗi: ${err.message}`);
    failedCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runQ6ToQ9Tests() {
  console.log('\n=============================================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ NGHIỆP VỤ NoSQL Q6, Q7, Q8, Q9');
  console.log('   (Apache Cassandra / DataStax Query-First Architecture)    ');
  console.log('=============================================================\n');

  // --- Q6 TESTS ---
  await test('Q6: Tra cứu đặt phòng theo mã xác nhận 16380824 thành công', async () => {
    const res = await cassandraService.getReservationByConfirmNumber(16380824);
    assert(res !== null, 'Phải tìm thấy đơn với confirm_number = 16380824');
    assert(res.confirm_number === 16380824, 'confirm_number phải khớp chính xác');
    assert(res.hotel_id === '2d76c2a1-f312-4934-83ae-a59c0574805f', 'hotel_id phải là Rex Sài Gòn');
    assert(res.invoice !== undefined, 'Đơn phải đính kèm thông tin hoá đơn điện tử');
  });

  await test('Q6: Tra cứu mã xác nhận không tồn tại trả về null', async () => {
    const res = await cassandraService.getReservationByConfirmNumber(99999999);
    assert(res === null, 'Mã không tồn tại phải trả về null');
  });

  // --- Q7 TESTS ---
  await test('Q7: Tra cứu lịch trình đón khách theo Khách sạn và Ngày', async () => {
    const bookings = await cassandraService.getBookingsByHotelDate('2d76c2a1-f312-4934-83ae-a59c0574805f');
    assert(Array.isArray(bookings), 'Kết quả phải là danh sách mảng');
    assert(bookings.length > 0, 'Phải có ít nhất 1 đơn đặt phòng tại Rex');
    assert(bookings[0].confirm_number !== undefined, 'Mỗi đơn phải có mã confirm_number chuẩn hoá');
  });

  // --- Q8 TESTS ---
  await test('Q8: Tìm kiếm tất cả đặt phòng theo họ khách "Nguyễn"', async () => {
    const res = await cassandraService.getReservationsByGuestLastName('Nguyễn');
    assert(Array.isArray(res), 'Kết quả phải là mảng');
    assert(res.length >= 2, 'Họ Nguyễn phải có ít nhất 2 đơn đặt phòng mẫu');
    assert(res.every(r => r.guest_last_name === 'Nguyễn'), 'Tất cả các bản ghi phải có họ Nguyễn');
  });

  await test('Q8: Tìm kiếm đặt phòng theo họ "Trần"', async () => {
    const res = await cassandraService.getReservationsByGuestLastName('Trần');
    assert(res.length >= 1, 'Họ Trần phải có ít nhất 1 đơn đặt phòng');
    assert(res.some(r => r.guest_name && r.guest_name.includes('Trần')), 'Khách phải mang họ Trần');
  });

  // --- Q9 TESTS ---
  await test('Q9: Tra cứu thông tin hồ sơ khách hàng theo ID "GUEST001"', async () => {
    const guest = await cassandraService.getGuestById('GUEST001');
    assert(guest !== null, 'Phải tìm thấy khách hàng GUEST001');
    assert(guest.guest_id === 'GUEST001', 'guest_id phải khớp');
    assert(guest.email === 'nguyenvana@gmail.com', 'email phải chính xác');
    assert(guest.phone_numbers !== undefined, 'phải có số điện thoại');
    assert(guest.addresses !== undefined, 'phải có địa chỉ');
    assert(guest.total_bookings >= 1, 'phải tính toán được tổng số lần đặt phòng');
    assert(guest.total_spent > 0, 'phải tính toán được tổng chi tiêu');
  });

  await test('Q9: Lấy danh sách toàn bộ khách hàng thân thiết (getAllGuests)', async () => {
    const guests = await cassandraService.getAllGuests();
    assert(Array.isArray(guests), 'Danh sách khách hàng phải là mảng');
    assert(guests.length >= 10, 'Phải có ít nhất 10 khách hàng thân thiết');
    assert(guests.every(g => g.full_name && g.guest_id), 'Mỗi khách phải có full_name và guest_id');
  });

  // --- BATCH INTEGRATION TEST ---
  await test('Cassandra Logged Batch: Tạo đơn mới tự động sinh confirm_number và đồng bộ Q6, Q7, Q8', async () => {
    const newBooking = await cassandraService.createBooking({
      guest_id: 'GUEST-TEST-99',
      guest_name: 'Lê Hoàng Long',
      hotel_id: 'HTL001',
      hotel_name: 'Saigon Riverside Hotel',
      room_number: 101,
      room_id: 'SR-101',
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-03',
      price_per_night: 1200000,
      nights: 2,
      payment_status: 'PAID'
    });

    assert(newBooking.confirm_number !== undefined, 'Tạo đơn phải sinh mã confirm_number');
    const generatedCode = newBooking.confirm_number;

    // Kiểm tra Q6 ngay lập tức với mã vừa sinh
    const foundQ6 = await cassandraService.getReservationByConfirmNumber(generatedCode);
    assert(foundQ6 !== null, 'Phải tra cứu được đơn vừa tạo qua Q6 bằng confirm_number');
    assert(foundQ6.guest_id === 'GUEST-TEST-99', 'guest_id trong Q6 phải khớp');

    // Kiểm tra Q8 ngay lập tức với họ "Lê"
    const foundQ8 = await cassandraService.getReservationsByGuestLastName('Lê');
    assert(foundQ8.some(r => Number(r.confirm_number) === Number(generatedCode)), 'Đơn mới phải có mặt trong bảng Q8 theo họ Lê');
  });

  console.log('\n=============================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runQ6ToQ9Tests();
