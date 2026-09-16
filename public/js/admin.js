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
      const options = adminState.hotels.map(h => `<option value="${h.hotel_id}">${h.name} (${h.city})</option>`).join('');

      if (adminSelect) adminSelect.innerHTML = options;
      if (scheduleSelect) scheduleSelect.innerHTML = options;

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

// 2. Lịch trình Đặt phòng theo Khách sạn & Ngày (Q4: bookings_by_hotel_date)
// Hiển thị ĐẦY ĐỦ Mã đặt phòng (UUID) kèm nút sao chép, và hiển thị rõ ràng Mã khách hàng (guest_id)
async function loadAdminHotelSchedule() {
  const hotelId = document.getElementById('scheduleHotelSelect')?.value || adminState.selectedHotelId;
  const startDate = document.getElementById('scheduleStartDate')?.value;
  const endDate = document.getElementById('scheduleEndDate')?.value;
  if (!hotelId) return;

  const container = document.getElementById('scheduleTableBody');
  const countEl = document.getElementById('scheduleBookingCount');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu đặt phòng...</td></tr>';

  try {
    let url = `/api/bookings/hotel/${hotelId}?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;

    const res = await fetch(url);
    const json = await res.json();
    const bookings = json.data || [];

    if (countEl) countEl.innerText = `${bookings.length} lượt đặt`;

    if (bookings.length === 0) {
      container.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">Không có lượt đặt phòng nào trong khoảng ngày này.</td></tr>';
      return;
    }

    container.innerHTML = bookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const isCheckedOut = b.status === 'CHECKED_OUT';

      return `
        <tr class="hover:bg-blue-50/40 border-b border-slate-100 transition-colors">
          
          <!-- Cột 1: Mã đặt phòng UUID (HIỂN THỊ ĐẦY ĐỦ KÈM NÚT COPY) -->
          <td class="p-3.5">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-bold text-blue-700 select-all break-all bg-blue-50 px-2 py-1 rounded-lg border border-blue-200/80">${b.booking_id}</span>
              <button onclick="copyToClipboard('${b.booking_id}', this)" 
                      class="px-2 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm transition-all flex items-center gap-1 flex-shrink-0" title="Sao chép Mã UUID">
                <i class="fa-regular fa-copy text-xs"></i> <span>Chép</span>
              </button>
            </div>
          </td>

          <!-- Cột 2: Khách hàng (HIỂN THỊ CẢ TÊN VÀ MÃ KHÁCH HÀNG GUEST_ID) -->
          <td class="p-3.5">
            <div class="font-bold text-slate-900">${b.guest_name || 'Khách vãng lai'}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                <i class="fa-solid fa-id-card text-blue-500 mr-0.5"></i> ${b.guest_id || 'N/A'}
              </span>
              <button onclick="copyToClipboard('${b.guest_id}', this)" 
                      class="text-[10px] text-slate-400 hover:text-slate-700 transition-colors" title="Sao chép Mã khách">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </td>

          <!-- Cột 3: Số phòng -->
          <td class="p-3.5">
            <span class="font-bold text-slate-800">Phòng ${b.room_number}</span>
          </td>

          <!-- Cột 4: Ngày nhận & Ngày trả -->
          <td class="p-3.5">
            <div class="text-xs font-semibold text-slate-700">${b.check_in_date}</div>
            <div class="text-[11px] text-slate-400">đến ${b.check_out_date}</div>
          </td>

          <!-- Cột 5: Tổng tiền -->
          <td class="p-3.5 font-bold text-blue-600">
            ${Number(b.total_amount).toLocaleString('vi-VN')} đ
          </td>

          <!-- Cột 6: Trạng thái -->
          <td class="p-3.5">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isCancelled ? 'bg-red-100 text-red-700' :
              isCheckedIn ? 'bg-amber-100 text-amber-800' : 
              isCheckedOut ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
            }">
              ${b.status}
            </span>
          </td>

          <!-- Cột 7: Thao tác -->
          <td class="p-3.5 text-right whitespace-nowrap">
            <button onclick="openAdminInvoiceDetailModal('${b.booking_id}')" 
                    class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors mr-1">
              <i class="fa-solid fa-receipt mr-1"></i> Hoá đơn
            </button>
            <a href="/?lookup=${encodeURIComponent(b.booking_id)}" target="_blank"
               class="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors" title="Mở trang tra cứu của khách">
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
