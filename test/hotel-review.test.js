const assert = require('node:assert');
const cassandraService = require('../src/services/cassandraService');
const mockStore = require('../src/services/mockStore');

console.log('\n=============================================================');
console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ MODULE ĐÁNH GIÁ KHÁCH SẠN (HOTEL REVIEWS)');
console.log('   (21 Scenarios - End-to-End Hotel Review & Rating Engine)   ');
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
  const rexHotelId = '2d76c2a1-f312-4934-83ae-a59c0574805f'; // Khách sạn Rex Sài Gòn
  const guestAnId = 'c262832f-6f09-4a4a-8e92-447304fcebd8';   // Nguyễn Văn An
  const guestMaiId = '0eacb0ae-a973-4bfd-9818-9a927b713cf4';  // Trần Thị Mai
  const guestOtherId = 'GUEST002';                              // Trần Thị B

  // Scenario 1: Lấy danh sách review của khách sạn kèm thống kê
  await test('Scenario 1: Lấy danh sách đánh giá của khách sạn kèm thống kê rating và phân bố 5★ -> 1★', async () => {
    const res = await cassandraService.getHotelReviews(rexHotelId);
    assert(res, 'Kết quả không được rỗng');
    assert(Array.isArray(res.data), 'res.data phải là một mảng đánh giá');
    assert(res.total > 0, 'Khách sạn Rex Sài Gòn phải có ít nhất 1 review');
    assert(res.stats, 'Phải có trường stats chứa thống kê rating');
    assert(res.stats.breakdown, 'Phải có breakdown phân bố sao');
    assert(res.stats.percentages, 'Phải có percentages tỉ lệ sao');
    assert.strictEqual(typeof res.stats.average_rating, 'number', 'average_rating phải là kiểu number');
  });

  // Scenario 2: Lấy chi tiết stats của khách sạn
  await test('Scenario 2: Lấy chi tiết thống kê rating từ getHotelRatingStats O(1)', async () => {
    const stats = cassandraService.getHotelRatingStats(rexHotelId);
    assert(stats, 'Stats không được rỗng');
    assert(stats.total_reviews >= 3, 'Tổng số review phải >= 3');
    assert(stats.breakdown['5'] >= 1, 'Số lượng 5 sao phải >= 1');
    assert(stats.percentages['5'] > 0, 'Tỷ lệ % 5 sao phải > 0');
  });

  // Scenario 3: Từ chối kiểm tra quyền nếu thiếu user
  await test('Scenario 3: Từ chối kiểm tra quyền đánh giá khi chưa đăng nhập (thiếu guestId)', async () => {
    const check = await cassandraService.checkReviewEligibility('44556677-0000-0000-0000-000000000004', null);
    assert.strictEqual(check.eligible, false, 'Phải trả về eligible = false');
    assert(check.reason.toLowerCase().includes('đăng nhập'), 'Lý do phải yêu cầu đăng nhập');
  });

  // Scenario 4: Từ chối kiểm tra quyền nếu booking không thuộc về user
  await test('Scenario 4: Từ chối đánh giá khi booking không thuộc về user đang đăng nhập', async () => {
    // Đơn 16380824 là của Trần Thị Mai (guestMaiId), thử dùng guestAnId
    const check = await cassandraService.checkReviewEligibility('16380824-0000-0000-0000-000000000001', guestAnId);
    assert.strictEqual(check.eligible, false, 'Phải trả về eligible = false');
    assert(check.reason.toLowerCase().includes('không thuộc về'), 'Lý do phải thông báo không thuộc tài khoản');
  });

  // Scenario 5: Từ chối đánh giá khi booking chưa hoàn thành (CONFIRMED hoặc CHECKED_IN)
  await test('Scenario 5: Từ chối đánh giá khi khách chưa hoàn thành lưu trú (Booking CONFIRMED)', async () => {
    // Booking 28471920 có status CONFIRMED của guestAnId
    const check = await cassandraService.checkReviewEligibility('28471920-0000-0000-0000-000000000003', guestAnId);
    assert.strictEqual(check.eligible, false, 'Phải trả về eligible = false');
    assert(check.reason.toLowerCase().includes('hoàn thành') || check.reason.toLowerCase().includes('check-out'), 'Phải báo cần hoàn thành kỳ nghỉ');
  });

  // Scenario 6: Từ chối đánh giá khi booking đã bị hủy
  await test('Scenario 6: Từ chối đánh giá khi đơn đặt phòng đã bị hủy (CANCELLED)', async () => {
    // Tạo giả lập một booking bị huỷ để kiểm tra
    const cancelledBookingId = 'cancelled-booking-test-id';
    mockStore.bookings_by_guest.push({
      booking_id: cancelledBookingId,
      guest_id: guestAnId,
      status: 'CANCELLED',
      check_in_date: '2026-01-01',
      check_out_date: '2026-01-03',
      hotel_id: rexHotelId
    });

    const check = await cassandraService.checkReviewEligibility(cancelledBookingId, guestAnId);
    assert.strictEqual(check.eligible, false, 'Phải trả về eligible = false');
    assert(check.reason.toLowerCase().includes('đã bị hủy'), 'Phải báo đơn đã bị hủy');
  });

  // Scenario 7: Cho phép đánh giá khi booking hợp lệ (CHECKED_OUT, chính chủ, chưa review)
  await test('Scenario 7: Cho phép đánh giá khi booking CHECKED_OUT, thuộc đúng user và chưa từng review', async () => {
    // Đơn 44556677 của guestAnId tại Rex Sài Gòn có status CHECKED_OUT
    const bookingId = '44556677-0000-0000-0000-000000000004';
    const check = await cassandraService.checkReviewEligibility(bookingId, guestAnId);
    assert.strictEqual(check.eligible, true, 'Booking này phải đủ điều kiện đánh giá');
    assert(check.booking, 'Phải trả về thông tin booking');
  });

  // Scenario 8: Tạo đánh giá mới thành công
  let newlyCreatedReviewId = null;
  await test('Scenario 8: Tạo đánh giá khách sạn mới thành công với số sao 5 và nhận xét chi tiết', async () => {
    const bookingId = '44556677-0000-0000-0000-000000000004';
    const comment = 'Dịch vụ tại Rex Hotel thực sự rất tốt, nhân viên thân thiện và không gian di sản ấn tượng.';

    const result = await cassandraService.createHotelReview({
      hotel_id: rexHotelId,
      booking_id: bookingId,
      user_id: guestAnId,
      rating: 5,
      comment
    });

    assert(result.review, 'Kết quả phải trả về review');
    assert(result.review.review_id, 'Phải có review_id dạng UUID');
    assert.strictEqual(result.review.rating, 5, 'Rating phải là 5');
    assert.strictEqual(result.review.status, 'ACTIVE', 'Review mới tạo phải có status ACTIVE');
    assert.strictEqual(result.review.is_verified_stay, true, 'Phải có cờ is_verified_stay = true');
    assert(result.summary, 'Phải cập nhật rating summary');

    newlyCreatedReviewId = result.review.review_id;
  });

  // Scenario 9: Chống gửi đánh giá trùng lặp cho cùng 1 booking
  await test('Scenario 9: Từ chối gửi đánh giá lần thứ hai cho cùng một booking (Chống spam/duplicate)', async () => {
    let errorCaught = false;
    try {
      await cassandraService.createHotelReview({
        hotel_id: rexHotelId,
        booking_id: '44556677-0000-0000-0000-000000000004',
        user_id: guestAnId,
        rating: 4,
        comment: 'Cố tình đánh giá lần 2'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('đã được đánh giá') || err.message.includes('trước đó'), 'Lỗi phải nêu rõ booking đã được đánh giá');
    }
    assert(errorCaught, 'Hệ thống phải chặn việc gửi review trùng lặp');
  });

  // Scenario 10: Validate rating 1 - 5
  await test('Scenario 10: Từ chối đánh giá khi rating < 1 hoặc > 5', async () => {
    let caughtLow = false;
    try {
      await cassandraService.createHotelReview({
        hotel_id: rexHotelId,
        booking_id: 'any-id',
        user_id: guestAnId,
        rating: 0,
        comment: 'Rating 0 sao'
      });
    } catch (err) {
      caughtLow = true;
      assert(err.message.includes('1 đến 5'), 'Lỗi phải nhắc nhở chọn từ 1 đến 5 sao');
    }
    assert(caughtLow, 'Phải chặn rating = 0');

    let caughtHigh = false;
    try {
      await cassandraService.createHotelReview({
        hotel_id: rexHotelId,
        booking_id: 'any-id',
        user_id: guestAnId,
        rating: 6,
        comment: 'Rating 6 sao'
      });
    } catch (err) {
      caughtHigh = true;
      assert(err.message.includes('1 đến 5'), 'Lỗi phải nhắc nhở chọn từ 1 đến 5 sao');
    }
    assert(caughtHigh, 'Phải chặn rating = 6');
  });

  // Scenario 11: Validate comment length
  await test('Scenario 11: Từ chối đánh giá khi nhận xét rỗng hoặc ngắn hơn 10 ký tự', async () => {
    let caughtShort = false;
    try {
      await cassandraService.createHotelReview({
        hotel_id: rexHotelId,
        booking_id: 'any-id',
        user_id: guestAnId,
        rating: 5,
        comment: 'Quá ngắn'
      });
    } catch (err) {
      caughtShort = true;
      assert(err.message.includes('10 ký tự') || err.message.includes('ngắn'), 'Phải báo nhận xét quá ngắn');
    }
    assert(caughtShort, 'Phải chặn nhận xét quá ngắn');
  });

  // Scenario 12: Rating Summary được tính toán cập nhật chính xác sau khi có review mới
  await test('Scenario 12: Điểm đánh giá trung bình và số lượt review trong summary được tính toán chính xác', async () => {
    const stats = cassandraService.getHotelRatingStats(rexHotelId);
    assert(stats.total_reviews >= 4, 'Số lượng review phải được tăng thêm');
    const breakdownTotal = stats.breakdown['1'] + stats.breakdown['2'] + stats.breakdown['3'] + stats.breakdown['4'] + stats.breakdown['5'];
    assert.strictEqual(stats.total_reviews, breakdownTotal, 'Tổng review phải bằng tổng các sao phân bố');
  });

  // Scenario 13: Sửa review của chính mình thành công
  await test('Scenario 13: Cho phép chính tác giả chỉnh sửa đánh giá của mình (cập nhật rating và comment)', async () => {
    assert(newlyCreatedReviewId, 'Cần có ID của review vừa tạo');
    const updatedComment = 'Đã cập nhật: Trải nghiệm tại Rex Hotel càng lúc càng tuyệt vời, bữa sáng buffet rất ngon.';

    const res = await cassandraService.updateHotelReview({
      review_id: newlyCreatedReviewId,
      user_id: guestAnId,
      rating: 4,
      comment: updatedComment
    });

    assert(res.review, 'Phải trả về review đã cập nhật');
    assert.strictEqual(res.review.rating, 4, 'Điểm số mới phải là 4');
    assert.strictEqual(res.review.comment, updatedComment, 'Nội dung nhận xét mới phải khớp');

    // Kiểm tra lại từ ID
    const fetchUpdated = await cassandraService.getHotelReviewById(newlyCreatedReviewId);
    assert.strictEqual(fetchUpdated.rating, 4, 'Rating lưu trong database phải là 4');
  });

  // Scenario 14: Chặn user khác sửa review
  await test('Scenario 14: Từ chối và chặn việc người dùng này cố sửa đánh giá của người dùng khác', async () => {
    let errorCaught = false;
    try {
      await cassandraService.updateHotelReview({
        review_id: newlyCreatedReviewId,
        user_id: guestOtherId, // Không phải chủ của review
        rating: 1,
        comment: 'Cố tình sửa review của người khác'
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('không có quyền'), 'Phải báo không có quyền chỉnh sửa');
    }
    assert(errorCaught, 'Hệ thống phải chặn việc sửa review chéo');
  });

  // Scenario 15: Chặn user khác xóa review
  await test('Scenario 15: Từ chối và chặn việc người dùng này cố xóa đánh giá của người dùng khác', async () => {
    let errorCaught = false;
    try {
      await cassandraService.deleteHotelReview({
        review_id: newlyCreatedReviewId,
        user_id: guestOtherId // Không phải chủ review
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('không có quyền'), 'Phải báo không có quyền xóa');
    }
    assert(errorCaught, 'Hệ thống phải chặn việc xóa review chéo');
  });

  // Scenario 16: Lọc review theo số sao
  await test('Scenario 16: Bộ lọc đánh giá theo số sao (Filter by Stars: 5★, 4★) hoạt động chính xác', async () => {
    const reviews5Star = await cassandraService.getHotelReviews(rexHotelId, { star: 5 });
    for (const r of reviews5Star.data) {
      assert.strictEqual(r.rating, 5, 'Tất cả kết quả lọc 5 sao phải có rating = 5');
    }

    const reviews4Star = await cassandraService.getHotelReviews(rexHotelId, { star: 4 });
    for (const r of reviews4Star.data) {
      assert.strictEqual(r.rating, 4, 'Tất cả kết quả lọc 4 sao phải có rating = 4');
    }
  });

  // Scenario 17: Sắp xếp review (Sort: newest, oldest, highest, lowest)
  await test('Scenario 17: Sắp xếp đánh giá (Mới nhất, Cũ nhất, Điểm cao nhất, Điểm thấp nhất)', async () => {
    // Highest
    const resHighest = await cassandraService.getHotelReviews(rexHotelId, { sort: 'highest' });
    for (let i = 0; i < resHighest.data.length - 1; i++) {
      assert(resHighest.data[i].rating >= resHighest.data[i + 1].rating, 'Phần tử trước phải có rating >= phần tử sau khi sort highest');
    }

    // Lowest
    const resLowest = await cassandraService.getHotelReviews(rexHotelId, { sort: 'lowest' });
    for (let i = 0; i < resLowest.data.length - 1; i++) {
      assert(resLowest.data[i].rating <= resLowest.data[i + 1].rating, 'Phần tử trước phải có rating <= phần tử sau khi sort lowest');
    }
  });

  // Scenario 18: Admin tìm kiếm và lọc danh sách review toàn hệ thống
  await test('Scenario 18: Admin tra cứu toàn bộ review, tìm kiếm từ khóa và lọc theo khách sạn', async () => {
    const adminRes = await cassandraService.getAdminReviews({
      hotelId: rexHotelId,
      search: 'Rex'
    });
    assert(Array.isArray(adminRes.data), 'Kết quả trả về cho admin phải là mảng');
    assert(adminRes.total > 0, 'Phải tìm thấy review theo từ khóa "Rex"');
  });

  // Scenario 19: Admin kiểm duyệt ẩn review (status = HIDDEN) và loại khỏi public stats
  await test('Scenario 19: Admin ẩn review (HIDDEN): Review bị ẩn khỏi giao diện công khai và summary được cập nhật loại trừ review ẩn', async () => {
    const beforeStats = cassandraService.getHotelRatingStats(rexHotelId);
    const beforeCount = beforeStats.total_reviews;

    // Admin ẩn newlyCreatedReviewId
    const res = await cassandraService.updateReviewStatus(newlyCreatedReviewId, 'HIDDEN');
    assert.strictEqual(res.review.status, 'HIDDEN', 'Trạng thái phải là HIDDEN');

    // Khách truy vấn công khai không được thấy review HIDDEN
    const publicRes = await cassandraService.getHotelReviews(rexHotelId, { status: 'ACTIVE' });
    const foundHidden = publicRes.data.find(r => r.review_id === newlyCreatedReviewId);
    assert(!foundHidden, 'Review bị ẩn tuyệt đối không được xuất hiện ở danh sách công khai');

    // Rating summary sau khi ẩn phải giảm 1 lượt review active
    const afterStats = cassandraService.getHotelRatingStats(rexHotelId);
    assert.strictEqual(afterStats.total_reviews, beforeCount - 1, 'Tổng số review công khai phải giảm đi 1');

    // Phục hồi lại thành ACTIVE
    await cassandraService.updateReviewStatus(newlyCreatedReviewId, 'ACTIVE');
  });

  // Scenario 20: Xóa review của chính mình thành công và summary cập nhật lại
  await test('Scenario 20: Tác giả xóa đánh giá của chính mình, giải phóng trạng thái đã review của booking', async () => {
    const res = await cassandraService.deleteHotelReview({
      review_id: newlyCreatedReviewId,
      user_id: guestAnId
    });
    assert.strictEqual(res.success, true, 'Xóa phải thành công');

    // Kiểm tra không còn tìm thấy trong review list
    const checkDeleted = await cassandraService.getHotelReviewById(newlyCreatedReviewId);
    assert.strictEqual(checkDeleted, null, 'Review đã xóa không còn tồn tại');

    // Kiểm tra booking lại được phép review (hoặc không còn bị chặn bởi unique entry)
    const checkEligibleAgain = await cassandraService.checkReviewEligibility(
      '44556677-0000-0000-0000-000000000004',
      guestAnId
    );
    assert.strictEqual(checkEligibleAgain.eligible, true, 'Booking phải được giải phóng trạng thái đã review');
  });

  // Scenario 21: Rating trên danh sách khách sạn lấy từ dữ liệu thật
  await test('Scenario 21: Danh sách khách sạn getAllHotels trả về average_rating và review_count lấy từ dữ liệu review thực tế', async () => {
    const hotels = await cassandraService.getAllHotels();
    assert(Array.isArray(hotels), 'Danh sách khách sạn phải là mảng');
    const rex = hotels.find(h => h.hotel_id === rexHotelId);
    assert(rex, 'Phải tìm thấy Rex Sài Gòn');
    assert(rex.average_rating > 0, `Rating phải > 0 (thực tế: ${rex.average_rating})`);
    assert(rex.review_count > 0, `Số lượt review phải > 0 (thực tế: ${rex.review_count})`);
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
