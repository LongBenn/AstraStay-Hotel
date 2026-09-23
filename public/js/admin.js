// Logic dành riêng cho Cổng Quản Trị & Lễ Tân (Admin & Front-desk Portal)
const adminState = {
  hotels: [],
  selectedHotelId: null,
  dashboardStats: null
};

document.addEventListener('DOMContentLoaded', () => {
  initAdminDates();
  loadCommonSystemStatus();
  loadAdminHotels();
  loadAdminDashboardData();
  startCqlPoller();
  setupAdminEventListeners();
});

function initAdminDates() {
  const today = new Date().toISOString().split('T')[0];
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 2);
  const nextMonth = nextMonthDate.toISOString().split('T')[0];

  const sIn = document.getElementById('scheduleStartDate');
  const sOut = document.getElementById('scheduleEndDate');
  if (sIn) sIn.value = '2026-01-01';
  if (sOut) sOut.value = nextMonth;
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('border-blue-600', 'text-blue-600', 'font-semibold', 'bg-blue-50/50');
    btn.classList.add('border-transparent', 'text-slate-500');
  });

  const targetTab = document.getElementById(tabId);
  const targetBtn = document.getElementById(`btn-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('border-blue-600', 'text-blue-600', 'font-semibold', 'bg-blue-50/50');
    targetBtn.classList.remove('border-transparent', 'text-slate-500');
  }

  if (tabId === 'tab-dashboard') {
    loadAdminDashboardData();
  } else if (tabId === 'tab-rooms-schedule') {
    loadAdminRoomMatrix();
    loadAdminHotelSchedule();
  } else if (tabId === 'tab-reviews') {
    loadAdminReviews();
  }
}

async function loadAdminHotels() {
  try {
    const res = await fetch('/api/hotels');
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      adminState.hotels = json.data;
      adminState.selectedHotelId = adminState.hotels[0].hotel_id;

      const adminSelect = document.getElementById('adminHotelSelect');
      const scheduleSelect = document.getElementById('scheduleHotelSelect');
      const reviewHotelFilter = document.getElementById('adminReviewHotelFilter');

      const options = adminState.hotels.map(h => `<option value="${h.hotel_id}">${h.name} (${h.city})</option>`).join('');

      if (adminSelect) adminSelect.innerHTML = options;
      if (scheduleSelect) scheduleSelect.innerHTML = options;
      if (reviewHotelFilter) {
        reviewHotelFilter.innerHTML = '<option value="">Tất cả khách sạn</option>' +
          adminState.hotels.map(h => `<option value="${h.hotel_id}">${h.name}</option>`).join('');
      }

      // Tải dữ liệu ban đầu cho phòng và lịch trình
      loadAdminRoomMatrix();
      loadAdminHotelSchedule();
    }
  } catch (err) {
    console.error('Lỗi tải khách sạn:', err);
  }
}

// 1. Sơ đồ phòng dạng lưới (Room Matrix - Q2)
async function loadAdminRoomMatrix() {
  const hotelId = document.getElementById('adminHotelSelect')?.value || adminState.selectedHotelId;
  if (!hotelId) return;

  const container = document.getElementById('adminRoomGridContainer');
  if (!container) return;

  container.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải sơ đồ phòng từ Cassandra...</div>';

  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms`);
    const json = await res.json();
    const rooms = json.data || [];

    if (rooms.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">Chưa có phòng nào được thiết lập cho khách sạn này.</div>';
      return;
    }

    container.innerHTML = rooms.map(r => {
      const isAvail = r.status === 'AVAILABLE';
      const isOccupied = r.status === 'OCCUPIED';
      const isMaint = r.status === 'MAINTENANCE';

      let bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
      let badgeClass = 'bg-emerald-200 text-emerald-800';
      let statusIcon = 'fa-bed';

      if (isOccupied) {
        bgClass = 'bg-red-50 border-red-200 text-red-900';
        badgeClass = 'bg-red-200 text-red-800';
        statusIcon = 'fa-user-check';
      } else if (isMaint) {
        bgClass = 'bg-amber-50 border-amber-200 text-amber-900';
        badgeClass = 'bg-amber-200 text-amber-800';
        statusIcon = 'fa-wrench';
      }

      return `
        <div class="room-box rounded-2xl p-4 border ${bgClass} flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xl font-black">#${r.room_number}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass} flex items-center gap-1">
                <i class="fa-solid ${statusIcon}"></i> ${r.status}
              </span>
            </div>
            <div class="text-xs font-bold text-slate-800">${r.room_type}</div>
            <div class="text-xs text-slate-500 mt-1 font-semibold">${Number(r.price_per_night).toLocaleString('vi-VN')} đ/đêm</div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-1 text-[11px]">
            <button onclick="changeRoomStatusAction('${r.hotel_id}', ${r.room_number}, 'AVAILABLE')" 
                    class="px-2 py-1 rounded-lg ${isAvail ? 'bg-emerald-700 text-white font-bold ring-2 ring-emerald-400' : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'} transition-all" title="Chuyển thành Trống">
              Trống
            </button>
            <button onclick="changeRoomStatusAction('${r.hotel_id}', ${r.room_number}, 'OCCUPIED')" 
                    class="px-2 py-1 rounded-lg ${isOccupied ? 'bg-red-700 text-white font-bold ring-2 ring-red-400' : 'bg-white hover:bg-red-100 text-red-800 border border-red-300'} transition-all" title="Check-in khách">
              Có khách
            </button>
            <button onclick="changeRoomStatusAction('${r.hotel_id}', ${r.room_number}, 'MAINTENANCE')" 
                    class="px-2 py-1 rounded-lg ${isMaint ? 'bg-amber-700 text-white font-bold ring-2 ring-amber-400' : 'bg-white hover:bg-amber-100 text-amber-800 border border-amber-300'} transition-all" title="Bảo trì phòng">
              Bảo trì
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Lỗi tải sơ đồ phòng:', err);
  }
}

async function changeRoomStatusAction(hotelId, roomNumber, newStatus) {
  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms/${roomNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (json.success) {
      loadAdminRoomMatrix();
      loadAdminDashboardData();
    }
  } catch (err) {
    console.error('Lỗi đổi trạng thái phòng:', err);
  }
}

// 2. Lịch trình Đặt phòng theo Khách sạn & Ngày (Q7: bookings_by_hotel_date)
// Hỗ trợ tra cứu theo Họ (Q8), hiển thị Mã Xác Nhận (Q6) và xem hồ sơ khách hàng (Q9)
async function loadAdminHotelSchedule() {
  const hotelId = document.getElementById('scheduleHotelSelect')?.value || adminState.selectedHotelId;
  const startDate = document.getElementById('scheduleStartDate')?.value;
  const endDate = document.getElementById('scheduleEndDate')?.value;
  const lastName = document.getElementById('scheduleLastName')?.value?.trim();
  if (!hotelId) return;

  const container = document.getElementById('scheduleTableBody');
  const countEl = document.getElementById('scheduleBookingCount');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu đặt phòng...</td></tr>';

  try {
    let url;
    if (lastName) {
      // Q8: Tra cứu theo Họ khách hàng
      url = `/api/bookings/by-last-name?lastName=${encodeURIComponent(lastName)}&hotelId=${encodeURIComponent(hotelId)}`;
    } else {
      // Q7: Lịch trình đón khách theo Khách sạn & Ngày
      url = `/api/bookings/hotel/${hotelId}?`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}`;
    }

    const res = await fetch(url);
    const json = await res.json();
    const bookings = json.data || [];

    if (countEl) countEl.innerText = `${bookings.length} lượt đặt`;

    if (bookings.length === 0) {
      container.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">${lastName ? `Không tìm thấy đơn nào của khách có họ "${lastName}".` : 'Không có lượt đặt phòng nào trong khoảng ngày này.'}</td></tr>`;
      return;
    }

    container.innerHTML = bookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const isCheckedOut = b.status === 'CHECKED_OUT';
      const confirmNum = b.confirm_number || '16380824';

      return `
        <tr class="hover:bg-blue-50/40 border-b border-slate-100 transition-colors">
          
          <!-- Cột 1: Mã xác nhận Confirm Number (Q6: reservations_by_confirmation) -->
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 shadow-sm flex items-center gap-1">
                <i class="fa-solid fa-ticket text-amber-500"></i> ${confirmNum}
              </span>
              <button onclick="copyToClipboard('${confirmNum}', this)" 
                      class="px-1.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm transition-all" title="Sao chép Confirm Number">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </td>

          <!-- Cột 2: Mã đặt phòng UUID (HIỂN THỊ ĐẦY ĐỦ KÈM NÚT COPY) -->
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-bold text-blue-700 select-all break-all bg-blue-50 px-2 py-1 rounded-lg border border-blue-200/80">${b.booking_id}</span>
              <button onclick="copyToClipboard('${b.booking_id}', this)" 
                      class="px-2 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm transition-all flex items-center gap-1 flex-shrink-0" title="Sao chép Mã UUID">
                <i class="fa-regular fa-copy text-xs"></i> <span>Chép</span>
              </button>
            </div>
          </td>

          <!-- Cột 3: Khách hàng (Q9: BẤM VÀO ĐỂ MỞ HỒ SƠ CHI TIẾT GUESTS) -->
          <td class="p-3.5">
            <button onclick="openAdminGuestProfileModal('${b.guest_id}')" class="text-left group cursor-pointer focus:outline-none" title="Xem chi tiết hồ sơ khách hàng (Q9)">
              <div class="font-bold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                <span>${b.guest_name || 'Khách vãng lai'}</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-blue-500 opacity-60 group-hover:opacity-100"></i>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors">
                  <i class="fa-solid fa-id-card text-blue-500 mr-0.5"></i> ${b.guest_id || 'N/A'}
                </span>
              </div>
            </button>
          </td>

          <!-- Cột 4: Số phòng -->
          <td class="p-3.5">
            <span class="font-bold text-slate-800">Phòng ${b.room_number}</span>
          </td>

          <!-- Cột 5: Ngày nhận & Ngày trả -->
          <td class="p-3.5">
            <div class="text-xs font-semibold text-slate-700">${b.check_in_date || b.start_date}</div>
            <div class="text-[11px] text-slate-400">đến ${b.check_out_date || b.end_date}</div>
          </td>

          <!-- Cột 6: Tổng tiền -->
          <td class="p-3.5 font-bold text-blue-600">
            ${Number(b.total_amount).toLocaleString('vi-VN')} đ
          </td>

          <!-- Cột 7: Trạng thái -->
          <td class="p-3.5">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isCancelled ? 'bg-red-100 text-red-700' :
              isCheckedIn ? 'bg-amber-100 text-amber-800' : 
              isCheckedOut ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
            }">
              ${b.status}
            </span>
          </td>

          <!-- Cột 8: Thao tác -->
          <td class="p-3.5 text-right whitespace-nowrap">
            <button onclick="openAdminInvoiceDetailModal('${b.booking_id}')" 
                    class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors mr-1 cursor-pointer">
              <i class="fa-solid fa-receipt mr-1"></i> Hoá đơn
            </button>
            <a href="/?lookup=${encodeURIComponent(b.confirm_number || b.booking_id)}" target="_blank"
               class="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors" title="Mở trang tra cứu của khách (Q6)">
              <i class="fa-solid fa-up-right-from-square"></i>
            </a>
          </td>

        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Lỗi tải lịch trình đặt phòng:', err);
  }
}

function resetScheduleFilter() {
  const lastInput = document.getElementById('scheduleLastName');
  if (lastInput) lastInput.value = '';
  const startInput = document.getElementById('scheduleStartDate');
  if (startInput) startInput.value = '';
  const endInput = document.getElementById('scheduleEndDate');
  if (endInput) endInput.value = '';
  loadAdminHotelSchedule();
}

// Q9. Mở Modal xem hồ sơ chi tiết khách hàng
async function openAdminGuestProfileModal(guestId) {
  if (!guestId || guestId === 'N/A') return;
  try {
    const res = await fetch(`/api/guests/${encodeURIComponent(guestId)}`);
    const json = await res.json();
    if (!json.success || !json.data) {
      alert('Không tìm thấy thông tin chi tiết khách hàng này trong bảng guests.');
      return;
    }
    const g = json.data;
    const fullName = g.full_name || `${g.last_name || ''} ${g.first_name || ''}`.trim() || 'Khách Lưu Trú';
    const initials = (g.first_name || g.last_name || 'KH').slice(0, 2).toUpperCase();

    document.getElementById('admGuestAvatarText').innerText = initials;
    document.getElementById('admGuestFullName').innerText = fullName;
    document.getElementById('admGuestIdBadge').innerText = g.guest_id;
    document.getElementById('admGuestEmail').innerText = g.email || 'Chưa cập nhật';
    document.getElementById('admGuestPhone').innerText = g.phone_numbers || 'Chưa cập nhật';
    document.getElementById('admGuestAddress').innerText = g.addresses || 'Chưa cập nhật';
    document.getElementById('admGuestTotalBookings').innerText = `${g.total_bookings || 0} lượt`;
    document.getElementById('admGuestTotalSpent').innerText = `${(g.total_spent || 0).toLocaleString('vi-VN')} đ`;

    document.getElementById('adminGuestProfileModal')?.classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi khi tải hồ sơ khách hàng Q9:', err);
  }
}

function closeAdminGuestProfileModal() {
  document.getElementById('adminGuestProfileModal')?.classList.add('hidden');
}

// 3. Modal xem chi tiết đơn & Hoá đơn trên trang Admin
async function openAdminInvoiceDetailModal(bookingId) {
  try {
    const bookingRes = await fetch(`/api/bookings/detail/${bookingId}`);
    const bookingJson = await bookingRes.json();
    if (!bookingJson.success) {
      alert('Không tìm thấy thông tin đơn đặt phòng');
      return;
    }
    const b = bookingJson.data;
    const inv = b.invoice || {};

    document.getElementById('admDetailBookingId').innerText = b.booking_id;
    document.getElementById('admDetailGuestName').innerText = b.guest_name || 'Khách vãng lai';
    document.getElementById('admDetailGuestId').innerText = b.guest_id;
    document.getElementById('admDetailHotelName').innerText = b.hotel_name;
    document.getElementById('admDetailRoom').innerText = `Phòng ${b.room_number}`;
    document.getElementById('admDetailDates').innerText = `${b.check_in_date} → ${b.check_out_date}`;
    document.getElementById('admDetailStatus').innerText = b.status;
    document.getElementById('admDetailTotal').innerText = `${Number(b.total_amount).toLocaleString('vi-VN')} đ`;

    const copyUuidBtn = document.getElementById('admBtnCopyUuid');
    if (copyUuidBtn) {
      copyUuidBtn.onclick = () => copyToClipboard(b.booking_id, copyUuidBtn);
    }
    const copyGuestBtn = document.getElementById('admBtnCopyGuestId');
    if (copyGuestBtn) {
      copyGuestBtn.onclick = () => copyToClipboard(b.guest_id, copyGuestBtn);
    }

    document.getElementById('adminInvoiceDetailModal').classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi xem chi tiết đơn:', err);
  }
}

function closeAdminInvoiceDetailModal() {
  document.getElementById('adminInvoiceDetailModal').classList.add('hidden');
}

// 4. Dashboard Thống Kê & Báo Cáo Doanh Thu (Đề tài 2 & 4)
async function loadAdminDashboardData() {
  try {
    const res = await fetch('/api/analytics/dashboard');
    const json = await res.json();
    if (!json.success) return;

    adminState.dashboardStats = json.data;
    const stats = adminState.dashboardStats;

    // Cập nhật KPIs
    document.getElementById('kpiTotalRooms').innerText = stats.kpi.totalRooms;
    document.getElementById('kpiOccupiedRooms').innerText = stats.kpi.occupiedRooms;
    document.getElementById('kpiAvailableRooms').innerText = stats.kpi.availableRooms;
    document.getElementById('kpiOccupancyRate').innerText = `${stats.kpi.occupancyRate}%`;
    document.getElementById('kpiTotalRevenue').innerText = `${Number(stats.kpi.totalRevenue).toLocaleString('vi-VN')} đ`;
    document.getElementById('kpiTotalBookings').innerText = stats.kpi.totalBookings;

    // Vẽ biểu đồ
    if (typeof renderDashboardCharts === 'function') {
      renderDashboardCharts(stats);
    }

    // Top khách hàng thân thiết (Đề tài 4)
    const topGuestsBody = document.getElementById('topGuestsTableBody');
    if (topGuestsBody && stats.topGuests) {
      topGuestsBody.innerHTML = stats.topGuests.map((g, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="p-3 font-bold ${idx === 0 ? 'text-amber-600' : 'text-slate-500'}">
            ${idx === 0 ? '<i class="fa-solid fa-crown text-amber-500 mr-1"></i> #1' : `#${idx + 1}`}
          </td>
          <td class="p-3 font-bold text-slate-800">${g.name}</td>
          <td class="p-3 font-mono text-xs">
            <span class="bg-slate-100 px-2 py-0.5 rounded text-blue-600 font-bold">${g.guest_id}</span>
            <button onclick="copyToClipboard('${g.guest_id}', this)" class="text-slate-400 hover:text-slate-600 ml-1" title="Sao chép">
              <i class="fa-regular fa-copy text-xs"></i>
            </button>
          </td>
          <td class="p-3 text-xs text-slate-500">${g.email}</td>
          <td class="p-3 text-right font-extrabold text-blue-600">${g.booking_count} lượt</td>
        </tr>
      `).join('');
    }

  } catch (err) {
    console.error('Lỗi tải Dashboard Admin:', err);
  }
}

function setupAdminEventListeners() {
  const adminHotel = document.getElementById('adminHotelSelect');
  if (adminHotel) {
    adminHotel.addEventListener('change', (e) => {
      adminState.selectedHotelId = e.target.value;
      loadAdminRoomMatrix();
    });
  }

  const schedHotel = document.getElementById('scheduleHotelSelect');
  if (schedHotel) {
    schedHotel.addEventListener('change', loadAdminHotelSchedule);
  }
}

// ==============================================================================
// PHÂN HỆ: QUẢN LÝ & KIỂM DUYỆT ĐÁNH GIÁ (ADMIN REVIEW MODERATION)
// ==============================================================================

const adminReviewsState = {
  reviews: [],
  selectedReview: null,
  searchTimer: null
};

/**
 * Tải danh sách đánh giá từ API Admin với bộ lọc khách sạn, trạng thái, sao, từ khoá
 */
async function loadAdminReviews() {
  const tableBody = document.getElementById('adminReviewsTableBody');
  const footerCount = document.getElementById('adminReviewsTableFooterCount');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-10 text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-xl text-blue-600 mb-2"></i>
        <p>Đang tải danh sách đánh giá từ Cassandra NoSQL...</p>
      </td>
    </tr>
  `;

  const hotelId = document.getElementById('adminReviewHotelFilter')?.value || '';
  const status = document.getElementById('adminReviewStatusFilter')?.value || '';
  const rating = document.getElementById('adminReviewStarFilter')?.value || '';
  const search = document.getElementById('adminReviewSearchInput')?.value.trim() || '';

  const params = new URLSearchParams();
  if (hotelId) params.set('hotel_id', hotelId);
  if (status) params.set('status', status);
  if (rating) params.set('rating', rating);
  if (search) params.set('search', search);

  try {
    const url = `/api/admin/reviews?${params.toString()}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Không thể tải danh sách đánh giá');
    }

    const reviews = json.data || [];
    adminReviewsState.reviews = reviews;

    // Cập nhật các thẻ KPI tóm tắt
    updateAdminReviewKPIs(reviews);

    // Hiển thị bảng
    renderAdminReviewsTable(reviews);

    if (footerCount) {
      footerCount.innerText = `Tìm thấy ${reviews.length} đánh giá phù hợp tiêu chí lọc`;
    }
  } catch (err) {
    console.error('Lỗi tải đánh giá admin:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-rose-500">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i> Lỗi khi tải dữ liệu: ${err.message}
        </td>
      </tr>
    `;
    if (footerCount) footerCount.innerText = 'Lỗi truy vấn dữ liệu';
  }
}

