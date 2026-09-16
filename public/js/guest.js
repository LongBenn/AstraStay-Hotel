// Logic dành riêng cho Cổng Khách Hàng (Guest Portal)
const guestState = {
  hotels: [],
  pois: [],
  selectedHotel: null,
  selectedRoom: null
};

document.addEventListener('DOMContentLoaded', () => {
  initGuestDates();
  loadCommonSystemStatus();
  loadGuestPois();
  loadGuestHotels();
  loadRecentBookings();
  startCqlPoller();
  setupGuestEventListeners();

  // Kiểm tra nếu có tham số lookup từ URL (chuyển từ Admin sang)
  const urlParams = new URLSearchParams(window.location.search);
  const lookupParam = urlParams.get('lookup');
  if (lookupParam) {
    switchGuestTab('tab-lookup');
    const input = document.getElementById('lookupInput');
    if (input) {
      input.value = lookupParam;
      searchBooking();
    }
  }
});

function initGuestDates() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 2);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];

  const inInput = document.getElementById('searchCheckIn');
  const outInput = document.getElementById('searchCheckOut');
  if (inInput) inInput.value = today;
  if (outInput) outInput.value = tomorrow;

  const mIn = document.getElementById('modalCheckIn');
  const mOut = document.getElementById('modalCheckOut');
  if (mIn) mIn.value = today;
  if (mOut) mOut.value = tomorrow;
}

function switchGuestTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.guest-tab-btn').forEach(btn => {
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

  if (tabId === 'tab-lookup') {
    loadRecentBookings();
  }
}

