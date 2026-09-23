const mockStore = require('../services/mockStore');

/**
 * Middleware bắt buộc đăng nhập để thực hiện tác vụ (Tạo review, sửa review, xóa review)
 */
function requireAuth(req, res, next) {
  // Lấy userId từ header x-user-id hoặc Authorization: Bearer <user_id> hoặc body/query
  let userId = req.headers['x-user-id'];

  if (!userId && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      userId = parts[1];
    }
  }

  if (!userId && req.body && req.body.user_id) {
    userId = req.body.user_id;
  }

  if (!userId && req.query && req.query.user_id) {
    userId = req.query.user_id;
  }

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để thực hiện chức năng này.'
    });
  }

  const cleanUserId = userId.trim();
  const guest = (mockStore.guests || []).find(
    g => g.guest_id.toLowerCase() === cleanUserId.toLowerCase()
  );

  // Nếu là guest đã đăng ký hoặc guest hợp lệ trong hệ thống
  if (guest) {
    req.user = {
      ...guest,
      name: `${guest.last_name} ${guest.first_name}`.trim()
    };
  } else {
    // Cho phép guest_id dạng UUID hoặc guest vãng lai hợp lệ
    req.user = {
      guest_id: cleanUserId,
      first_name: 'Khách hàng',
      last_name: cleanUserId.slice(0, 6),
      name: `Khách hàng ${cleanUserId.slice(0, 6)}`
    };
  }

  next();
}

/**
 * Middleware xác thực tùy chọn (nếu có user thì gắn vào req.user, không có thì bỏ qua)
 */
function optionalAuth(req, res, next) {
  let userId = req.headers['x-user-id'];

  if (!userId && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      userId = parts[1];
    }
  }

  if (!userId && req.query && req.query.user_id) {
    userId = req.query.user_id;
  }

  if (userId && typeof userId === 'string' && userId.trim().length > 0) {
    const cleanUserId = userId.trim();
    const guest = (mockStore.guests || []).find(
      g => g.guest_id.toLowerCase() === cleanUserId.toLowerCase()
    );
    if (guest) {
      req.user = {
        ...guest,
        name: `${guest.last_name} ${guest.first_name}`.trim()
      };
    } else {
      req.user = {
        guest_id: cleanUserId,
        first_name: 'Khách hàng',
        last_name: cleanUserId.slice(0, 6),
        name: `Khách hàng ${cleanUserId.slice(0, 6)}`
      };
    }
  } else {
    req.user = null;
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