/**
 * Cập nhật các chỉ số tổng quan (KPI cards)
 */
function updateAdminReviewKPIs(reviews) {
  const total = reviews.length;
  const activeCount = reviews.filter(r => r.status === 'ACTIVE').length;
  const hiddenCount = reviews.filter(r => r.status === 'HIDDEN').length;

  const totalRatingActive = reviews.filter(r => r.status === 'ACTIVE').reduce((sum, r) => sum + Number(r.rating || 0), 0);
  const avgRating = activeCount > 0 ? (totalRatingActive / activeCount).toFixed(1) : '5.0';

  const totalEl = document.getElementById('kpiAdminTotalReviews');
  const activeEl = document.getElementById('kpiAdminActiveReviews');
  const hiddenEl = document.getElementById('kpiAdminHiddenReviews');
  const avgEl = document.getElementById('kpiAdminAvgRating');

  if (totalEl) totalEl.innerText = total;
  if (activeEl) activeEl.innerText = activeCount;
  if (hiddenEl) hiddenEl.innerText = hiddenCount;
  if (avgEl) avgEl.innerText = `${avgRating} ⭐`;
}

/**
 * Hiển thị dữ liệu bảng đánh giá
 */
function renderAdminReviewsTable(reviews) {
  const tableBody = document.getElementById('adminReviewsTableBody');
  if (!tableBody) return;

  if (reviews.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 text-slate-400 bg-slate-50/50">
          <i class="fa-regular fa-comment-dots text-3xl mb-2 text-slate-300"></i>
          <p class="font-bold text-slate-600">Không tìm thấy đánh giá nào</p>
          <p class="text-xs text-slate-400 mt-0.5">Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = reviews.map(r => {
    const isHidden = r.status === 'HIDDEN';
    const statusBadge = isHidden
      ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"><i class="fa-solid fa-eye-slash"></i> ĐÃ ẨN</span>'
      : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check"></i> ACTIVE</span>';

    const starsHtml = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Gần đây';

    const avatar = r.guest_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.guest_name || 'Khách')}&background=0284c7&color=fff`;

    return `
      <tr class="hover:bg-slate-50/80 transition-colors ${isHidden ? 'bg-rose-50/20' : ''}">
        
        <!-- Khách sạn & Phòng -->
        <td class="p-3.5">
          <div class="font-bold text-slate-900">${r.hotel_name || r.hotel_id}</div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">
            ${r.room_number ? `<span class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold font-sans">P.${r.room_number}</span>` : ''}
            <span>Booking: ${r.booking_id ? String(r.booking_id).slice(0, 8) + '...' : 'N/A'}</span>
          </div>
        </td>

        <!-- Khách hàng -->
        <td class="p-3.5">
          <div class="flex items-center gap-2.5">
            <img src="${avatar}" alt="${r.guest_name}" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                 onerror="this.src='https://ui-avatars.com/api/?name=Guest&background=0284c7&color=fff'">
            <div>
              <div class="font-bold text-slate-800">${r.guest_name || 'Khách lưu trú'}</div>
              <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span>${r.guest_id}</span>
                <span class="text-emerald-600 font-sans font-bold flex items-center gap-0.5">
                  <i class="fa-solid fa-circle-check text-[9px]"></i> Đã lưu trú
                </span>
              </div>
            </div>
          </div>
        </td>

        <!-- Điểm & Nhận xét -->
        <td class="p-3.5 max-w-md">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-amber-500 text-xs tracking-wider font-bold">${starsHtml}</span>
            <span class="text-[11px] font-black font-mono bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">${r.rating}.0</span>
          </div>
          <div class="text-xs text-slate-700 italic line-clamp-2" title="${escapeHtml(r.comment)}">
            "${escapeHtml(r.comment)}"
          </div>
          ${isHidden && r.hidden_reason ? `
            <div class="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <i class="fa-solid fa-circle-exclamation text-rose-500"></i> Lý do ẩn: ${escapeHtml(r.hidden_reason)}
            </div>
          ` : ''}
        </td>

        <!-- Thời gian -->
        <td class="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
          ${dateStr}
        </td>

        <!-- Trạng thái -->
        <td class="p-3.5 text-center whitespace-nowrap">
          ${statusBadge}
        </td>

        <!-- Hành động -->
        <td class="p-3.5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openAdminReviewDetailModal('${r.review_id}')" 
                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                    title="Xem chi tiết nhận xét">
              <i class="fa-regular fa-eye"></i> Chi tiết
            </button>
            
            ${isHidden ? `
              <button onclick="toggleReviewStatusDirectly('${r.review_id}', 'ACTIVE')" 
                      class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg transition-colors flex items-center gap-1"
                      title="Hiển thị lại nhận xét này trên web khách hàng">
                <i class="fa-solid fa-eye"></i> Hiện lại
              </button>
            ` : `
              <button onclick="toggleReviewStatusDirectly('${r.review_id}', 'HIDDEN')" 
                      class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition-colors flex items-center gap-1"
                      title="Ẩn nhận xét này khỏi web khách hàng">
                <i class="fa-solid fa-eye-slash"></i> Ẩn
              </button>
            `}
          </div>
        </td>

      </tr>
    `;
  }).join('');
}

/**
 * Mở Modal chi tiết đánh giá cho Admin
 */
function openAdminReviewDetailModal(reviewId) {
  const review = adminReviewsState.reviews.find(r => r.review_id === reviewId);
  if (!review) return;

  adminReviewsState.selectedReview = review;

  const modal = document.getElementById('adminReviewDetailModal');
  const hotelNameEl = document.getElementById('admRevHotelName');
  const stayInfoEl = document.getElementById('admRevStayInfo');
  const bookingIdEl = document.getElementById('admRevBookingId');
  const guestInfoEl = document.getElementById('admRevGuestInfo');
  const ratingValueEl = document.getElementById('admRevRatingValue');
  const ratingStarsEl = document.getElementById('admRevRatingStars');
  const statusBadgeEl = document.getElementById('admRevStatusBadge');
  const commentTextEl = document.getElementById('admRevCommentText');
  const hiddenReasonBox = document.getElementById('admRevHiddenReasonBox');
  const hiddenReasonText = document.getElementById('admRevHiddenReasonText');
  const toggleBtn = document.getElementById('btnAdmToggleStatusModal');

  if (hotelNameEl) hotelNameEl.innerText = review.hotel_name || review.hotel_id;
  if (stayInfoEl) stayInfoEl.innerText = `${review.room_number ? `Phòng ${review.room_number}` : 'Đã lưu trú'} (${review.stay_date || 'Gần đây'})`;
  if (bookingIdEl) bookingIdEl.innerText = review.booking_id || 'N/A';
  if (guestInfoEl) guestInfoEl.innerText = `${review.guest_name || 'Khách'} (Mã: ${review.guest_id || 'N/A'})`;
  if (ratingValueEl) ratingValueEl.innerText = `${review.rating}.0`;
  if (ratingStarsEl) ratingStarsEl.innerText = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  if (commentTextEl) commentTextEl.innerText = `"${review.comment}"`;

  const isHidden = review.status === 'HIDDEN';
  if (statusBadgeEl) {
    statusBadgeEl.className = isHidden
      ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200'
      : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200';
    statusBadgeEl.innerHTML = isHidden
      ? '<i class="fa-solid fa-eye-slash"></i> ĐÃ ẨN KHỎI KHÁCH HÀNG'
      : '<i class="fa-solid fa-circle-check"></i> ĐANG HIỂN THỊ CÔNG KHAI';
  }

  if (isHidden) {
    if (hiddenReasonBox) hiddenReasonBox.classList.remove('hidden');
    if (hiddenReasonText) hiddenReasonText.innerText = review.hidden_reason || 'Vi phạm chính sách nội dung cộng đồng';
    if (toggleBtn) {
      toggleBtn.className = 'px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer';
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i> Bỏ Ẩn / Hiển Thị Lại Đánh Giá';
    }
  } else {
    if (hiddenReasonBox) hiddenReasonBox.classList.add('hidden');
    if (toggleBtn) {
      toggleBtn.className = 'px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer';
      toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ẩn Đánh Giá Này';
    }
  }

  modal.classList.remove('hidden');
}

function closeAdminReviewDetailModal() {
  document.getElementById('adminReviewDetailModal')?.classList.add('hidden');
}

/**
 * Xử lý nút toggle trạng thái từ trong Modal chi tiết
 */
function handleAdminModalStatusToggle() {
  const review = adminReviewsState.selectedReview;
  if (!review) return;

  const newStatus = review.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
  closeAdminReviewDetailModal();
  toggleReviewStatusDirectly(review.review_id, newStatus);
}

/**
 * Gọi API đổi trạng thái ẩn/hiện đánh giá (PATCH /api/admin/reviews/:reviewId/status)
 */
async function toggleReviewStatusDirectly(reviewId, newStatus) {
  let reason = '';
  if (newStatus === 'HIDDEN') {
    reason = prompt('Vui lòng nhập lý do ẩn đánh giá này (ví dụ: Chứa từ ngữ không phù hợp, quảng cáo rác, v.v.):', 'Vi phạm quy định nội dung');
    if (reason === null) return; // Người dùng ấn Cancel
  } else {
    if (!confirm('Bạn có chắc chắn muốn bỏ ẩn và hiển thị lại nhận xét này trên trang công khai? Điểm trung bình của khách sạn sẽ được tính toán lại.')) {
      return;
    }
  }

  try {
    const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        reason: reason || undefined
      })
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Không thể cập nhật trạng thái đánh giá');
    }

    alert(json.message || `Đã chuyển trạng thái đánh giá sang ${newStatus} thành công!`);
    loadAdminReviews();
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái review:', err);
    alert('Không thể cập nhật trạng thái đánh giá: ' + err.message);
  }
}

/**
 * Debounce tìm kiếm review theo từ khóa
 */
function handleAdminReviewSearchDebounce() {
  clearTimeout(adminReviewsState.searchTimer);
  adminReviewsState.searchTimer = setTimeout(() => {
    loadAdminReviews();
  }, 350);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