async function loadGuestPois() {
  try {
    const res = await fetch('/api/hotels/pois');
    const json = await res.json();
    if (json.success) {
      guestState.pois = json.data;
      const select = document.getElementById('poiFilter');
      if (select) {
        select.innerHTML = '<option value="">Tất cả địa điểm / Điểm tham quan</option>' + 
          guestState.pois.map(p => `<option value="${p}">${p}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Lỗi tải POI:', err);
  }
}

async function loadGuestHotels(poi = '') {
  try {
    const url = poi ? `/api/hotels?poi=${encodeURIComponent(poi)}` : '/api/hotels';
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      guestState.hotels = json.data;
      renderGuestHotelList(guestState.hotels);
    }
  } catch (err) {
    console.error('Lỗi tải khách sạn:', err);
  }
}

function renderGuestHotelList(hotels) {
  const container = document.getElementById('hotelListContainer');
  if (!container) return;

  if (hotels.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
        <i class="fa-solid fa-hotel text-4xl mb-3 text-slate-300"></i>
        <p class="font-medium text-slate-700">Không tìm thấy khách sạn nào tại khu vực này.</p>
        <p class="text-xs text-slate-400 mt-1">Vui lòng chọn một điểm tham quan khác hoặc xem tất cả.</p>
      </div>`;
    return;
  }

  container.innerHTML = hotels.map(h => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
      <div class="relative h-52 bg-slate-200 overflow-hidden">
        <img src="${h.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}" 
             alt="${h.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        <div class="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
          <i class="fa-solid fa-star text-xs"></i> ${h.star_rating || 5} Sao
        </div>
        <div class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1">
          <i class="fa-solid fa-city text-amber-400"></i> ${h.city || 'Việt Nam'}
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900 mb-1.5">${h.name}</h3>
          <p class="text-xs text-slate-600 mb-2 line-clamp-2">${h.description || ''}</p>
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
          <div>
            <div class="text-[11px] text-slate-400">Giá chỉ từ</div>
            <div class="text-base font-extrabold text-blue-600">700.000đ<span class="text-xs text-slate-400 font-normal">/đêm</span></div>
          </div>
          <button onclick="openGuestHotelRoomsModal('${h.hotel_id}')" 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md">
            Xem phòng <i class="fa-solid fa-arrow-right text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function openGuestHotelRoomsModal(hotelId) {
  try {
    const hotelRes = await fetch(`/api/hotels/${hotelId}`);
    const hotelJson = await hotelRes.json();
    guestState.selectedHotel = hotelJson.data;

    const roomsRes = await fetch(`/api/hotels/${hotelId}/rooms`);
    const roomsJson = await roomsRes.json();
    const rooms = roomsJson.data || [];

    document.getElementById('modalHotelName').innerText = guestState.selectedHotel.name;
    document.getElementById('modalHotelDesc').innerText = `${guestState.selectedHotel.address} • Hotline: ${guestState.selectedHotel.phone}`;

    const container = document.getElementById('modalRoomsContainer');
    if (container) {
      container.innerHTML = rooms.map(r => {
        const isAvail = r.status === 'AVAILABLE';
        return `
          <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors bg-white">
            <div class="flex items-start sm:items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 font-bold flex flex-col items-center justify-center border border-blue-100 flex-shrink-0 shadow-sm">
                <span class="text-[10px] uppercase text-slate-400 font-bold">Phòng</span>
                <span class="text-lg font-black">${r.room_number}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <h4 class="font-bold text-slate-900 text-base">${r.room_type}</h4>
                  <span class="text-[11px] px-2.5 py-0.5 rounded-full font-bold ${isAvail ? 'badge-available' : 'badge-occupied'}">
                    ${isAvail ? 'Sẵn sàng đón khách' : 'Đã có khách'}
                  </span>
                </div>
                <div class="text-xs text-slate-500 flex flex-wrap gap-3">
                  <span><i class="fa-solid fa-wifi text-blue-500 mr-1"></i> Wi-Fi tốc độ cao</span>
                  <span><i class="fa-solid fa-snowflake text-sky-500 mr-1"></i> Điều hoà</span>
                  <span><i class="fa-solid fa-utensils text-amber-500 mr-1"></i> Buffet sáng</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
              <div class="text-right">
                <div class="text-lg font-black text-blue-600">${Number(r.price_per_night).toLocaleString('vi-VN')} đ</div>
                <div class="text-[11px] text-slate-400">/ đêm (chưa VAT)</div>
              </div>
              <button onclick="prepareGuestBookingModal('${r.hotel_id}', ${r.room_number}, '${r.room_type}', ${r.price_per_night}, '${r.room_id || ''}')"
                      ${!isAvail ? 'disabled' : ''}
                      class="px-5 py-2.5 rounded-xl text-xs font-bold ${isAvail ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-md hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} transition-all">
                ${isAvail ? 'Đặt ngay' : 'Hết phòng'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('hotelRoomsModal').classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi xem phòng:', err);
    alert('Không thể tải danh sách phòng.');
  }
}

function closeGuestHotelRoomsModal() {
  document.getElementById('hotelRoomsModal').classList.add('hidden');
}

function prepareGuestBookingModal(hotelId, roomNumber, roomType, pricePerNight, roomId) {
  guestState.selectedRoom = { hotelId, roomNumber, roomType, pricePerNight, roomId };

  document.getElementById('bookingHotelName').innerText = guestState.selectedHotel?.name || 'Khách sạn liên kết';
  document.getElementById('bookingRoomInfo').innerText = `Phòng ${roomNumber} (${roomType})`;
  document.getElementById('bookingRatePerNight').innerText = `${Number(pricePerNight).toLocaleString('vi-VN')} đ/đêm`;

  recalculateGuestBookingTotal();

  closeGuestHotelRoomsModal();
  document.getElementById('bookingFormModal').classList.remove('hidden');
}

function closeGuestBookingFormModal() {
  document.getElementById('bookingFormModal').classList.add('hidden');
}

function recalculateGuestBookingTotal() {
  if (!guestState.selectedRoom) return;

  const inDate = new Date(document.getElementById('modalCheckIn').value);
  const outDate = new Date(document.getElementById('modalCheckOut').value);

  let diffDays = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  if (isNaN(diffDays) || diffDays <= 0) diffDays = 1;

  document.getElementById('summaryNights').innerText = `${diffDays} đêm`;

  const roomTotal = guestState.selectedRoom.pricePerNight * diffDays;
  const serviceCharge = Math.round(roomTotal * 0.05);
  const tax = Math.round((roomTotal + serviceCharge) * 0.1);
  const grandTotal = roomTotal + serviceCharge + tax;

  document.getElementById('summaryRoomTotal').innerText = `${roomTotal.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryServiceCharge').innerText = `${serviceCharge.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryTax').innerText = `${tax.toLocaleString('vi-VN')} đ`;
  document.getElementById('summaryGrandTotal').innerText = `${grandTotal.toLocaleString('vi-VN')} đ`;

  return { diffDays, roomTotal, serviceCharge, tax, grandTotal };
}

async function submitGuestBooking(e) {
  if (e) e.preventDefault();
  if (!guestState.selectedRoom || !guestState.selectedHotel) return;

  const guestName = document.getElementById('bookingGuestName').value.trim();
  const guestPhone = document.getElementById('bookingGuestPhone').value.trim();
  const guestEmail = document.getElementById('bookingGuestEmail').value.trim();
  const checkInDate = document.getElementById('modalCheckIn').value;
  const checkOutDate = document.getElementById('modalCheckOut').value;

  if (!guestName || !guestPhone) {
    alert('Vui lòng nhập họ tên và số điện thoại của bạn!');
    return;
  }

  const { diffDays } = recalculateGuestBookingTotal();

  const payload = {
    guest_id: `GUEST-${Date.now().toString().slice(-4)}`,
    guest_name: guestName,
    hotel_id: guestState.selectedHotel.hotel_id,
    hotel_name: guestState.selectedHotel.name,
    room_number: guestState.selectedRoom.roomNumber,
    room_id: guestState.selectedRoom.roomId || `RM-${guestState.selectedRoom.roomNumber}`,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    price_per_night: guestState.selectedRoom.pricePerNight,
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
      closeGuestBookingFormModal();
      showSuccessInvoiceModal(json.data);
      loadGuestHotels();
      loadRecentBookings();
    } else {
      alert('Lỗi đặt phòng: ' + json.message);
    }
  } catch (err) {
    console.error('Lỗi submit booking:', err);
    alert('Có lỗi xảy ra khi gửi yêu cầu đặt phòng.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Xác nhận & Thanh toán ngay';
    }
  }
}

function showSuccessInvoiceModal(bookingData) {
  const { booking, invoice } = bookingData;

  document.getElementById('invBookingId').innerText = booking.booking_id;
  document.getElementById('invGuestId').innerText = booking.guest_id;
  document.getElementById('invGuestName').innerText = booking.guest_name || 'Quý khách';
  document.getElementById('invHotelName').innerText = booking.hotel_name;
  document.getElementById('invRoomNumber').innerText = `Phòng ${booking.room_number}`;
  document.getElementById('invDates').innerText = `${booking.check_in_date} → ${booking.check_out_date}`;
  document.getElementById('invRoomCharge').innerText = `${Number(invoice.room_charge).toLocaleString('vi-VN')} đ`;
  document.getElementById('invServiceCharge').innerText = `${Number(invoice.service_charge).toLocaleString('vi-VN')} đ`;
  document.getElementById('invTax').innerText = `${Number(invoice.tax).toLocaleString('vi-VN')} đ`;
  document.getElementById('invGrandTotal').innerText = `${Number(invoice.total_amount).toLocaleString('vi-VN')} đ`;
  document.getElementById('invIssuedAt').innerText = new Date(invoice.issued_at).toLocaleString('vi-VN');

  // Nút sao chép mã booking nhanh
  const copyBtn = document.getElementById('btnCopyBookingId');
  if (copyBtn) {
    copyBtn.onclick = () => copyToClipboard(booking.booking_id, copyBtn);
  }

  document.getElementById('bookingSuccessModal').classList.remove('hidden');
}

function closeSuccessInvoiceModal() {
  document.getElementById('bookingSuccessModal').classList.add('hidden');
}

// Tra cứu đặt phòng (Lookup)
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
      const isCheckedIn = b.status === 'CHECKED_IN';
      return `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
            <div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã đặt phòng (UUID):</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-mono text-xs sm:text-sm font-bold text-blue-600 break-all select-all">${b.booking_id}</span>
                <button onclick="copyToClipboard('${b.booking_id}', this)" class="p-1 px-2 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center gap-1 transition-colors" title="Sao chép UUID">
                  <i class="fa-regular fa-copy"></i> Sao chép
                </button>
              </div>
            </div>
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-bold ${
                isCancelled ? 'bg-red-100 text-red-700' :
                isCheckedIn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }">
                ${b.status}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
            <div>
              <div class="text-slate-400">Mã khách hàng</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5 font-mono">${b.guest_id || 'N/A'}</div>
            </div>
            <div>
              <div class="text-slate-400">Khách sạn</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">${b.hotel_name || 'Khách sạn liên kết'}</div>
            </div>
            <div>
              <div class="text-slate-400">Phòng</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">Phòng ${b.room_number}</div>
            </div>
            <div>
              <div class="text-slate-400">Thời gian</div>
              <div class="font-bold text-slate-800 text-sm mt-0.5">${b.check_in_date} → ${b.check_out_date}</div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <div class="text-xs">
              <span class="text-slate-400">Tổng thanh toán:</span> 
              <span class="font-bold text-blue-600 text-sm ml-1">${Number(b.total_amount).toLocaleString('vi-VN')} đ</span>
            </div>
            ${!isCancelled ? `
              <button onclick="cancelGuestBooking('${b.booking_id}')" 
                      class="px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1.5">
                <i class="fa-solid fa-ban"></i> Huỷ đặt phòng (Cassandra BATCH)
              </button>
            ` : '<span class="text-xs text-slate-400 italic">Đơn đặt phòng này đã được huỷ</span>'}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Lỗi tìm kiếm:', err);
    resultContainer.innerHTML = '<div class="text-red-500 text-center py-6">Lỗi truy vấn dữ liệu từ Cassandra.</div>';
  }
}

function setLookupInput(val) {
  const input = document.getElementById('lookupInput');
  if (input) {
    input.value = val;
    searchBooking();
  }
}

async function cancelGuestBooking(bookingId) {
  if (!confirm(`Bạn có chắc chắn muốn huỷ đơn đặt phòng ${bookingId} không? Trạng thái phòng sẽ được hoàn trả về AVAILABLE.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      alert('Đã huỷ đặt phòng thành công!');
      searchBooking();
      loadGuestHotels();
    } else {
      alert('Lỗi huỷ phòng: ' + json.message);
    }
  } catch (err) {
    console.error('Lỗi huỷ phòng:', err);
    alert('Không thể thực hiện huỷ phòng.');
  }
}

function setupGuestEventListeners() {
  const poiSelect = document.getElementById('poiFilter');
  if (poiSelect) {
    poiSelect.addEventListener('change', (e) => {
      loadGuestHotels(e.target.value);
    });
  }

  const modalIn = document.getElementById('modalCheckIn');
  const modalOut = document.getElementById('modalCheckOut');
  if (modalIn) modalIn.addEventListener('change', recalculateGuestBookingTotal);
  if (modalOut) modalOut.addEventListener('change', recalculateGuestBookingTotal);
}

// Tải danh sách đơn đặt gần nhất để khách hàng chọn vào
async function loadRecentBookings() {
  const container = document.getElementById('recentBookingsListContainer');
  if (!container) return;

  container.innerHTML = '<div class="col-span-full text-center py-6 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang tải các đơn đặt gần nhất...</div>';

  try {
    const res = await fetch('/api/bookings/recent?limit=8');
    const json = await res.json();
    const bookings = json.data || [];

    if (bookings.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-6 text-slate-400 text-xs">Chưa có đơn đặt phòng nào gần đây.</div>';
      return;
    }

    container.innerHTML = bookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const isCheckedOut = b.status === 'CHECKED_OUT';

      let badgeClass = 'bg-emerald-100 text-emerald-800';
      if (isCancelled) badgeClass = 'bg-red-100 text-red-700';
      else if (isCheckedIn) badgeClass = 'bg-amber-100 text-amber-800';
      else if (isCheckedOut) badgeClass = 'bg-slate-100 text-slate-700';

      return `
        <div class="bg-slate-50/80 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md">
          <div>
            <!-- Header card: Khách sạn & Trạng thái -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 class="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">${b.hotel_name || 'Khách sạn liên kết'}</h4>
                <div class="text-[11px] text-slate-500 font-medium">Phòng ${b.room_number} • ${b.check_in_date} → ${b.check_out_date}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass} flex-shrink-0">
                ${b.status}
              </span>
            </div>

            <!-- Khách hàng & Mã khách -->
            <div class="bg-white p-2.5 rounded-xl border border-slate-200/80 my-2 text-xs space-y-1">
              <div class="flex items-center justify-between text-slate-700">
                <span class="font-semibold"><i class="fa-regular fa-user text-blue-500 mr-1"></i> ${b.guest_name || 'Khách vãng lai'}</span>
                <span class="font-bold text-blue-600">${Number(b.total_amount).toLocaleString('vi-VN')} đ</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Mã khách: <strong class="text-slate-600">${b.guest_id}</strong></span>
                <button onclick="event.stopPropagation(); copyToClipboard('${b.guest_id}', this)" class="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-0.5" title="Chép mã khách">
                  <i class="fa-regular fa-copy"></i> Chép
                </button>
              </div>
            </div>

            <!-- Mã UUID -->
            <div class="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-500 bg-slate-100/90 px-2.5 py-1.5 rounded-xl">
              <span class="truncate max-w-[200px] select-all font-bold" title="${b.booking_id}">${b.booking_id}</span>
              <button onclick="event.stopPropagation(); copyToClipboard('${b.booking_id}', this)" class="text-blue-600 hover:text-blue-800 font-sans text-[10px] font-bold flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-xs" title="Sao chép toàn bộ UUID">
                <i class="fa-regular fa-copy"></i> Chép UUID
              </button>
            </div>
          </div>

          <!-- Nút chọn xem đơn này -->
          <div class="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-end">
            <button onclick="selectRecentBooking('${b.booking_id}')" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer">
              <i class="fa-solid fa-arrow-pointer text-xs"></i> Chọn xem đơn này
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Lỗi tải danh sách đơn đặt gần nhất:', err);
    container.innerHTML = '<div class="col-span-full text-center py-4 text-red-500 text-xs">Không thể tải danh sách đơn đặt gần đây.</div>';
  }
}

function selectRecentBooking(bookingId) {
  const input = document.getElementById('lookupInput');
  if (input) {
    input.value = bookingId;
    searchBooking();
    // Cuộn mượt lên kết quả
    const resultBox = document.getElementById('lookupResultContainer');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
