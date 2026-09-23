// Script kiểm tra luồng hoàn chỉnh (End-to-End Flow Test) cho Review & Rating Module
const http = require('http');
const app = require('../src/app');

let server;
let port;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      if (!opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }
    }

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runE2E() {
  console.log('\n=============================================================');
  console.log('🚀 BẮT ĐẦU KIỂM TRA LUỒNG TOÀN DIỆN (E2E REVIEW & RATING FLOW)');
  console.log('=============================================================');

  const rexHotelId = '2d76c2a1-f312-4934-83ae-a59c0574805f';
  const guestAnId = 'c262832f-6f09-4a4a-8e92-447304fcebd8';
  const guestMaiId = '0eacb0ae-a973-4bfd-9818-9a927b713cf4';
  const checkedOutBookingId = '44556677-0000-0000-0000-000000000004';

  server = app.listen(0, '127.0.0.1', async () => {
    port = server.address().port;
    console.log(`📡 Server test đang chạy tại http://127.0.0.1:${port}`);

    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
      if (cond) {
        console.log(` ✔ [PASS] ${msg}`);
        passed++;
      } else {
        console.error(` ✘ [FAIL] ${msg}`);
        failed++;
      }
    }

    try {
      // 1. Kiểm tra điều kiện đánh giá khi chưa đăng nhập
      const unauthCheck = await request(`/api/reviews/check-eligibility?booking_id=${checkedOutBookingId}`);
      assert(unauthCheck.status === 401, 'Chưa đăng nhập -> Trả về 401 Unauthorized');

      // 2. guestAnId kiểm tra quyền trên booking đã CHECKED_OUT
      const elig1 = await request(`/api/reviews/check-eligibility?booking_id=${checkedOutBookingId}`, {
        headers: { 'x-user-id': guestAnId }
      });
      assert(elig1.status === 200 && (elig1.body.can_review || elig1.body.eligible), 'guestAnId có thể đánh giá booking hoàn thành của mình');

      // 3. guestAnId gửi đánh giá 5 sao
      const createRes = await request(`/api/hotels/${rexHotelId}/reviews`, {
        method: 'POST',
        headers: { 'x-user-id': guestAnId },
        body: {
          booking_id: checkedOutBookingId,
          rating: 5,
          comment: 'Khách sạn Rex phục vụ chu đáo, phòng ốc rất sạch sẽ và buffet sáng xuất sắc!'
        }
      });
      assert(createRes.status === 201 && createRes.body.success, 'guestAnId tạo đánh giá 5 sao thành công');
      const reviewId = createRes.body.data.review.review_id;

      // 4. guestAnId cố gửi lần 2 cho cùng booking đó -> Phải bị chặn 409 Conflict
      const dupRes = await request(`/api/hotels/${rexHotelId}/reviews`, {
        method: 'POST',
        headers: { 'x-user-id': guestAnId },
        body: {
          booking_id: checkedOutBookingId,
          rating: 4,
          comment: 'Cố tình gửi lặp lần 2 để kiểm tra chống spam duplicate review.'
        }
      });
      assert(dupRes.status === 409, 'Chống đánh giá trùng lặp: Trả về 409 Conflict khi gửi lần 2 cho cùng booking');

      // 5. Kiểm tra danh sách review công khai của khách sạn
      const publicReviews = await request(`/api/hotels/${rexHotelId}/reviews`);
      assert(publicReviews.status === 200 && publicReviews.body.summary.review_count > 0, 'API công khai trả về review và summary tính toán thật');
      const hasMyReview = publicReviews.body.data.some(r => r.review_id === reviewId);
      assert(hasMyReview, 'Review mới xuất hiện trong danh sách công khai của khách sạn');

      // 6. guestMaiId cố sửa review của guestAnId -> Phải bị chặn 403 Forbidden
      const hackUpdate = await request(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'x-user-id': guestMaiId },
        body: { rating: 1, comment: 'Hacker đang cố thay đổi nội dung của người khác!' }
      });
      assert(hackUpdate.status === 403, 'Bảo mật Authorization: Người dùng khác không thể sửa review (403 Forbidden)');

      // 7. guestMaiId cố xóa review của guestAnId -> Phải bị chặn 403 Forbidden
      const hackDelete = await request(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': guestMaiId }
      });
      assert(hackDelete.status === 403, 'Bảo mật Authorization: Người dùng khác không thể xóa review (403 Forbidden)');

      // 8. Chính chủ guestAnId cập nhật review của mình thành 4 sao
      const ownUpdate = await request(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'x-user-id': guestAnId },
        body: { rating: 4, comment: 'Đã cập nhật: Trải nghiệm tốt nhưng điều hòa hơi lạnh một chút' }
      });
      assert(ownUpdate.status === 200 && ownUpdate.body.data.review.rating === 4, 'Chính chủ cập nhật review thành công');

      // 9. Admin ẩn review này (HIDDEN)
      const hideRes = await request(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        body: { status: 'HIDDEN', reason: 'Tạm ẩn để xác minh thông tin' }
      });
      assert(hideRes.status === 200 && hideRes.body.data.status === 'HIDDEN', 'Admin ẩn review thành công');

      // 10. Sau khi bị ẩn, review không được xuất hiện ở public listing và không được tính vào rating summary
      const publicAfterHide = await request(`/api/hotels/${rexHotelId}/reviews`);
      const isHiddenPresent = publicAfterHide.body.data.some(r => r.review_id === reviewId);
      assert(!isHiddenPresent, 'Review bị ẩn KHÔNG xuất hiện trên giao diện công khai');

      // 11. Admin bỏ ẩn (ACTIVE lại)
      const showRes = await request(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        body: { status: 'ACTIVE' }
      });
      assert(showRes.status === 200 && showRes.body.data.status === 'ACTIVE', 'Admin hiển thị lại review thành công');

      // 12. guestAnId xóa đánh giá của chính mình
      const ownDelete = await request(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': guestAnId }
      });
      assert(ownDelete.status === 200 && ownDelete.body.success, 'Chính chủ xóa review thành công');

      // 13. Kiểm tra eligibility sau khi xóa: guestAnId lại có quyền đánh giá lại cho booking này
      const eligAfterDelete = await request(`/api/reviews/check-eligibility?booking_id=${checkedOutBookingId}`, {
        headers: { 'x-user-id': guestAnId }
      });
      assert((eligAfterDelete.body.can_review || eligAfterDelete.body.eligible) === true, 'Sau khi xóa review, booking được mở khóa quyền đánh giá lại');

      console.log('\n=============================================================');
      console.log(`🏁 KẾT QUẢ KIỂM TRA E2E: ${passed} PASSED, ${failed} FAILED`);
      console.log('=============================================================\n');

      server.close();
      process.exit(failed > 0 ? 1 : 0);
    } catch (e) {
      console.error('Lỗi kiểm tra E2E:', e);
      server.close();
      process.exit(1);
    }
  });
}

runE2E();
