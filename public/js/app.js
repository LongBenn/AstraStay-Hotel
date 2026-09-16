// State ứng dụng AstraStay
const state = {
  hotels: [],
  pois: [],
  selectedHotel: null,
  selectedRoom: null,
  currentBookings: [],
  cqlLogs: [],
  systemStatus: null
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  initDateInputs();
  loadSystemStatus();
  loadPois();
  loadHotels();
  loadDashboardData();
  setupEventListeners();
  startCqlLogPoller();
});

// Thiết lập mặc định ngày nhận / trả phòng (hôm nay và ngày mai)
function initDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 2);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const checkInInput = document.getElementById('searchCheckIn');
  const checkOutInput = document.getElementById('searchCheckOut');
  if (checkInInput) checkInInput.value = today;
  if (checkOutInput) checkOutInput.value = tomorrow;

  const modalIn = document.getElementById('modalCheckIn');
  const modalOut = document.getElementById('modalCheckOut');
  if (modalIn) modalIn.value = today;
  if (modalOut) modalOut.value = tomorrow;
}

// Chuyển Tab giao diện
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-blue-600', 'text-blue-600', 'font-semibold');
    btn.classList.add('border-transparent', 'text-slate-500');
  });

  const targetTab = document.getElementById(tabId);
  const targetBtn = document.getElementById(`btn-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('border-blue-600', 'text-blue-600', 'font-semibold');
    targetBtn.classList.remove('border-transparent', 'text-slate-500');
  }

  if (tabId === 'tab-admin-dashboard') {
    loadDashboardData();
  } else if (tabId === 'tab-admin-rooms') {
    loadAdminRoomMatrix();
    loadHotelSchedule();
  }
}

// 1. Tải danh sách điểm tham quan (POI - Q1 & Q3)
async function loadPois() {
  try {
    const res = await fetch('/api/hotels/pois');
    const json = await res.json();
    if (json.success) {
      state.pois = json.data;
      const select = document.getElementById('poiFilter');
      if (select) {
        select.innerHTML = '<option value="">Tất cả địa điểm / Điểm tham quan</option>' + 
          state.pois.map(p => `<option value="${p}">${p}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Lỗi khi tải danh sách POI:', err);
  }
}

// 2. Tải danh sách khách sạn (Q1)
async function loadHotels(poi = '') {
  try {
    const url = poi ? `/api/hotels?poi=${encodeURIComponent(poi)}` : '/api/hotels';
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      state.hotels = json.data;
      renderHotelList(state.hotels);
      updateHotelSelects();
    }
  } catch (err) {
    console.error('Lỗi khi tải khách sạn:', err);
  }
}

