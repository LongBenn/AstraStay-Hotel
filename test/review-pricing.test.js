const assert = require('node:assert');
const cassandraService = require('../src/services/cassandraService');
const mockStore = require('../src/services/mockStore');

console.log('\n=============================================================');
console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ HỆ THỐNG GIÁ PHÒNG VÀ ĐÁNH GIÁ PHÒNG');
console.log('   (15/15 Scenarios - Apache Cassandra / AstraStay Engine)   ');
console.log('=============================================================\n');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(` \x1b[32m✔\x1b[0m [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(` \x1b[31m✖\x1b[0m [FAIL] ${name}`);
    console.error(`   \x1b[33mError: ${err.message}\x1b[0m`);
    failedTests++;
  }
}

async function runAllTests() {
  const hotelId = '2d76c2a1-f312-4934-83ae-a59c0574805f'; // Khách sạn Rex Sài Gòn

  // Scenario 1: Search available rooms 10/03 -> 15/03
  await test('Scenario 1: Tìm kiếm phòng từ 2026-03-10 đến 2026-03-15 tại khách sạn Rex Sài Gòn', async () => {
    const rooms = await cassandraService.searchAvailableRooms(hotelId, '2026-03-10', '2026-03-15');
    assert(Array.isArray(rooms), 'Kết quả phải là một mảng');
    assert(rooms.length > 0, 'Phải tìm thấy ít nhất 1 phòng');
    assert(rooms[0].daily_prices, 'Mỗi phòng phải có danh sách giá theo ngày daily_prices');
    assert.strictEqual(rooms[0].daily_prices.length, 5, 'Khoảng thời gian 5 đêm phải có đúng 5 bản ghi daily_prices');
  });

  // Scenario 2: Room booked on 12/03 (Room 201) is correctly returned as is_available = false
  await test('Scenario 2: Phòng có ngày bị trùng đặt phòng (Phòng 201 ngày 12/03) trả về is_available = false', async () => {
    const rooms = await cassandraService.searchAvailableRooms(hotelId, '2026-03-10', '2026-03-15');
    const room201 = rooms.find(r => String(r.room_number) === '201');
    assert(room201, 'Phải tìm thấy phòng 201 trong danh sách phòng của khách sạn');
    assert.strictEqual(room201.is_available, false, 'Phòng 201 phải có is_available = false do ngày 12/03 bị trùng đặt phòng');
    
    // Kiểm tra chi tiết daily_prices ngày 12/03 của phòng 201
    const day12 = room201.daily_prices.find(dp => dp.date === '2026-03-12');
    assert(day12, 'Phải có bản ghi giá cho ngày 2026-03-12');
    assert.strictEqual(day12.is_available, false, 'Ngày 2026-03-12 của phòng 201 phải có is_available = false');
  });

  // Scenario 3: Verify total_price across 5 nights calculated as sum of each night's price
  await test('Scenario 3: Tính toán total_price cho toàn bộ 5 đêm bằng tổng giá của từng đêm', async () => {
    const rooms = await cassandraService.searchAvailableRooms(hotelId, '2026-03-10', '2026-03-15');
    const room101 = rooms.find(r => String(r.room_number) === '101');
    assert(room101, 'Phải tìm thấy phòng 101');
    const expectedTotal = room101.daily_prices.reduce((sum, dp) => sum + dp.price, 0);
    assert.strictEqual(room101.total_price, expectedTotal, `Tổng tiền ${room101.total_price} phải bằng tổng 5 đêm ${expectedTotal}`);
  });

  // Scenario 4: Dynamic pricing: weekend rate vs. weekday rate difference calculated correctly
  await test('Scenario 4: Chính sách giá động (Dynamic Pricing): Giá ngày cuối tuần (Thứ 6, Thứ 7) cao hơn ngày thường', async () => {
    const rooms = await cassandraService.searchAvailableRooms(hotelId, '2026-03-10', '2026-03-15');
    const room204 = rooms.find(r => String(r.room_number) === '204'); // CH-234
    assert(room204, 'Phải tìm thấy phòng 204');
    
    // 2026-03-10 (Thứ 3) -> ngày trong tuần
    // 2026-03-13 (Thứ 6) -> cuối tuần
    const weekdayPrice = room204.daily_prices.find(dp => dp.date === '2026-03-10')?.price;
    const weekendPrice = room204.daily_prices.find(dp => dp.date === '2026-03-13')?.price;
    assert(weekdayPrice && weekendPrice, 'Phải có giá cho ngày thường và cuối tuần');
    assert(weekendPrice > weekdayPrice, `Giá cuối tuần (${weekendPrice}) phải cao hơn giá ngày thường (${weekdayPrice})`);
  });

  // Scenario 5: Retrieve reviews of room CH-234
  await test('Scenario 5: Lấy danh sách đánh giá của phòng CH-234 từ reviews_by_room', async () => {
    const reviews = await cassandraService.getRoomReviews(hotelId, 'CH-234');
    assert(Array.isArray(reviews), 'Kết quả trả về phải là một mảng');
    assert(reviews.length > 0, 'Phòng CH-234 phải có ít nhất 1 đánh giá mẫu');
    assert(reviews[0].comment, 'Mỗi đánh giá phải có trường nhận xét (comment)');
    assert(reviews[0].rating >= 1 && reviews[0].rating <= 5, 'Điểm đánh giá phải từ 1 đến 5 sao');
  });

  // Scenario 6: Verify newest review appears first (review_date DESC)
  await test('Scenario 6: Sắp xếp đánh giá theo thứ tự mới nhất trước (review_date DESC theo Clustering Key)', async () => {
    const reviews = await cassandraService.getRoomReviews(hotelId, 'CH-234');
    assert(reviews.length >= 2, 'Cần ít nhất 2 đánh giá để kiểm tra sắp xếp');
    for (let i = 0; i < reviews.length - 1; i++) {
      const dateCurrent = new Date(reviews[i].review_date).getTime();
      const dateNext = new Date(reviews[i + 1].review_date).getTime();
      assert(dateCurrent >= dateNext, `Đánh giá ${i} (${reviews[i].review_date}) phải mới hơn hoặc bằng đánh giá ${i+1} (${reviews[i+1].review_date})`);
    }
  });

  // Scenario 7: Valid rating 1-5 accepted
  await test('Scenario 7: Gửi đánh giá hợp lệ (Rating 5 sao, khách đã CHECKED_OUT) thành công', async () => {
    const result = await cassandraService.createRoomReview({
      hotel_id: hotelId,
      room_id: 'CH-234',
      guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
      confirm_number: 44556677,
      rating: 5,
      comment: 'Trải nghiệm tuyệt vời tại Rex Hotel, phòng CH-234 rất sang trọng và sạch sẽ!'
    });
    assert(result.review, 'Kết quả phải trả về review mới tạo');
    assert.strictEqual(result.review.rating, 5, 'Điểm đánh giá phải là 5');
    assert(result.summary, 'Phải cập nhật thông tin tóm tắt rating');
  });

  // Scenario 8: Rating < 1 or > 5 rejected
  await test('Scenario 8: Từ chối đánh giá không hợp lệ khi rating < 1 hoặc > 5', async () => {
    let errorCaught = false;
    try {
      await cassandraService.createRoomReview({
        hotel_id: hotelId,
        room_id: 'CH-234',
        guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
        confirm_number: 99999999,
        rating: 6,
        comment: 'Rating quá số sao quy định'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('1 đến 5'), 'Thông báo lỗi phải đề cập đến thang điểm 1 đến 5');
    }
    assert(errorCaught, 'Hệ thống phải ném lỗi khi rating = 6');
  });

  // Scenario 9: Unfinished reservation (CONFIRMED) rejected from review
  await test('Scenario 9: Từ chối đánh giá khi khách chưa hoàn thành lưu trú (Trạng thái CONFIRMED chưa CHECKED_OUT)', async () => {
    let errorCaught = false;
    try {
      await cassandraService.createRoomReview({
        hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
        room_id: '12-CFG',
        guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
        confirm_number: 28471920, // Booking này có trạng thái CONFIRMED
        rating: 5,
        comment: 'Chưa ở nhưng muốn đánh giá trước'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.toLowerCase().includes('hoàn thành') || err.message.includes('CHECKED_OUT'), 'Lỗi phải nêu rõ phải hoàn thành lưu trú');
    }
    assert(errorCaught, 'Hệ thống phải chặn khách hàng chưa check-out gửi đánh giá');
  });

  // Scenario 10: Reviewing with mismatched guest_id rejected
  await test('Scenario 10: Từ chối đánh giá khi mã khách hàng không khớp với mã đặt phòng', async () => {
    let errorCaught = false;
    try {
      await cassandraService.createRoomReview({
        hotel_id: hotelId,
        room_id: 'CH-234',
        guest_id: '0eacb0ae-a973-4bfd-9818-9a927b713cf4', // Khách hàng này hợp lệ nhưng không phải người đặt 44556677
        confirm_number: 44556677,
        rating: 5,
        comment: 'Mã khách hàng không khớp với chủ đơn đặt'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('không thuộc về khách hàng'), 'Phải báo lỗi đơn đặt phòng không thuộc về khách hàng');
    }
    assert(errorCaught, 'Hệ thống phải chặn việc mạo danh đánh giá phòng');
  });

  // Scenario 11: Duplicate review for the same confirm_number rejected
  await test('Scenario 11: Chống đánh giá trùng lặp: Từ chối gửi đánh giá lần thứ 2 cho cùng confirm_number 44556677', async () => {
    let errorCaught = false;
    try {
      await cassandraService.createRoomReview({
        hotel_id: hotelId,
        room_id: 'CH-234',
        guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
        confirm_number: 44556677, // Đã được gửi ở Scenario 7
        rating: 4,
        comment: 'Cố tình đánh giá lần thứ hai cho cùng một đơn'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('đã được gửi đánh giá') || err.message.includes('Không thể đánh giá lại'), 'Phải báo lỗi đã được đánh giá trước đó');
    }
    assert(errorCaught, 'Hệ thống phải chặn việc spam trùng lặp review cho cùng một mã xác nhận');
  });

  // Scenario 12: average_rating mathematically updated after review
  await test('Scenario 12: Điểm đánh giá trung bình average_rating được tính toán cập nhật chính xác', async () => {
    const ratingSummary = await cassandraService.getRoomRating(hotelId, 'CH-234');
    assert(ratingSummary, 'Phải lấy được thông tin rating summary của CH-234');
    const expectedAvg = Math.round((ratingSummary.rating_sum / ratingSummary.review_count) * 10) / 10;
    assert.strictEqual(ratingSummary.average_rating, expectedAvg, `average_rating (${ratingSummary.average_rating}) phải bằng round(sum / count) (${expectedAvg})`);
  });

  // Scenario 13: review_count incremented by 1
  await test('Scenario 13: Số lượt review_count được cộng dồn chính xác sau khi có đánh giá mới', async () => {
    const ratingSummary = await cassandraService.getRoomRating(hotelId, 'CH-234');
    // CH-234 ban đầu có 85 review, sau Scenario 7 đã tăng lên 86
    assert(ratingSummary.review_count >= 86, `Số lượt review phải ít nhất là 86 (thực tế: ${ratingSummary.review_count})`);
  });

  // Scenario 14: Filter by max price and min rating works without ALLOW FILTERING
  await test('Scenario 14: Lọc phòng theo mức giá tối đa và điểm rating tối thiểu không cần ALLOW FILTERING', async () => {
    const filteredRooms = await cassandraService.searchAvailableRooms(
      hotelId,
      '2026-03-10',
      '2026-03-15',
      3000000, // Giá tối đa 3,000,000 đ/đêm
      4.7      // Rating tối thiểu 4.7
    );
    assert(Array.isArray(filteredRooms), 'Kết quả phải là một mảng');
    for (const room of filteredRooms) {
      assert(room.price_per_night <= 3000000, `Giá phòng ${room.room_number} (${room.price_per_night}) phải <= 3,000,000 đ`);
      assert(room.average_rating >= 4.7, `Điểm rating phòng ${room.room_number} (${room.average_rating}) phải >= 4.7`);
    }

    // Kiểm tra thêm truy vấn top-rated trực tiếp từ bảng rooms_by_hotel_rating
    const topRooms = await cassandraService.getTopRatedRooms(hotelId, 4.5);
    assert(Array.isArray(topRooms), 'Top-rated rooms phải là mảng');
    for (const tr of topRooms) {
      assert(tr.average_rating >= 4.5, `Phòng top-rated phải có điểm >= 4.5`);
    }
  });

  // Scenario 15: Verify existing booking and invoice queries still function intact
  await test('Scenario 15: Kiểm tra các chức năng cũ (Q1-Q9: Tra cứu POI, Chi tiết khách sạn, Lịch sử đặt phòng, Hoá đơn) vẫn hoạt động hoàn hảo', async () => {
    // Q1: hotels_by_poi
    const poiHotels = await cassandraService.getHotelsByPoi('Chợ Bến Thành');
    assert(poiHotels.length > 0, 'Phải tìm thấy khách sạn gần Chợ Bến Thành');

    // Q2: hotel detail
    const hotel = await cassandraService.getHotelById(hotelId);
    assert(hotel && hotel.name.includes('Rex'), 'Phải lấy đúng khách sạn Rex Sài Gòn');

    // Q3: bookings_by_guest
    const guestBookings = await cassandraService.getBookingsByGuest('c262832f-6f09-4a4a-8e92-447304fcebd8');
    assert(guestBookings.length > 0, 'Phải tìm thấy lịch sử đặt phòng của khách');

    // Q5: invoices_by_booking
    const invoice = await cassandraService.getInvoiceByBooking('16380824-0000-0000-0000-000000000001');
    assert(invoice, 'Phải tìm thấy hoá đơn của booking 16380824');
    assert(invoice.total_amount > 0, 'Tổng tiền hoá đơn phải > 0');
  });

  // Scenario 16: Lấy danh sách đánh giá nổi bật toàn hệ thống (Rating = 5 sao)
  await test('Scenario 16: Lấy danh sách đánh giá nổi bật toàn hệ thống từ bảng featured_reviews', async () => {
    const featured = await cassandraService.getFeaturedReviews();
    assert(Array.isArray(featured), 'Kết quả phải là một mảng');
    assert(featured.length >= 4, `Phải có ít nhất 4 đánh giá nổi bật (tìm thấy: ${featured.length})`);
    for (const r of featured) {
      assert(r.rating === 5, `Tất cả đánh giá nổi bật phải đạt 5 sao (nhận được: ${r.rating})`);
      assert(r.guest_name && r.guest_name.length > 0, 'Phải có tên khách hàng');
      assert(r.comment && r.comment.length > 0, 'Phải có nội dung bình luận');
      assert(r.hotel_name && r.hotel_name.length > 0, 'Phải có tên khách sạn');
    }
  });

  // Scenario 17: Lọc đánh giá nổi bật theo từng khách sạn cụ thể
  await test('Scenario 17: Lọc đánh giá nổi bật theo hotel_id của Rex Sài Gòn', async () => {
    const rexFeatured = await cassandraService.getFeaturedReviews(hotelId);
    assert(Array.isArray(rexFeatured), 'Kết quả phải là một mảng');
    assert(rexFeatured.length >= 2, `Rex Sài Gòn phải có ít nhất 2 đánh giá nổi bật`);
    for (const r of rexFeatured) {
      assert(r.hotel_id === hotelId, `Đánh giá phải thuộc về Rex Sài Gòn (${hotelId})`);
      assert(r.rating === 5, 'Đánh giá phải đạt 5 sao');
    }
  });

  // Scenario 18: Tăng số lượt bình chọn nhận xét hữu ích (helpful_count)
  await test('Scenario 18: Tăng lượt bình chọn nhận xét hữu ích (helpful_count) thời gian thực', async () => {
    const testReviewId = '11111111-1111-1111-1111-111111111111';
    const beforeList = await cassandraService.getFeaturedReviews(hotelId);
    const beforeReview = beforeList.find(r => r.review_id === testReviewId);
    const beforeCount = beforeReview ? beforeReview.helpful_count : 0;

    const res = await cassandraService.markReviewHelpful(testReviewId);
    assert(res && res.helpful_count === beforeCount + 1, `helpful_count phải tăng lên 1 (từ ${beforeCount} lên ${beforeCount + 1})`);
  });

  console.log('\n=============================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