function renderHotelList(hotels) {
  const container = document.getElementById('hotelListContainer');
  if (!container) return;

  if (hotels.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-hotel text-4xl mb-3 text-slate-300"></i>
        <p>Không tìm thấy khách sạn nào phù hợp tại khu vực này.</p>
      </div>`;
    return;
  }

  container.innerHTML = hotels.map(h => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
      <div class="relative h-48 bg-slate-200 overflow-hidden">
        <img src="${h.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}" 
             alt="${h.name}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500">
        <div class="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
          <i class="fa-solid fa-star text-xs"></i> ${h.star_rating || 5} Sao
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">${h.city || 'Việt Nam'}</div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">${h.name}</h3>
          <p class="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
            <i class="fa-solid fa-location-dot text-red-500 flex-shrink-0"></i>
            <span class="truncate">${h.address}</span>
          </p>
          <p class="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
            <i class="fa-solid fa-phone text-emerald-600 flex-shrink-0"></i>
            <span>${h.phone || '028 3829 2185'}</span>
          </p>
        </div>
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div class="text-xs text-slate-400">Giá chỉ từ <span class="text-sm font-bold text-slate-800">800.000đ</span>/đêm</div>
          <button onclick="openHotelRoomsModal('${h.hotel_id}')" 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5">
            Xem phòng <i class="fa-solid fa-arrow-right text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Cập nhật các dropdown chọn khách sạn ở Admin & Schedule
function updateHotelSelects() {
  const adminSelect = document.getElementById('adminHotelSelect');
  const scheduleSelect = document.getElementById('scheduleHotelSelect');
  const options = state.hotels.map(h => `<option value="${h.hotel_id}">${h.name}</option>`).join('');

  if (adminSelect) adminSelect.innerHTML = options;
  if (scheduleSelect) scheduleSelect.innerHTML = options;
}

// 3. Xem danh sách phòng của khách sạn (Q2 & Q5)
async function openHotelRoomsModal(hotelId) {
  try {
    const hotelRes = await fetch(`/api/hotels/${hotelId}`);
    const hotelJson = await hotelRes.json();
    state.selectedHotel = hotelJson.data;

    const roomsRes = await fetch(`/api/hotels/${hotelId}/rooms`);
    const roomsJson = await roomsRes.json();
    const rooms = roomsJson.data || [];

    const titleEl = document.getElementById('modalHotelName');
    const descEl = document.getElementById('modalHotelDesc');
    const roomsContainer = document.getElementById('modalRoomsContainer');

    if (titleEl) titleEl.innerText = state.selectedHotel.name;
    if (descEl) descEl.innerText = `${state.selectedHotel.address} • Hotline: ${state.selectedHotel.phone}`;

    if (roomsContainer) {
      roomsContainer.innerHTML = rooms.map(r => {
        const isAvail = r.status === 'AVAILABLE';
        return `
          <div class="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 font-bold flex flex-col items-center justify-center border border-blue-100 flex-shrink-0">
                <span class="text-xs uppercase text-slate-400">Phòng</span>
                <span class="text-lg">${r.room_number}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-bold text-slate-900">${r.room_type}</h4>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium ${isAvail ? 'badge-available' : 'badge-occupied'}">
                    ${isAvail ? 'Sẵn sàng đón khách' : 'Đã có khách'}
                  </span>
                </div>
                <div class="text-xs text-slate-500 flex items-center gap-3">
                  <span><i class="fa-solid fa-wifi text-slate-400 mr-1"></i> Miễn phí Wi-Fi</span>
                  <span><i class="fa-solid fa-snowflake text-slate-400 mr-1"></i> Điều hoà</span>
                  <span><i class="fa-solid fa-utensils text-slate-400 mr-1"></i> Buffet sáng</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
              <div class="text-right">
                <div class="text-base font-extrabold text-blue-600">${Number(r.price_per_night).toLocaleString('vi-VN')} đ</div>
                <div class="text-[11px] text-slate-400">/ đêm (chưa VAT)</div>
              </div>
              <button onclick="prepareBookingModal('${r.hotel_id}', ${r.room_number}, '${r.room_type}', ${r.price_per_night}, '${r.room_id || ''}')"
                      ${!isAvail ? 'disabled' : ''}
                      class="px-4 py-2 rounded-xl text-xs font-semibold ${isAvail ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} transition-all">
                ${isAvail ? 'Đặt ngay' : 'Hết phòng'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Hiển thị modal
    document.getElementById('hotelRoomsModal').classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi xem phòng khách sạn:', err);
    alert('Không thể tải thông tin phòng.');
  }
}

function closeHotelRoomsModal() {
  document.getElementById('hotelRoomsModal').classList.add('hidden');
}

// 4. Mở Form Đặt phòng (Booking Modal)
function prepareBookingModal(hotelId, roomNumber, roomType, pricePerNight, roomId) {
  state.selectedRoom = { hotelId, roomNumber, roomType, pricePerNight, roomId };

  document.getElementById('bookingHotelName').innerText = state.selectedHotel?.name || 'Khách sạn liên kết';
  document.getElementById('bookingRoomInfo').innerText = `Phòng ${roomNumber} (${roomType})`;
  document.getElementById('bookingRatePerNight').innerText = `${Number(pricePerNight).toLocaleString('vi-VN')} đ/đêm`;

  recalculateBookingTotal();

  // Đóng modal chọn phòng, mở modal điền form đặt
  closeHotelRoomsModal();
  document.getElementById('bookingFormModal').classList.remove('hidden');
}

function closeBookingFormModal() {
  document.getElementById('bookingFormModal').classList.add('hidden');
}

// Tính tổng tiền phòng + phí dịch vụ 5% + VAT 10%
function recalculateBookingTotal() {
  if (!state.selectedRoom) return;

  const inDate = new Date(document.getElementById('modalCheckIn').value);
  const outDate = new Date(document.getElementById('modalCheckOut').value);

  let diffDays = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  if (isNaN(diffDays) || diffDays <= 0) diffDays = 1;

  document.getElementById('summaryNights').innerText = `${diffDays} đêm`;

  const roomTotal = state.selectedRoom.pricePerNight * diffDays;
  const serviceCharge = Math.round(roomTotal * 0.05);
  const tax = Math.round((roomTotal + serviceCharge) * 0.1);
  const grandTotal = roomTotal + serviceCharge + tax;

  document.getElementById('summaryRoomTotal').innerText = `${roomTotal.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryServiceCharge').innerText = `${serviceCharge.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryTax').innerText = `${tax.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryGrandTotal').innerText = `${grandTotal.toLocaleString('vi-VN')} đ`;

  return { diffDays, roomTotal, serviceCharge, tax, grandTotal };
}

// Gửi lệnh đặt phòng (Cassandra LOGGED BATCH)
async function submitBooking(e) {
  if (e) e.preventDefault();
  if (!state.selectedRoom || !state.selectedHotel) return;

  const guestName = document.getElementById('bookingGuestName').value.trim();
  const guestPhone = document.getElementById('bookingGuestPhone').value.trim();
  const guestEmail = document.getElementById('bookingGuestEmail').value.trim();
  const checkInDate = document.getElementById('modalCheckIn').value;
  const checkOutDate = document.getElementById('modalCheckOut').value;

  if (!guestName || !guestPhone) {
    alert('Vui lòng nhập họ tên và số điện thoại của bạn!');
    return;
  }

  const { diffDays } = recalculateBookingTotal();

  const payload = {
    guest_id: `GUEST-${Date.now().toString().slice(-4)}`,
    guest_name: guestName,
    hotel_id: state.selectedHotel.hotel_id,
    hotel_name: state.selectedHotel.name,
    room_number: state.selectedRoom.roomNumber,
    room_id: state.selectedRoom.roomId || `RM-${state.selectedRoom.roomNumber}`,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    price_per_night: state.selectedRoom.pricePerNight,
    nights: diffDays
  };

  const submitBtn = document.getElementById('btnSubmitBooking');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang thực thi Cassandra BATCH...';
  }

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.success) {
      closeBookingFormModal();
      showSuccessInvoiceModal(json.data);
      // Tải lại dữ liệu
      loadHotels();
      loadDashboardData();
    } else {
      alert('Lỗi đặt phòng: ' + json.message);
    }
  } catch (err) {
    console.error('Lỗi khi submit booking:', err);
    alert('Có lỗi xảy ra khi gửi yêu cầu đặt phòng.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Xác nhận & Thanh toán ngay';
    }
  }
}

// Hiển thị hoá đơn và mã đặt phòng thành công
function showSuccessInvoiceModal(bookingData) {
  const { booking, invoice } = bookingData;

  document.getElementById('invBookingId').innerText = booking.booking_id;
  document.getElementById('invHotelName').innerText = booking.hotel_name;
  document.getElementById('invRoomNumber').innerText = `Phòng ${booking.room_number}`;
  document.getElementById('invDates').innerText = `${booking.check_in_date} -> ${booking.check_out_date}`;
  document.getElementById('invRoomCharge').innerText = `${Number(invoice.room_charge).toLocaleString('vi-VN')} đ`;
  document.getElementById('invServiceCharge').innerText = `${Number(invoice.service_charge).toLocaleString('vi-VN')} đ`;
  document.getElementById('invTax').innerText = `${Number(invoice.tax).toLocaleString('vi-VN')} đ`;
  document.getElementById('invGrandTotal').innerText = `${Number(invoice.total_amount).toLocaleString('vi-VN')} đ`;
  document.getElementById('invIssuedAt').innerText = new Date(invoice.issued_at).toLocaleString('vi-VN');

  document.getElementById('bookingSuccessModal').classList.remove('hidden');
}

function closeSuccessInvoiceModal() {
  document.getElementById('bookingSuccessModal').classList.add('hidden');
}

// 5. Tra cứu đặt phòng (Lookup - Q3 & Q6)
async function searchBooking() {
  const input = document.getElementById('lookupInput').value.trim();
  const resultContainer = document.getElementById('lookupResultContainer');

  if (!input) {
    alert('Vui lòng nhập Mã Đặt Phòng (UUID) hoặc Mã Khách Hàng (ví dụ: GUEST001)');
    return;
  }

  resultContainer.innerHTML = `
    <div class="text-center py-12 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-600"></i>
      <p>Đang truy vấn Cassandra Keyspace...</p>
    </div>
  `;

  try {
    let bookings = [];

    // Kiểm tra nếu là UUID hoặc tìm theo Guest ID
    if (input.toLowerCase().startsWith('guest')) {
      const res = await fetch(`/api/bookings/guest/${encodeURIComponent(input)}`);
      const json = await res.json();
      bookings = json.data || [];
    } else {
      const res = await fetch(`/api/bookings/detail/${encodeURIComponent(input)}`);
      const json = await res.json();
      if (json.success && json.data) {
        bookings = [json.data];
      }
    }

    if (bookings.length === 0) {
      resultContainer.innerHTML = `
        <div class="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
          <i class="fa-regular fa-folder-open text-4xl mb-3 text-slate-300"></i>
          <p class="font-medium text-slate-700">Không tìm thấy bản ghi đặt phòng phù hợp</p>
          <p class="text-xs text-slate-400 mt-1">Vui lòng kiểm tra lại mã UUID hoặc mã khách hàng (GUEST001, GUEST002,...)</p>
        </div>
      `;
      return;
    }

    resultContainer.innerHTML = bookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      return `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã đặt phòng:</span>
              <div class="font-mono text-sm font-bold text-blue-600">${b.booking_id}</div>
            </div>
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-bold ${
                isCancelled ? 'bg-red-100 text-red-700' :
                b.status === 'CHECKED_IN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }">
                ${b.status}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
            <div>
              <div class="text-slate-400">Khách sạn</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">${b.hotel_name || 'Khách sạn liên kết'}</div>
            </div>
            <div>
              <div class="text-slate-400">Số phòng</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">Phòng ${b.room_number}</div>
            </div>
            <div>
              <div class="text-slate-400">Thời gian lưu trú</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">${b.check_in_date} → ${b.check_out_date}</div>
            </div>
            <div>
              <div class="text-slate-400">Tổng thanh toán</div>
              <div class="font-bold text-blue-600 text-sm mt-0.5">${Number(b.total_amount).toLocaleString('vi-VN')} đ</div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            ${!isCancelled ? `
              <button onclick="cancelBookingAction('${b.booking_id}')" 
                      class="px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1.5">
                <i class="fa-solid fa-ban"></i> Huỷ đặt phòng (Cassandra BATCH)
              </button>
            ` : '<span class="text-xs text-slate-400 italic">Lượt đặt phòng này đã được huỷ</span>'}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Lỗi tìm kiếm:', err);
    resultContainer.innerHTML = '<div class="text-red-500 text-center py-6">Lỗi truy vấn dữ liệu từ Cassandra.</div>';
  }
}

// Huỷ đặt phòng (Dual-write BATCH update)
async function cancelBookingAction(bookingId) {
  if (!confirm(`Bạn có chắc chắn muốn huỷ đơn đặt phòng ${bookingId} không? Phòng sẽ được giải phóng về trạng thái AVAILABLE.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      alert('Đã huỷ đặt phòng thành công!');
      searchBooking();
      loadHotels();
      loadDashboardData();
    } else {
      alert('Lỗi huỷ phòng: ' + json.message);
    }
  } catch (err) {
    console.error('Lỗi huỷ phòng:', err);
    alert('Không thể thực hiện huỷ phòng.');
  }
}

// 6. Admin Sơ đồ phòng (Room Matrix - Q2)
async function loadAdminRoomMatrix() {
  const hotelId = document.getElementById('adminHotelSelect')?.value;
  if (!hotelId) return;

  const container = document.getElementById('adminRoomGridContainer');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu phòng...</div>';

  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms`);
    const json = await res.json();
    const rooms = json.data || [];

    if (rooms.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">Không có phòng nào thuộc khách sạn này.</div>';
      return;
    }

    container.innerHTML = rooms.map(r => {
      const isAvail = r.status === 'AVAILABLE';
      const isOccupied = r.status === 'OCCUPIED';
      const isMaint = r.status === 'MAINTENANCE';

      let bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
      let badgeClass = 'bg-emerald-200 text-emerald-800';
      let icon = 'fa-bed';

      if (isOccupied) {
        bgClass = 'bg-red-50 border-red-200 text-red-900';
        badgeClass = 'bg-red-200 text-red-800';
        icon = 'fa-user-check';
      } else if (isMaint) {
        bgClass = 'bg-amber-50 border-amber-200 text-amber-900';
        badgeClass = 'bg-amber-200 text-amber-800';
        icon = 'fa-wrench';
      }

      return `
        <div class="room-box rounded-2xl p-4 border ${bgClass} flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xl font-extrabold">#${r.room_number}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">
                ${r.status}
              </span>
            </div>
            <div class="text-xs font-semibold text-slate-700">${r.room_type}</div>
            <div class="text-xs text-slate-500 mt-1">${Number(r.price_per_night).toLocaleString('vi-VN')} đ/đêm</div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between gap-1 text-[11px]">
            <button onclick="changeRoomStatus('${r.hotel_id}', ${r.room_number}, 'AVAILABLE')" 
                    class="px-2 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors" title="Chuyển thành Trống">
              Trống
            </button>
            <button onclick="changeRoomStatus('${r.hotel_id}', ${r.room_number}, 'OCCUPIED')" 
                    class="px-2 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors" title="Check-in khách">
              Có khách
            </button>
            <button onclick="changeRoomStatus('${r.hotel_id}', ${r.room_number}, 'MAINTENANCE')" 
                    class="px-2 py-1 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors" title="Bảo trì phòng">
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

async function changeRoomStatus(hotelId, roomNumber, newStatus) {
  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms/${roomNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (json.success) {
      loadAdminRoomMatrix();
      loadDashboardData();
    }
  } catch (err) {
    console.error('Lỗi đổi trạng thái phòng:', err);
  }
}

// 7. Lịch trình Đặt phòng theo Khách sạn & Ngày (Q4)
async function loadHotelSchedule() {
  const hotelId = document.getElementById('scheduleHotelSelect')?.value;
  const startDate = document.getElementById('scheduleStartDate')?.value;
  const endDate = document.getElementById('scheduleEndDate')?.value;
  if (!hotelId) return;

  const container = document.getElementById('scheduleTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tải...</td></tr>';

  try {
    let url = `/api/bookings/hotel/${hotelId}?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;

    const res = await fetch(url);
    const json = await res.json();
    const bookings = json.data || [];

    if (bookings.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">Không có đặt phòng nào trong khoảng ngày này.</td></tr>';
      return;
    }

    container.innerHTML = bookings.map(b => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="p-3 font-mono text-xs font-bold text-blue-600">${b.booking_id.slice(0, 8)}...</td>
        <td class="p-3 font-medium text-slate-900">${b.guest_name || b.guest_id}</td>
        <td class="p-3">Phòng ${b.room_number}</td>
        <td class="p-3">${b.check_in_date}</td>
        <td class="p-3">${b.check_out_date}</td>
        <td class="p-3">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
            b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
            b.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
          }">
            ${b.status}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải lịch trình đặt phòng:', err);
  }
}

// 8. Dashboard Thống kê & Báo cáo Doanh thu (Đề tài 2 & 4)
async function loadDashboardData() {
  try {
    const res = await fetch('/api/analytics/dashboard');
    const json = await res.json();
    if (!json.success) return;

    const stats = json.data;

    // Cập nhật KPIs
    document.getElementById('kpiTotalRooms').innerText = stats.kpi.totalRooms;
    document.getElementById('kpiOccupiedRooms').innerText = stats.kpi.occupiedRooms;
    document.getElementById('kpiAvailableRooms').innerText = stats.kpi.availableRooms;
    document.getElementById('kpiOccupancyRate').innerText = `${stats.kpi.occupancyRate}%`;
    document.getElementById('kpiTotalRevenue').innerText = `${Number(stats.kpi.totalRevenue).toLocaleString('vi-VN')} đ`;
    document.getElementById('kpiTotalBookings').innerText = stats.kpi.totalBookings;

    // Cập nhật biểu đồ Chart.js
    if (typeof renderDashboardCharts === 'function') {
      renderDashboardCharts(stats);
    }

    // Top khách hàng thân thiết (Đề tài 4)
    const topGuestsBody = document.getElementById('topGuestsTableBody');
    if (topGuestsBody && stats.topGuests) {
      topGuestsBody.innerHTML = stats.topGuests.slice(0, 5).map((g, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="p-3 font-bold text-amber-600">#${idx + 1}</td>
          <td class="p-3 font-semibold text-slate-800">${g.name}</td>
          <td class="p-3 font-mono text-xs text-slate-500">${g.guest_id}</td>
          <td class="p-3 text-right font-bold text-blue-600">${g.booking_count} lượt đặt</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Lỗi tải Dashboard:', err);
  }
}

// 9. CQL Live Inspector & Status Monitor
async function loadSystemStatus() {
  try {
    const res = await fetch('/api/analytics/system-status');
    const json = await res.json();
    if (json.success) {
      state.systemStatus = json.data;
      const badge = document.getElementById('dbConnectionBadge');
      if (badge) {
        if (state.systemStatus.connectionMode === 'ASTRA') {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> DataStax Astra DB (Cloud)';
        } else if (state.systemStatus.connectionMode === 'LOCAL') {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Cassandra Local Cluster';
        } else {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Demo Mock Engine (Hotel.cql)';
        }
      }
    }
  } catch (err) {
    console.error('Lỗi tải trạng thái DB:', err);
  }
}

function startCqlLogPoller() {
  fetchCqlLogs();
  setInterval(fetchCqlLogs, 3000);
}

async function fetchCqlLogs() {
  try {
    const res = await fetch('/api/analytics/cql-history');
    const json = await res.json();
    if (json.success && json.data) {
      renderCqlLogs(json.data);
    }
  } catch (err) {
    // im lặng
  }
}

function renderCqlLogs(logs) {
  const container = document.getElementById('cqlLogsContainer');
  const countBadge = document.getElementById('cqlLogCount');
  if (!container) return;

  if (countBadge) countBadge.innerText = logs.length;

  if (logs.length === 0) {
    container.innerHTML = '<div class="text-slate-500 text-xs italic">Chưa có câu lệnh CQL nào được gọi...</div>';
    return;
  }

  container.innerHTML = logs.map(l => `
    <div class="mb-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
      <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span class="text-emerald-400 font-bold">[${l.timestamp}]</span>
        <span class="text-amber-400">${l.executionTimeMs}ms</span>
      </div>
      <div class="text-sky-300 break-words whitespace-pre-wrap">${escapeHtml(l.query)}</div>
      ${l.params && l.params.length > 0 ? `
        <div class="text-[11px] text-slate-400 mt-1 border-t border-slate-800/80 pt-1">
          <span class="text-slate-500">Params:</span> [${l.params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ')}]
        </div>
      ` : ''}
    </div>
  `).join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toggleCqlInspector() {
  const panel = document.getElementById('cqlInspectorPanel');
  panel.classList.toggle('translate-y-full');
}

// Lắng nghe sự kiện người dùng
function setupEventListeners() {
  // Bộ lọc POI
  const poiSelect = document.getElementById('poiFilter');
  if (poiSelect) {
    poiSelect.addEventListener('change', (e) => {
      loadHotels(e.target.value);
    });
  }

  // Thay đổi ngày trong modal đặt phòng
  const modalIn = document.getElementById('modalCheckIn');
  const modalOut = document.getElementById('modalCheckOut');
  if (modalIn) modalIn.addEventListener('change', recalculateBookingTotal);
  if (modalOut) modalOut.addEventListener('change', recalculateBookingTotal);

  // Chọn khách sạn ở Admin Room Matrix
  const adminHotel = document.getElementById('adminHotelSelect');
  if (adminHotel) {
    adminHotel.addEventListener('change', loadAdminRoomMatrix);
  }

  // Chọn khách sạn ở Schedule
  const schedHotel = document.getElementById('scheduleHotelSelect');
  if (schedHotel) {
    schedHotel.addEventListener('change', loadHotelSchedule);
  }
}
