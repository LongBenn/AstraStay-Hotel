// Logic dành riêng cho Cổng Khách Hàng (Guest Portal)
const guestState = {
  hotels: [],
  pois: [],
  selectedHotel: null,
  selectedRoom: null,
  pendingPayment: null
};

document.addEventListener('DOMContentLoaded', () => {
  initGuestDates();
  loadCommonSystemStatus();
  loadGuestPois();
  loadGuestHotels();
  loadRecentBookings();
  loadFeaturedReviews();
  startCqlPoller();
  setupGuestEventListeners();
  initUserSession();

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

  const modalIn = document.getElementById('modalCheckIn');
  const modalOut = document.getElementById('modalCheckOut');
  if (modalIn) modalIn.value = today;
  if (modalOut) modalOut.value = tomorrow;
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

function validateGuestSearchDates() {
  const checkInInput = document.getElementById('searchCheckIn');
  const checkOutInput = document.getElementById('searchCheckOut');

  if (!checkInInput || !checkOutInput) return true;

  const checkInValue = checkInInput.value;
  const checkOutValue = checkOutInput.value;

  if (!checkInValue || !checkOutValue) {
    alert('Vui lòng chọn đầy đủ ngày nhận và ngày trả phòng.');
    return false;
  }

  const checkInDate = new Date(`${checkInValue}T00:00:00`);
  const checkOutDate = new Date(`${checkOutValue}T00:00:00`);

  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    alert('Ngày trả phòng phải lớn hơn ngày nhận phòng.');
    return false;
  }

  return true;
}

function handleGuestSearch() {
  const poi = document.getElementById('poiFilter')?.value || '';
  if (!validateGuestSearchDates()) return;
  const checkin = document.getElementById('searchCheckIn')?.value || '';
  const checkout = document.getElementById('searchCheckOut')?.value || '';
  loadGuestHotels(poi, checkin, checkout);
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
    console.error('Lỗi khi tải danh sách POI:', err);
  }
}

async function loadGuestHotels(poi = '', checkin = '', checkout = '') {
  const params = new URLSearchParams();
  if (poi) params.set('poi', poi);
  if (checkin) params.set('checkin', checkin);
  if (checkout) params.set('checkout', checkout);
  const query = params.toString();
  const url = query ? `/api/hotels?${query}` : '/api/hotels';
  const container = document.getElementById('hotelListContainer');

  if (container) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-600"></i>
        <p>Đang tìm kiếm...</p>
      </div>`;
  }

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Không tải được dữ liệu khách sạn');
    }

    guestState.hotels = json.data || [];
    renderGuestHotelList(guestState.hotels);
  } catch (err) {
    console.error('Lỗi khi tải khách sạn:', err);
    if (container) {
      container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Không thể tìm kiếm khách sạn. Vui lòng thử lại.</div>';
    }
  }
}

function getGuestHotelGallery(hotel) {
  return getHotelGalleryImages(hotel);
}

function renderGuestHotelList(hotels) {
  const container = document.getElementById('hotelListContainer');
  if (!container) return;

  if (hotels.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <div class="brand-mark brand-mark--small mx-auto mb-3"><span>A</span></div>
        <p>Không tìm thấy khách sạn nào phù hợp tại khu vực này.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hotels.map(h => {
    const gallery = getGuestHotelGallery(h);
    const avgRating = (h.average_rating !== undefined && h.average_rating !== null && Number(h.average_rating) > 0)
      ? Number(h.average_rating).toFixed(1)
      : (h.rating ? Number(h.rating).toFixed(1) : '5.0');
    const reviewCount = h.review_count !== undefined && h.review_count !== null ? Number(h.review_count) : 0;

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
        <div class="relative bg-slate-200 overflow-hidden hotel-card-media">
          <div class="hotel-card-gallery">
            ${gallery.map((img, idx) => `
              <img src="${img}" alt="${h.name} - ảnh ${idx + 1}" onerror="hotelImageErrorHandler(this)" class="${idx === 0 ? 'hotel-card-main' : ''}">
            `).join('')}
          </div>
          <div class="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
            <i class="fa-solid fa-star text-xs"></i> ${h.star_rating || 5} Sao
          </div>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">${h.city || 'Việt Nam'}</div>
            <h3 class="text-lg font-bold text-slate-900 mb-1.5">${h.name}</h3>
            
            <!-- Real dynamic rating score and review count badge -->
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-flex items-center gap-1 text-xs font-extrabold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                <i class="fa-solid fa-star text-amber-500 text-[11px]"></i> ${avgRating}
              </span>
              <span class="text-xs text-slate-500 font-medium">(${reviewCount > 0 ? `${reviewCount} đánh giá` : 'Chưa có đánh giá'})</span>
            </div>

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
            <div class="text-xs text-slate-400">Giá chỉ từ <span class="text-sm font-bold text-slate-800">${Number(h.min_price || 800000).toLocaleString('vi-VN')}đ</span>/đêm</div>
            <button onclick="openHotelRoomsModal('${h.hotel_id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer">
              Xem phòng & Đánh giá <i class="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

let currentRoomDetailData = null;

async function openHotelRoomsModal(hotelId) {
  try {
    const hotelRes = await fetch(`/api/hotels/${hotelId}`);
    const hotelJson = await hotelRes.json();
    if (!hotelJson.success) {
      throw new Error('Không thể tải thông tin khách sạn');
    }

    guestState.selectedHotel = hotelJson.data;

    // Thiết lập ngày mặc định cho bộ lọc phòng từ thanh tìm kiếm
    const searchIn = document.getElementById('searchCheckIn')?.value || '2026-03-10';
    const searchOut = document.getElementById('searchCheckOut')?.value || '2026-03-15';
    
    const filterInEl = document.getElementById('modalFilterCheckIn');
    const filterOutEl = document.getElementById('modalFilterCheckOut');
    if (filterInEl) filterInEl.value = searchIn;
    if (filterOutEl) filterOutEl.value = searchOut;

    const titleEl = document.getElementById('modalHotelName');
    const descEl = document.getElementById('modalHotelDesc');
    if (titleEl) titleEl.innerText = guestState.selectedHotel.name;
    if (descEl) descEl.innerText = `${guestState.selectedHotel.address} • Hotline: ${guestState.selectedHotel.phone}`;

    // Mặc định hiển thị tab danh sách phòng
    if (typeof switchHotelModalTab === 'function') {
      switchHotelModalTab('rooms');
    }

    await fetchAndRenderRooms(hotelId);
    document.getElementById('hotelRoomsModal').classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi xem phòng:', err);
    alert('Không thể tải danh sách phòng: ' + err.message);
  }
}

async function applyRoomFilters() {
  if (!guestState.selectedHotel) return;
  await fetchAndRenderRooms(guestState.selectedHotel.hotel_id);
}

async function fetchAndRenderRooms(hotelId) {
  const roomsContainer = document.getElementById('modalRoomsContainer');
  if (!roomsContainer) return;

  const checkIn = document.getElementById('modalFilterCheckIn')?.value || '2026-03-10';
  const checkOut = document.getElementById('modalFilterCheckOut')?.value || '2026-03-15';
  const maxPrice = document.getElementById('modalFilterMaxPrice')?.value || '';
  const minRating = document.getElementById('modalFilterMinRating')?.value || '';

  if (new Date(`${checkOut}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
    roomsContainer.innerHTML = `
      <div class="text-center py-8 bg-amber-50 rounded-2xl border border-amber-200">
        <i class="fa-solid fa-triangle-exclamation text-amber-500 text-3xl mb-2"></i>
        <p class="text-sm font-bold text-amber-900">Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.</p>
        <p class="text-xs text-amber-700 mt-1">Vui lòng điều chỉnh lại ngày nhận và ngày trả phòng trên thanh công cụ.</p>
      </div>`;
    return;
  }

  roomsContainer.innerHTML = `
    <div class="text-center py-12 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-600"></i>
      <p>Đang kiểm tra phòng trống và tính giá theo ngày từ Cassandra...</p>
    </div>`;

  const queryParams = new URLSearchParams({ checkIn, checkOut });
  if (maxPrice) queryParams.set('maxPrice', maxPrice);
  if (minRating) queryParams.set('minRating', minRating);

  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms/search?${queryParams.toString()}`);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Lỗi tra cứu phòng');
    }

    const rooms = json.rooms || [];
    const nights = json.nights || 1;
    const hotelGallery = getGuestHotelGallery(guestState.selectedHotel);

    const galleryMarkup = `
      <div class="room-hero-gallery">
        <div class="main-image">
          <img src="${hotelGallery[0]}" alt="${guestState.selectedHotel.name} - hình ảnh chính" />
        </div>
        ${hotelGallery.slice(1, 4).map((img, idx) => `
          <div class="thumb">
            <img src="${img}" alt="${guestState.selectedHotel.name} - ảnh ${idx + 2}" />
          </div>
        `).join('')}
      </div>
    `;

    if (rooms.length === 0) {
      roomsContainer.innerHTML = galleryMarkup + `
        <div class="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
          <i class="fa-solid fa-hotel text-3xl text-slate-300 mb-2"></i>
          <p class="text-sm font-bold text-slate-700">Không có phòng nào thỏa mãn tiêu chí lọc trong khoảng ngày này.</p>
          <p class="text-xs text-slate-400 mt-1">Vui lòng thử chọn khoảng ngày khác hoặc điều chỉnh mức giá / rating.</p>
        </div>`;
      return;
    }

    const roomMarkup = rooms.map((r, index) => {
      const isAvail = r.is_available === true || Number(r.is_available) === 1;
      const roomImage = hotelGallery[(index + 1) % hotelGallery.length] || hotelGallery[0];
      const encodedRoom = encodeURIComponent(JSON.stringify(r));

      return `
        <div class="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all shadow-sm ${!isAvail ? 'bg-slate-50/70' : 'bg-white'}">
          <div class="room-list-item flex-1">
            <img src="${roomImage}" alt="${r.room_type}" class="room-thumb rounded-xl object-cover w-20 h-20" />
            <div class="w-14 h-14 rounded-xl ${isAvail ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'} font-bold flex flex-col items-center justify-center border flex-shrink-0">
              <span class="text-[10px] uppercase text-slate-400">Phòng</span>
              <span class="text-base">${r.room_number}</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-slate-900 text-sm">${r.room_type}</h4>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}">
                  ${isAvail ? '<i class="fa-solid fa-circle-check text-[10px] mr-1"></i>Còn phòng' : '<i class="fa-solid fa-circle-xmark text-[10px] mr-1"></i>Hết phòng kỳ này'}
                </span>
              </div>
              
              <!-- ĐÁNH GIÁ PHÒNG -->
              <div class="flex items-center gap-2 mt-1 text-xs">
                <span class="font-bold text-amber-500 flex items-center gap-1">
                  <i class="fa-solid fa-star text-xs"></i> ${r.average_rating ? Number(r.average_rating).toFixed(1) : '5.0'}/5
                </span>
                <span class="text-slate-400">&bull;</span>
                <span class="text-slate-500 font-medium">${r.review_count || 0} đánh giá</span>
              </div>

              <div class="text-[11px] text-slate-500 mt-2 flex flex-wrap gap-2.5">
                <span><i class="fa-solid fa-wifi text-blue-500 mr-1"></i> Wi-Fi</span>
                <span><i class="fa-solid fa-snowflake text-sky-500 mr-1"></i> Điều hòa</span>
                <span><i class="fa-solid fa-utensils text-amber-500 mr-1"></i> Buffet sáng</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0">
            <div class="text-left sm:text-right">
              <div class="text-base font-black text-blue-600">${Number(r.price_per_night || 0).toLocaleString('vi-VN')} đ <span class="text-[11px] font-normal text-slate-400">/ đêm</span></div>
              <div class="text-[11px] text-slate-500 font-medium">Tổng ${nights} đêm: <strong class="text-slate-800">${Number(r.total_price || 0).toLocaleString('vi-VN')} đ</strong></div>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button onclick="openRoomDetailModal('${hotelId}', '${encodedRoom}')"
                      class="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 flex-1 sm:flex-initial justify-center">
                <i class="fa-solid fa-circle-info text-blue-600"></i> Chi tiết & Review
              </button>
              
              <button onclick="prepareGuestBookingModal('${hotelId}', ${r.room_number}, '${r.room_type}', ${r.price_per_night}, '${r.room_id || ''}')" ${!isAvail ? 'disabled' : ''}
                      class="px-4 py-2.5 rounded-xl text-xs font-bold ${isAvail ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} transition-all flex-1 sm:flex-initial justify-center">
                ${isAvail ? 'Đặt ngay' : 'Hết phòng'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    roomsContainer.innerHTML = galleryMarkup + roomMarkup;
  } catch (err) {
    console.error('Lỗi tải danh sách phòng:', err);
    roomsContainer.innerHTML = `<div class="text-center py-8 text-red-500 font-semibold">Lỗi: ${err.message}</div>`;
  }
}

function closeGuestHotelRoomsModal() {
  document.getElementById('hotelRoomsModal').classList.add('hidden');
}

// ==============================================================================
// MODAL CHI TIẾT PHÒNG & ĐÁNH GIÁ (REVIEWS & RATING)
// ==============================================================================
async function openRoomDetailModal(hotelId, encodedRoomData) {
  try {
    const room = JSON.parse(decodeURIComponent(encodedRoomData));
    currentRoomDetailData = { hotelId, room };

    const modal = document.getElementById('roomDetailModal');
    if (!modal) return;

    document.getElementById('rdRoomNumberBadge').innerText = `Phòng ${room.room_number}`;
    document.getElementById('rdRoomTypeTitle').innerText = room.room_type;
    document.getElementById('rdHotelNameSub').innerText = guestState.selectedHotel?.name || 'Khách sạn liên kết';
    document.getElementById('rdAvgRating').innerText = Number(room.average_rating || 5.0).toFixed(1);
    document.getElementById('rdReviewCount').innerText = `${room.review_count || 0} đánh giá`;

    // Hiển thị biểu giá chi tiết từng ngày
    const checkIn = document.getElementById('modalFilterCheckIn')?.value || '2026-03-10';
    const checkOut = document.getElementById('modalFilterCheckOut')?.value || '2026-03-15';
    const nights = (room.daily_prices || []).length;
    document.getElementById('rdStayRangeText').innerText = `${checkIn} → ${checkOut} (${nights} đêm)`;
    document.getElementById('rdTotalPriceText').innerText = `${Number(room.total_price || 0).toLocaleString('vi-VN')} đ`;

    const dailyContainer = document.getElementById('rdDailyPricesContainer');
    if (dailyContainer) {
      dailyContainer.innerHTML = (room.daily_prices || []).map(dp => {
        const dObj = new Date(dp.date);
        const dayLabel = dObj.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
        return `
          <div class="bg-white p-2 rounded-xl border border-blue-100 text-center shadow-2xs">
            <div class="text-[10px] text-slate-400 font-semibold">${dayLabel}</div>
            <div class="font-extrabold text-blue-600 text-xs mt-0.5">${Number(dp.price).toLocaleString('vi-VN')} đ</div>
            <div class="text-[9px] ${dp.is_available ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">${dp.is_available ? 'Khả dụng' : 'Đã đặt'}</div>
          </div>
        `;
      }).join('');
    }

    // Tải danh sách review của phòng này từ Cassandra (mới nhất trước)
    await loadRoomReviewsList(hotelId, room.room_id);

    // Cấu hình form đánh giá
    const isAvail = room.is_available === true || Number(room.is_available) === 1;
    const bookBtn = document.getElementById('btnBookFromDetail');
    if (bookBtn) {
      bookBtn.disabled = !isAvail;
      bookBtn.className = `px-6 py-2 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 ${
        isAvail ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
      }`;
    }

    // Reset form review
    document.getElementById('reviewSubmitForm')?.reset();
    setRatingScore(5);
    const alertBox = document.getElementById('reviewAlertBox');
    if (alertBox) alertBox.classList.add('hidden');

    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi mở chi tiết phòng:', err);
    alert('Không thể mở chi tiết phòng: ' + err.message);
  }
}

function closeRoomDetailModal() {
  document.getElementById('roomDetailModal')?.classList.add('hidden');
}

async function loadRoomReviewsList(hotelId, roomId) {
  const container = document.getElementById('rdReviewsListContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-6 text-slate-400 text-xs">
      <i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tải danh sách đánh giá...
    </div>`;

  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms/${roomId}/reviews`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
          <i class="fa-regular fa-comment-dots text-2xl text-slate-300 mb-1"></i>
          <p>Chưa có đánh giá nào cho phòng này. Hãy là người đầu tiên trải nghiệm và để lại nhận xét!</p>
        </div>`;
      return;
    }

    container.innerHTML = json.data.map(rev => {
      const dateStr = rev.review_date ? new Date(rev.review_date).toLocaleDateString('vi-VN') : 'Gần đây';
      const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);

      return `
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                ${(rev.guest_name || 'K').charAt(0).toUpperCase()}
              </div>
              <div>
                <span class="font-bold text-slate-800">${rev.guest_name || rev.guest_id}</span>
                <span class="text-[10px] text-slate-400 ml-1.5 font-mono">Xác thực mã #${rev.confirm_number || 'OK'}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-amber-500 font-bold text-xs tracking-wider">${stars}</span>
              <span class="text-[11px] text-slate-400">${dateStr}</span>
            </div>
          </div>
          <p class="text-slate-700 text-xs pl-9 leading-relaxed mt-1 italic">"${rev.comment}"</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Lỗi tải review:', err);
    container.innerHTML = `<div class="text-xs text-red-500">Không tải được review.</div>`;
  }
}

function setRatingScore(score) {
  document.getElementById('rfRating').value = score;
  const labels = {
    1: '1 sao - Rất tệ',
    2: '2 sao - Tạm được',
    3: '3 sao - Bình thường',
    4: '4 sao - Tốt & Hài lòng',
    5: '5 sao - Xuất sắc'
  };

  const labelEl = document.getElementById('ratingScoreLabel');
  if (labelEl) labelEl.innerText = labels[score] || `${score} sao`;

  const btns = document.querySelectorAll('.star-btn');
  btns.forEach((btn, idx) => {
    if (idx + 1 <= score) {
      btn.classList.add('bg-amber-500', 'text-white', 'border-amber-400');
      btn.classList.remove('bg-white', 'text-amber-500', 'border-slate-200');
    } else {
      btn.classList.remove('bg-amber-500', 'text-white', 'border-amber-400');
      btn.classList.add('bg-white', 'text-amber-500', 'border-slate-200');
    }
  });
}

async function handleReviewSubmit(event) {
  event.preventDefault();
  if (!currentRoomDetailData) return;

  const { hotelId, room } = currentRoomDetailData;
  const confirmNumber = document.getElementById('rfConfirmNumber').value.trim();
  const guestId = document.getElementById('rfGuestId').value.trim();
  const rating = parseInt(document.getElementById('rfRating').value, 10);
  const comment = document.getElementById('rfComment').value.trim();

  const alertBox = document.getElementById('reviewAlertBox');
  const submitBtn = document.getElementById('btnSubmitReview');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi đánh giá...';

  try {
    const res = await fetch(`/api/hotels/${hotelId}/rooms/${room.room_id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_id: hotelId,
        room_id: room.room_id,
        guest_id: guestId,
        confirm_number: parseInt(confirmNumber, 10),
        rating,
        comment
      })
    });

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Không thể gửi đánh giá');
    }

    // Hiển thị thông báo thành công
    alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 block';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> ${json.message}`;

    // Cập nhật rating stats trên giao diện modal
    if (json.data?.summary) {
      document.getElementById('rdAvgRating').innerText = Number(json.data.summary.average_rating).toFixed(1);
      document.getElementById('rdReviewCount').innerText = `${json.data.summary.review_count} đánh giá`;
    }

    // Tải lại danh sách review
    await loadRoomReviewsList(hotelId, room.room_id);

    // Reset textarea
    document.getElementById('rfComment').value = '';

    // Cập nhật danh sách phòng nền
    await fetchAndRenderRooms(hotelId);
  } catch (err) {
    console.error('Lỗi gửi review:', err);
    alertBox.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block';
    alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-600 mr-1.5"></i> ${err.message}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đánh giá';
  }
}

function bookFromDetailModal() {
  if (!currentRoomDetailData) return;
  const { hotelId, room } = currentRoomDetailData;
  closeRoomDetailModal();
  prepareGuestBookingModal(hotelId, room.room_number, room.room_type, room.price_per_night, room.room_id);
}

function prepareGuestBookingModal(hotelId, roomNumber, roomType, pricePerNight, roomId) {
  guestState.selectedRoom = { hotelId, roomNumber, roomType, pricePerNight, roomId };

  document.getElementById('bookingHotelName').innerText = guestState.selectedHotel?.name || 'Khách sạn liên kết';
  document.getElementById('bookingRoomInfo').innerText = `Phòng ${roomNumber} (${roomType})`;
  document.getElementById('bookingRatePerNight').innerText = `${Number(pricePerNight).toLocaleString('vi-VN')} đ/đêm`;

  const filterIn = document.getElementById('modalFilterCheckIn')?.value;
  const filterOut = document.getElementById('modalFilterCheckOut')?.value;
  if (filterIn) document.getElementById('modalCheckIn').value = filterIn;
  if (filterOut) document.getElementById('modalCheckOut').value = filterOut;

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

function generateAstraOrderCode() {
  return `ASTRA-${Date.now()}`;
}

function buildPaymentData() {
  if (!guestState.selectedRoom || !guestState.selectedHotel) return null;

  const guestName = document.getElementById('bookingGuestName').value.trim();
  const guestPhone = document.getElementById('bookingGuestPhone').value.trim();
  const guestEmail = document.getElementById('bookingGuestEmail').value.trim();
  const checkInDate = document.getElementById('modalCheckIn').value;
  const checkOutDate = document.getElementById('modalCheckOut').value;

  if (!guestName || !guestPhone) {
    alert('Vui lòng nhập họ tên và số điện thoại của bạn!');
    return null;
  }

  const { diffDays, grandTotal } = recalculateGuestBookingTotal();
  const orderCode = generateAstraOrderCode();
  const transferContent = orderCode;
  const totalAmount = Number(grandTotal) || 0;

  const payload = {
    guest_id: `GUEST-${Date.now().toString().slice(-4)}`,
    guest_name: guestName,
    guest_phone: guestPhone,
    guest_email: guestEmail,
    hotel_id: guestState.selectedHotel.hotel_id,
    hotel_name: guestState.selectedHotel.name,
    room_number: guestState.selectedRoom.roomNumber,
    room_id: guestState.selectedRoom.roomId || `RM-${guestState.selectedRoom.roomNumber}`,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    price_per_night: guestState.selectedRoom.pricePerNight,
    nights: diffDays,
    order_code: orderCode,
    transfer_content: transferContent,
    payment_status: 'PENDING_PAYMENT',
    order_status: 'Chờ xác nhận thanh toán'
  };

  const paymentData = {
    orderCode,
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountName: 'CÔNG TY ASTRASTAY',
    amount: totalAmount,
    transferContent: transferContent,
    qrData: JSON.stringify({
      bank: 'Vietcombank',
      accountNumber: '0123456789',
      accountName: 'CÔNG TY ASTRASTAY',
      amount: totalAmount,
      transferContent: transferContent,
      orderCode: orderCode
    })
  };

  return { payload, paymentData };
}

function openPaymentModal() {
  const payment = buildPaymentData();
  if (!payment) return;

  guestState.pendingPayment = payment;
  const { paymentData } = payment;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentData.qrData)}`;

  document.getElementById('paymentQrImage').src = qrUrl;
  document.getElementById('paymentBankName').innerText = paymentData.bankName;
  document.getElementById('paymentAccountNumber').innerText = paymentData.accountNumber;
  document.getElementById('paymentAccountName').innerText = paymentData.accountName;
  document.getElementById('paymentAmount').innerText = `${Number(paymentData.amount).toLocaleString('vi-VN')} đ`;
  document.getElementById('paymentContent').innerText = paymentData.transferContent;
  document.getElementById('paymentOrderCode').innerText = paymentData.orderCode;

  document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
}

async function confirmBankTransfer() {
  if (!guestState.pendingPayment) return;

  const { payload, paymentData } = guestState.pendingPayment;
  const isDemoMode = true;
  const submitBtn = document.getElementById('btnSubmitBooking');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang xác nhận thanh toán...';
  }

  try {
    const requestPayload = {
      ...payload,
      payment_status: isDemoMode ? 'PAID' : 'PENDING_PAYMENT',
      order_status: isDemoMode ? 'Thanh toán thành công (Demo)' : 'Chờ xác nhận thanh toán',
      demo_mode: isDemoMode
    };

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });
    const json = await res.json();

    closePaymentModal();

    if (json.success) {
      showSuccessInvoiceModal(json.data, {
        orderCode: paymentData.orderCode,
        statusText: isDemoMode ? 'Thanh toán thành công (Demo)' : 'Chờ xác nhận thanh toán',
        subtitle: isDemoMode ? 'Đây là mô phỏng demo, không phải xác nhận giao dịch thực tế.' : 'Đã ghi nhận yêu cầu thanh toán. Vui lòng chờ xác nhận.'
      });
      loadGuestHotels();
      loadRecentBookings();
    } else {
      alert('Lỗi thanh toán: ' + json.message);
    }
  } catch (err) {
    console.error('Lỗi xác nhận thanh toán:', err);
    alert('Có lỗi xảy ra khi xác nhận thanh toán.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Xác nhận & Thanh toán ngay';
    }
  }
}

async function submitGuestBooking(e) {
  if (e) e.preventDefault();
  if (!guestState.selectedRoom || !guestState.selectedHotel) return;

  const guestName = document.getElementById('bookingGuestName').value.trim();
  const guestPhone = document.getElementById('bookingGuestPhone').value.trim();
  if (!guestName || !guestPhone) {
    alert('Vui lòng nhập họ tên và số điện thoại của bạn!');
    return;
  }

  closeGuestBookingFormModal();
  openPaymentModal();
}

function showSuccessInvoiceModal(bookingData, paymentMeta = {}) {
  const { booking, invoice } = bookingData;

  if (!booking || !invoice) {
    return;
  }

  document.getElementById('successModalTitle').innerText = paymentMeta.statusText === 'Thanh toán thành công (Demo)' ? 'THANH TOÁN THÀNH CÔNG (DEMO)' : 'ĐẶT PHÒNG THÀNH CÔNG';
  document.getElementById('successModalSubtitle').innerText = paymentMeta.subtitle || 'Hoá đơn điện tử thanh toán dịch vụ khách sạn';
  document.getElementById('paymentStatusText').innerText = paymentMeta.statusText || 'Chờ xác nhận thanh toán';

  document.getElementById('invBookingId').innerText = paymentMeta.orderCode || booking.booking_id;
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

  // Q6: Hiển thị mã xác nhận số nguyên Confirm Number
  const confirmNumber = bookingData.confirm_number || booking.confirm_number || '16380824';
  const elConfirm = document.getElementById('invConfirmNumber');
  if (elConfirm) elConfirm.innerText = confirmNumber;

  const copyBtn = document.getElementById('btnCopyBookingId');
  if (copyBtn) {
    copyBtn.onclick = () => copyToClipboard(paymentMeta.orderCode || booking.booking_id, copyBtn);
  }

  document.getElementById('bookingSuccessModal').classList.remove('hidden');
}

function closeSuccessInvoiceModal() {
  document.getElementById('bookingSuccessModal').classList.add('hidden');
}

async function searchBooking() {
  const input = document.getElementById('lookupInput').value.trim();
  const resultContainer = document.getElementById('lookupResultContainer');

  if (!input) {
    alert('Vui lòng nhập Mã Xác Nhận (Q6: 16380824), Mã Đặt Phòng (UUID) hoặc Mã Khách Hàng (GUEST001)');
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
    } else if (/^\d{6,10}$/.test(input)) {
      // Q6: Tra cứu theo mã xác nhận số nguyên Confirm Number
      const res = await fetch(`/api/bookings/confirmation/${encodeURIComponent(input)}`);
      const json = await res.json();
      if (json.success && json.data) {
        bookings = [json.data];
      }
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
          <p class="text-xs text-slate-400 mt-1">Vui lòng kiểm tra lại Mã Xác Nhận (16380824...), UUID hoặc mã khách hàng (GUEST001, GUEST002,...)</p>
        </div>
      `;
      return;
    }

    resultContainer.innerHTML = bookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const isCheckedOut = b.status === 'CHECKED_OUT';
      const confirmNum = b.confirm_number || '16380824';
      return `
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="inline-flex items-center gap-1 font-mono text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-sm">
                  <i class="fa-solid fa-ticket text-amber-500"></i> Mã xác nhận (Q6): ${confirmNum}
                </span>
                <button onclick="copyToClipboard('${confirmNum}', this)" class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" title="Sao chép mã xác nhận">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
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
                isCheckedIn ? 'bg-amber-100 text-amber-800' :
                isCheckedOut ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
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

          <div class="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
            <div class="text-xs">
              <span class="text-slate-400">Tổng thanh toán:</span>
              <span class="font-bold text-blue-600 text-sm ml-1">${Number(b.total_amount).toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="flex items-center gap-2">
              ${isCheckedOut ? `
                <button onclick="checkAndOpenReviewForBooking('${b.booking_id}', '${b.hotel_id}', '${(b.hotel_name || '').replace(/'/g, "\\'")}', 'Phòng ${b.room_number}', '${b.check_in_date}', '${b.check_out_date}')" class="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors flex items-center gap-1.5 border border-amber-200 shadow-sm cursor-pointer">
                  <i class="fa-solid fa-star text-amber-500"></i> Viết / Xem đánh giá
                </button>
              ` : ''}
              ${!isCancelled && !isCheckedOut ? `
                <button onclick="cancelGuestBooking('${b.booking_id}')" class="px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1.5">
                  <i class="fa-solid fa-ban"></i> Huỷ đặt phòng (Cassandra BATCH)
                </button>
              ` : isCancelled ? '<span class="text-xs text-slate-400 italic">Đơn đặt phòng này đã được huỷ</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Lỗi tìm kiếm:', err);
    resultContainer.innerHTML = '<div class="text-red-500 text-center py-6">Lỗi truy vấn dữ liệu từ Cassandra.</div>';
  }
}

async function openReviewModalFromBooking(hotelId, roomId, guestId, confirmNumber, roomNumber, hotelName) {
  try {
    let hotel = (guestState.hotels || []).find(h => h.hotel_id === hotelId);
    if (!hotel) {
      guestState.selectedHotel = { hotel_id: hotelId, name: hotelName || 'Khách sạn liên kết' };
    } else {
      guestState.selectedHotel = hotel;
    }

    let targetRoom = null;
    try {
      const res = await fetch(`/api/hotels/${hotelId}/rooms/pricing?start_date=2026-03-10&end_date=2026-03-11`);
      const json = await res.json();
      targetRoom = (json.data || []).find(r => r.room_id === roomId || String(r.room_number) === String(roomNumber));
    } catch (e) {
      console.warn('Không thể tải trước danh sách phòng:', e);
    }

    if (!targetRoom) {
      targetRoom = {
        room_id: roomId || `RM-${roomNumber}`,
        room_number: roomNumber || '101',
        room_type: 'Phòng đã lưu trú',
        price_per_night: 1500000,
        daily_prices: [],
        total_price: 1500000,
        is_available: false,
        average_rating: 5.0,
        review_count: 0
      };
    }

    await openRoomDetailModal(hotelId, targetRoom);

    // Điền sẵn mã khách hàng và mã xác nhận
    if (guestId) {
      const gInput = document.getElementById('rfGuestId');
      if (gInput) gInput.value = guestId;
    }
    if (confirmNumber) {
      const cInput = document.getElementById('rfConfirmNumber');
      if (cInput) cInput.value = confirmNumber;
    }

    // Cuộn tới form đánh giá
    setTimeout(() => {
      const formEl = document.getElementById('reviewSubmitForm');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  } catch (err) {
    console.error('Lỗi mở form đánh giá:', err);
    alert('Không thể mở giao diện đánh giá: ' + err.message);
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
      const checkin = document.getElementById('searchCheckIn')?.value || '';
      const checkout = document.getElementById('searchCheckOut')?.value || '';
      loadGuestHotels(e.target.value, checkin, checkout);
    });
  }

  const modalIn = document.getElementById('modalCheckIn');
  const modalOut = document.getElementById('modalCheckOut');
  if (modalIn) modalIn.addEventListener('change', recalculateGuestBookingTotal);
  if (modalOut) modalOut.addEventListener('change', recalculateGuestBookingTotal);
}

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
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 class="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">${b.hotel_name || 'Khách sạn liên kết'}</h4>
                <div class="text-[11px] text-slate-500 font-medium">Phòng ${b.room_number} • ${b.check_in_date} → ${b.check_out_date}</div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass} flex-shrink-0">
                ${b.status}
              </span>
            </div>

            <div class="bg-white p-2.5 rounded-xl border border-slate-200/80 my-2 text-xs space-y-1.5">
              <div class="flex items-center justify-between text-slate-700">
                <span class="font-semibold"><i class="fa-regular fa-user text-blue-500 mr-1"></i> ${b.guest_name || 'Khách vãng lai'}</span>
                <span class="font-bold text-blue-600">${Number(b.total_amount).toLocaleString('vi-VN')} đ</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-mono">
                <span><i class="fa-solid fa-ticket text-amber-600 mr-1"></i>Mã Q6: <strong>${b.confirm_number || '16380824'}</strong></span>
                <button onclick="event.stopPropagation(); copyToClipboard('${b.confirm_number || '16380824'}', this)" class="text-amber-700 hover:text-amber-900 text-[10px] font-bold" title="Chép mã xác nhận">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Mã khách: <strong class="text-slate-600">${b.guest_id}</strong></span>
                <button onclick="event.stopPropagation(); copyToClipboard('${b.guest_id}', this)" class="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-0.5" title="Chép mã khách">
                  <i class="fa-regular fa-copy"></i> Chép
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-500 bg-slate-100/90 px-2.5 py-1.5 rounded-xl">
              <span class="truncate max-w-[200px] select-all font-bold" title="${b.booking_id}">${b.booking_id}</span>
              <button onclick="event.stopPropagation(); copyToClipboard('${b.booking_id}', this)" class="text-blue-600 hover:text-blue-800 font-sans text-[10px] font-bold flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-xs" title="Sao chép toàn bộ UUID">
                <i class="fa-regular fa-copy"></i> Chép UUID
              </button>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-end gap-2">
            ${isCheckedOut ? `
              <button onclick="event.stopPropagation(); checkAndOpenReviewForBooking('${b.booking_id}', '${b.hotel_id}', '${(b.hotel_name || '').replace(/'/g, "\\'")}', 'Phòng ${b.room_number}', '${b.check_in_date}', '${b.check_out_date}')" class="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                <i class="fa-solid fa-star text-amber-500"></i> Đánh giá
              </button>
            ` : ''}
            <button onclick="selectRecentBooking('${b.booking_id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer">
              <i class="fa-solid fa-arrow-pointer text-xs"></i> Xem đơn
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
    const resultBox = document.getElementById('lookupResultContainer');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// ==============================================================================
// PHÂN HỆ: ĐÁNH GIÁ & BÌNH LUẬN NỔI BẬT (FEATURED REVIEWS)
// ==============================================================================

async function loadFeaturedReviews(hotelId = '') {
  const container = document.getElementById('featuredReviewsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full text-center py-10 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-600"></i>
      <p class="text-xs">Đang tải những đánh giá nổi bật từ Cassandra...</p>
    </div>
  `;

  try {
    const url = hotelId ? `/api/reviews/featured?hotelId=${encodeURIComponent(hotelId)}` : '/api/reviews/featured';
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Không thể tải đánh giá nổi bật');
    }

    renderFeaturedReviews(json.data || []);
  } catch (err) {
    console.error('Lỗi khi tải đánh giá nổi bật:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
          <p class="text-xs text-slate-500">Chưa thể tải đánh giá nổi bật vào lúc này. Vui lòng thử lại sau.</p>
        </div>
      `;
    }
  }
}

function renderFeaturedReviews(reviews) {
  const container = document.getElementById('featuredReviewsContainer');
  if (!container) return;

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
        <i class="fa-regular fa-comment-dots text-3xl text-slate-300 mb-2"></i>
        <p class="text-xs font-bold text-slate-600">Chưa có đánh giá nổi bật nào cho khách sạn này.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = reviews.map(r => {
    const avatar = r.guest_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    const ratingStars = Array(r.rating || 5).fill('<i class="fa-solid fa-star text-amber-400"></i>').join('');
    
    return `
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
        
        <!-- Background Accent Quote -->
        <i class="fa-solid fa-quote-right absolute -right-3 -bottom-3 text-7xl text-slate-50/80 group-hover:text-blue-50/60 transition-colors pointer-events-none"></i>

        <div>
          <!-- Header: Guest Profile & Verified Badge -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <img src="${avatar}" alt="${r.guest_name}" 
                   class="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-blue-100 flex-shrink-0"
                   onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'">
              <div>
                <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  ${r.guest_name}
                </h4>
                <div class="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>${r.badge_title || 'Khách Hàng Đã Xác Thực'}</span>
                  <span>•</span>
                  <span>${r.stay_date || 'Gần đây'}</span>
                </div>
              </div>
            </div>

            <!-- Verified Stays Badge -->
            <span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0 shadow-xs">
              <i class="fa-solid fa-circle-check text-emerald-600"></i> Xác thực
            </span>
          </div>

          <!-- Star Rating & Score -->
          <div class="flex items-center gap-2 mb-3">
            <div class="flex text-xs">${ratingStars}</div>
            <span class="text-xs font-black text-slate-800 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-mono">${r.rating}.0/5.0</span>
            <span class="text-[10px] font-bold text-amber-600 uppercase tracking-wider ml-auto flex items-center gap-1">
              <i class="fa-solid fa-award"></i> Đánh giá tiêu biểu
            </span>
          </div>

          <!-- Hotel & Room Tag -->
          <div class="mb-3 px-3 py-1.5 bg-slate-50/90 rounded-xl border border-slate-100 text-xs font-bold text-blue-900 flex items-center gap-2">
            <i class="fa-solid fa-hotel text-blue-600 flex-shrink-0"></i>
            <span class="truncate">${r.hotel_name || 'Khách sạn liên kết'}</span>
            <span class="text-slate-300">•</span>
            <span class="text-slate-600 font-semibold truncate">Phòng ${r.room_number || ''} (${r.room_type || 'Phòng Suite'})</span>
          </div>

          <!-- Comment content -->
          <blockquote class="text-xs text-slate-700 italic leading-relaxed mb-4 relative z-10 font-normal">
            "${r.comment}"
          </blockquote>
        </div>

        <!-- Footer: Helpful Counter + Action Button -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between mt-2 relative z-10">
          <button onclick="handleHelpfulVote('${r.review_id}', this)" 
                  class="helpful-btn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50/60 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200 transition-all cursor-pointer">
            <i class="fa-regular fa-heart text-red-500 text-xs"></i>
            <span>Hữu ích</span>
            <span class="helpful-counter font-bold text-slate-700 font-mono ml-0.5">${r.helpful_count || 0}</span>
          </button>

          <button onclick="openHotelRoomsModal('${r.hotel_id}')" 
                  class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
            Xem phòng này <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

function filterFeaturedReviewsByHotel(hotelId, btnElement) {
  const container = document.getElementById('featuredHotelFilterChips');
  if (container) {
    container.querySelectorAll('.featured-chip').forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
      btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    });
  }

  if (btnElement) {
    btnElement.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    btnElement.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
  }

  loadFeaturedReviews(hotelId);
}

async function handleHelpfulVote(reviewId, btnElement) {
  if (!btnElement) return;
  const heartIcon = btnElement.querySelector('i');
  const counterSpan = btnElement.querySelector('.helpful-counter');

  // Prevent multiple clicks
  if (btnElement.dataset.voted === 'true') {
    alert('Bạn đã bình chọn nhận xét này hữu ích rồi!');
    return;
  }

  try {
    const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();

    if (json.success && json.data) {
      if (counterSpan) counterSpan.innerText = json.data.helpful_count;
      btnElement.dataset.voted = 'true';
      btnElement.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
      if (heartIcon) {
        heartIcon.classList.remove('fa-regular');
        heartIcon.classList.add('fa-solid', 'text-red-600', 'scale-125');
      }
    }
  } catch (err) {
    console.error('Lỗi khi vote hữu ích:', err);
  }
}

// ==============================================================================
// PHÂN HỆ: ĐÁNH GIÁ & XẾP HẠNG KHÁCH SẠN (HOTEL REVIEWS & RATING CLIENT)
// ==============================================================================

let currentHotelReviewFilter = {
  hotelId: null,
  star: 'ALL',
  sort: 'newest'
};

const starRatingLabels = {
  1: '1 sao - Rất không hài lòng',
  2: '2 sao - Chưa hài lòng',
  3: '3 sao - Bình thường',
  4: '4 sao - Hài lòng',
  5: '5 sao - Xuất sắc'
};

/**
 * Khởi tạo phiên người dùng demo từ dropdown chọn tài khoản ở navbar
 */
function initUserSession() {
  const userSelect = document.getElementById('currentUserSelector');
  if (!userSelect) return;

  const savedUser = localStorage.getItem('astrastay_current_user') || 'GUEST001';
  userSelect.value = savedUser;

  userSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    localStorage.setItem('astrastay_current_user', selected);
    console.log('[Auth] Switched active guest user to:', selected);

    // Nếu tab review của modal khách sạn đang mở, tải lại để cập nhật quyền sở hữu (is_own_review)
    if (guestState.selectedHotel?.hotel_id && !document.getElementById('hotelModalReviewsSection')?.classList.contains('hidden')) {
      loadHotelReviews(guestState.selectedHotel.hotel_id, currentHotelReviewFilter.star, currentHotelReviewFilter.sort);
    }
  });
}

function getCurrentGuestId() {
  const userSelect = document.getElementById('currentUserSelector');
  if (userSelect && userSelect.value) {
    return userSelect.value;
  }
  return localStorage.getItem('astrastay_current_user') || 'GUEST001';
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const guestId = getCurrentGuestId();
  if (guestId && guestId !== 'GUEST_UNAUTH') {
    headers['x-user-id'] = guestId;
  }
  return headers;
}

/**
 * Chuyển tab giữa "Danh sách phòng" và "Đánh giá của khách hàng" trong Modal khách sạn
 */
function switchHotelModalTab(tabName) {
  const btnRooms = document.getElementById('btnHotelTabRooms');
  const btnReviews = document.getElementById('btnHotelTabReviews');
  const secRooms = document.getElementById('hotelModalRoomsSection');
  const secReviews = document.getElementById('hotelModalReviewsSection');

  if (!btnRooms || !btnReviews || !secRooms || !secReviews) return;

  if (tabName === 'reviews') {
    btnReviews.className = 'flex-1 py-3.5 px-4 text-center font-bold text-xs border-b-2 border-blue-600 text-blue-600 bg-blue-50/50 transition-colors cursor-pointer flex items-center justify-center gap-2';
    btnRooms.className = 'flex-1 py-3.5 px-4 text-center font-semibold text-xs border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2';
    secRooms.classList.add('hidden');
    secReviews.classList.remove('hidden');

    if (guestState.selectedHotel?.hotel_id) {
      loadHotelReviews(guestState.selectedHotel.hotel_id);
    }
  } else {
    btnRooms.className = 'flex-1 py-3.5 px-4 text-center font-bold text-xs border-b-2 border-blue-600 text-blue-600 bg-blue-50/50 transition-colors cursor-pointer flex items-center justify-center gap-2';
    btnReviews.className = 'flex-1 py-3.5 px-4 text-center font-semibold text-xs border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2';
    secRooms.classList.remove('hidden');
    secReviews.classList.add('hidden');
  }
}

/**
 * Tải danh sách đánh giá của khách sạn từ API
 */
async function loadHotelReviews(hotelId, starFilter = 'ALL', sortBy = 'newest') {
  currentHotelReviewFilter = { hotelId, star: starFilter, sort: sortBy };
  const container = document.getElementById('hotelReviewsListContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-10 text-slate-400 text-xs">
      <i class="fa-solid fa-spinner fa-spin text-xl text-blue-600 mb-2"></i>
      <p>Đang tải đánh giá từ cơ sở dữ liệu Cassandra...</p>
    </div>
  `;

  try {
    let url = `/api/hotels/${encodeURIComponent(hotelId)}/reviews?sort=${encodeURIComponent(sortBy)}`;
    if (starFilter && starFilter !== 'ALL') {
      url += `&star=${encodeURIComponent(starFilter)}`;
    }

    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Không thể tải danh sách đánh giá');
    }

    const summary = json.summary || {
      average_rating: 0,
      review_count: 0,
      star_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    renderHotelReviewSummary(summary);
    renderHotelReviewsList(json.data || [], summary);
  } catch (err) {
    console.error('Lỗi tải đánh giá khách sạn:', err);
    container.innerHTML = `
      <div class="text-center py-8 text-red-500 text-xs bg-red-50 rounded-2xl border border-red-200">
        <i class="fa-solid fa-triangle-exclamation mb-1"></i> Không thể tải đánh giá: ${err.message}
      </div>
    `;
  }
}

/**
 * Hiển thị khối tóm tắt điểm và thanh phân bố 5 sao -> 1 sao
 */
function renderHotelReviewSummary(summary) {
  const avgEl = document.getElementById('overviewAvgRating');
  const countEl = document.getElementById('overviewTotalReviews');
  const starsEl = document.getElementById('overviewStarsContainer');

  const avg = Number(summary.average_rating || 0);
  const total = Number(summary.review_count || 0);

  if (avgEl) avgEl.innerText = avg > 0 ? avg.toFixed(1) : '5.0';
  if (countEl) countEl.innerText = total > 0 ? `Dựa trên ${total} đánh giá thật` : 'Chưa có đánh giá nào';

  if (starsEl) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (avg >= i) {
        starsHtml += '<i class="fa-solid fa-star"></i>';
      } else if (avg >= i - 0.5) {
        starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star text-slate-300"></i>';
      }
    }
    starsEl.innerHTML = starsHtml;
  }

  // Cập nhật thanh phân bố 5..1 sao
  const dist = summary.star_distribution || {};
  for (let s = 1; s <= 5; s++) {
    const cnt = Number(dist[s] || 0);
    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
    const fillEl = document.getElementById(`barFill${s}`);
    const textEl = document.getElementById(`barText${s}`);
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (textEl) textEl.innerText = `${pct}% (${cnt})`;
  }
}

/**
 * Hiển thị danh sách các thẻ nhận xét
 */
function renderHotelReviewsList(reviews, summary) {
  const container = document.getElementById('hotelReviewsListContainer');
  if (!container) return;

  if (reviews.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
        <i class="fa-regular fa-comment-dots text-3xl text-slate-300 mb-2"></i>
        <p class="font-bold text-slate-700">Chưa có đánh giá nào phù hợp với bộ lọc</p>
        <p class="text-slate-400 mt-1">Hãy thử chọn lại số sao hoặc hoàn thành kỳ lưu trú để để lại nhận xét đầu tiên!</p>
      </div>
    `;
    return;
  }

  const currentUserId = getCurrentGuestId();

  container.innerHTML = reviews.map(r => {
    const isOwn = r.is_own_review || (currentUserId && r.guest_id === currentUserId);
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Gần đây';
    
    const stayStr = r.stay_date ? `Lưu trú: ${r.stay_date}` : (r.room_number ? `Phòng ${r.room_number}` : 'Đã lưu trú');
    const avatar = r.guest_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.guest_name || 'Khách')}&background=0284c7&color=fff`;

    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= r.rating) {
        starsHtml += '<i class="fa-solid fa-star text-amber-400"></i>';
      } else {
        starsHtml += '<i class="fa-solid fa-star text-slate-200"></i>';
      }
    }

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all duration-200 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="${avatar}" alt="${r.guest_name}" 
                 class="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                 onerror="this.src='https://ui-avatars.com/api/?name=Guest&background=0284c7&color=fff'">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 text-sm">${r.guest_name || 'Khách lưu trú'}</span>
                <span class="verified-stay-badge">
                  <i class="fa-solid fa-circle-check text-emerald-600"></i> Đã lưu trú
                </span>
                ${isOwn ? `
                  <span class="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    Đánh giá của bạn
                  </span>
                ` : ''}
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>${stayStr}</span>
                <span>•</span>
                <span>${dateStr}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex text-xs">${starsHtml}</div>
            <span class="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono">${r.rating}.0</span>
          </div>
        </div>

        <p class="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
          ${escapeHtml(r.comment)}
        </p>

        ${isOwn ? `
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button onclick="openEditReviewDirectly('${r.review_id}')" 
                    class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-pen-to-square"></i> Sửa nhận xét
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function filterHotelReviewsByStar(star, btnElement) {
  const chips = document.querySelectorAll('#reviewStarFilterChips .filter-chip-btn');
  chips.forEach(c => c.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const sortVal = document.getElementById('reviewSortSelect')?.value || 'newest';
  if (guestState.selectedHotel?.hotel_id) {
    loadHotelReviews(guestState.selectedHotel.hotel_id, star, sortVal);
  }
}

function changeHotelReviewSort(sortValue) {
  if (guestState.selectedHotel?.hotel_id) {
    loadHotelReviews(guestState.selectedHotel.hotel_id, currentHotelReviewFilter.star, sortValue);
  }
}

// ------------------------------------------------------------------------------
// XỬ LÝ INTERACTIVE STAR RATING VÀ FORM ĐÁNH GIÁ
// ------------------------------------------------------------------------------

function setInteractiveRating(rating) {
  const hiddenInput = document.getElementById('hrRatingValue');
  if (hiddenInput) hiddenInput.value = rating;
  updateStarIconsUI(rating);
  const labelEl = document.getElementById('starRatingLabelText');
  if (labelEl) labelEl.innerText = starRatingLabels[rating] || `${rating} sao`;
}

function hoverInteractiveRating(rating) {
  updateStarIconsUI(rating);
}

function resetInteractiveHover() {
  const currentRating = parseInt(document.getElementById('hrRatingValue')?.value || '5', 10);
  updateStarIconsUI(currentRating);
}

function updateStarIconsUI(rating) {
  const icons = document.querySelectorAll('#starInteractiveContainer .star-icon');
  icons.forEach((icon, idx) => {
    const starNum = idx + 1;
    if (starNum <= rating) {
      icon.classList.add('active');
    } else {
      icon.classList.remove('active');
    }
  });
}

function handleCommentCharCount(textarea) {
  const len = textarea.value.length;
  const countEl = document.getElementById('commentCharCountText');
  if (!countEl) return;
  countEl.innerText = `${len}/2000 ký tự (Tối thiểu 10)`;
  if (len < 10) {
    countEl.classList.add('text-amber-600');
    countEl.classList.remove('text-slate-400', 'text-emerald-600');
  } else {
    countEl.classList.remove('text-amber-600');
    countEl.classList.add('text-emerald-600');
  }
}

function closeHotelReviewFormModal() {
  document.getElementById('hotelReviewFormModal')?.classList.add('hidden');
}

/**
 * Kiểm tra tính hợp lệ của kỳ lưu trú và mở Form viết hoặc sửa review
 */
async function checkAndOpenReviewForBooking(bookingId, hotelId, hotelName, roomInfo, checkIn, checkOut) {
  const currentUserId = getCurrentGuestId();
  if (!currentUserId || currentUserId === 'GUEST_UNAUTH') {
    alert('Vui lòng chọn một tài khoản khách hàng ở góc phải trên cùng navbar để thực hiện đánh giá!');
    return;
  }

  try {
    const res = await fetch(`/api/reviews/check-eligibility?booking_id=${encodeURIComponent(bookingId)}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();

    if (!json.success) {
      alert(json.message || 'Không thể kiểm tra điều kiện đánh giá');
      return;
    }

    const { can_review, has_reviewed, review, reason, booking } = json.data;

    const modal = document.getElementById('hotelReviewFormModal');
    const titleEl = document.getElementById('hrFormTitle');
    const subtitleEl = document.getElementById('hrFormSubtitle');
    const hotelNameEl = document.getElementById('hrHotelName');
    const stayInfoEl = document.getElementById('hrStayInfo');
    const reviewIdInput = document.getElementById('hrReviewId');
    const bookingIdInput = document.getElementById('hrBookingId');
    const hotelIdInput = document.getElementById('hrHotelId');
    const commentInput = document.getElementById('hrCommentInput');
    const deleteBtn = document.getElementById('btnDeleteOwnReview');
    const alertBox = document.getElementById('hrModalAlert');

    if (alertBox) alertBox.classList.add('hidden');

    hotelNameEl.innerText = hotelName || booking?.hotel_name || 'Khách sạn AstraStay';
    stayInfoEl.innerText = `${roomInfo || `Phòng ${booking?.room_number || ''}`} • ${checkIn || booking?.check_in_date || ''} → ${checkOut || booking?.check_out_date || ''}`;
    bookingIdInput.value = bookingId;
    hotelIdInput.value = hotelId || booking?.hotel_id;

    if (can_review) {
      // Create mode
      titleEl.innerText = 'Viết Đánh Giá Khách Sạn';
      subtitleEl.innerText = 'Chia sẻ trải nghiệm lưu trú chân thực của bạn';
      reviewIdInput.value = '';
      commentInput.value = '';
      setInteractiveRating(5);
      if (deleteBtn) deleteBtn.classList.add('hidden');
      handleCommentCharCount(commentInput);
      modal.classList.remove('hidden');
    } else if (has_reviewed && review) {
      // Edit mode
      titleEl.innerText = 'Chỉnh Sửa Đánh Giá';
      subtitleEl.innerText = 'Cập nhật lại điểm số và nhận xét của bạn';
      reviewIdInput.value = review.review_id;
      commentInput.value = review.comment || '';
      setInteractiveRating(review.rating || 5);
      if (deleteBtn) deleteBtn.classList.remove('hidden');
      handleCommentCharCount(commentInput);
      modal.classList.remove('hidden');
    } else {
      alert(`Không thể đánh giá: ${reason || json.message}`);
    }
  } catch (err) {
    console.error('Lỗi kiểm tra quyền đánh giá:', err);
    alert('Lỗi hệ thống khi kiểm tra thông tin đặt phòng: ' + err.message);
  }
}

/**
 * Mở trực tiếp modal sửa review từ danh sách review của khách sạn
 */
async function openEditReviewDirectly(reviewId) {
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!json.success || !json.data) {
      alert('Không tìm thấy thông tin đánh giá để chỉnh sửa');
      return;
    }

    const review = json.data;
    const modal = document.getElementById('hotelReviewFormModal');
    const titleEl = document.getElementById('hrFormTitle');
    const subtitleEl = document.getElementById('hrFormSubtitle');
    const hotelNameEl = document.getElementById('hrHotelName');
    const stayInfoEl = document.getElementById('hrStayInfo');
    const reviewIdInput = document.getElementById('hrReviewId');
    const bookingIdInput = document.getElementById('hrBookingId');
    const hotelIdInput = document.getElementById('hrHotelId');
    const commentInput = document.getElementById('hrCommentInput');
    const deleteBtn = document.getElementById('btnDeleteOwnReview');
    const alertBox = document.getElementById('hrModalAlert');

    if (alertBox) alertBox.classList.add('hidden');

    titleEl.innerText = 'Chỉnh Sửa Đánh Giá';
    subtitleEl.innerText = 'Cập nhật lại điểm số và nhận xét của bạn';
    reviewIdInput.value = review.review_id;
    bookingIdInput.value = review.booking_id || '';
    hotelIdInput.value = review.hotel_id;
    hotelNameEl.innerText = review.hotel_name || guestState.selectedHotel?.name || 'Khách sạn AstraStay';
    stayInfoEl.innerText = review.room_number ? `Phòng ${review.room_number} • Đã lưu trú` : 'Kỳ nghỉ đã lưu trú';
    commentInput.value = review.comment || '';
    setInteractiveRating(review.rating || 5);
    if (deleteBtn) deleteBtn.classList.remove('hidden');
    handleCommentCharCount(commentInput);
    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi mở chỉnh sửa đánh giá:', err);
    alert('Không thể mở thông tin đánh giá: ' + err.message);
  }
}

/**
 * Submit form Viết / Sửa đánh giá
 */
async function handleHotelReviewSubmit(event) {
  event.preventDefault();

  const reviewId = document.getElementById('hrReviewId')?.value.trim();
  const bookingId = document.getElementById('hrBookingId')?.value.trim();
  const hotelId = document.getElementById('hrHotelId')?.value.trim();
  const rating = parseInt(document.getElementById('hrRatingValue')?.value || '5', 10);
  const comment = document.getElementById('hrCommentInput')?.value.trim();
  const submitBtn = document.getElementById('btnSubmitHotelReview');

  if (!rating || rating < 1 || rating > 5) {
    showHrAlert('Vui lòng chọn số sao đánh giá từ 1 đến 5 sao.', 'error');
    return;
  }

  if (!comment || comment.length < 10) {
    showHrAlert('Nội dung nhận xét phải có tối thiểu 10 ký tự.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang lưu...';

  try {
    let res;
    if (reviewId) {
      res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rating, comment })
      });
    } else {
      res = await fetch(`/api/hotels/${encodeURIComponent(hotelId)}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ booking_id: bookingId, rating, comment })
      });
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Không thể lưu đánh giá');
    }

    showHrAlert(json.message || 'Lưu đánh giá thành công!', 'success');

    setTimeout(() => {
      closeHotelReviewFormModal();
      if (guestState.selectedHotel?.hotel_id === hotelId) {
        loadHotelReviews(hotelId, currentHotelReviewFilter.star, currentHotelReviewFilter.sort);
      }
      loadGuestHotels();
      if (typeof searchBooking === 'function') searchBooking();
    }, 800);
  } catch (err) {
    console.error('Lỗi khi gửi đánh giá:', err);
    showHrAlert(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> Gửi đánh giá';
  }
}

/**
 * Xóa đánh giá của chính người dùng
 */
async function handleDeleteOwnReview() {
  const reviewId = document.getElementById('hrReviewId')?.value.trim();
  const hotelId = document.getElementById('hrHotelId')?.value.trim();
  if (!reviewId) return;

  if (!confirm('Bạn có chắc chắn muốn xóa bài đánh giá này không? Điểm đánh giá của khách sạn sẽ được tính toán lại ngay lập tức.')) {
    return;
  }

  const deleteBtn = document.getElementById('btnDeleteOwnReview');
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang xóa...';

  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Không thể xóa đánh giá');
    }

    showHrAlert('Đã xóa đánh giá thành công!', 'success');

    setTimeout(() => {
      closeHotelReviewFormModal();
      if (guestState.selectedHotel?.hotel_id === hotelId) {
        loadHotelReviews(hotelId, currentHotelReviewFilter.star, currentHotelReviewFilter.sort);
      }
      loadGuestHotels();
      if (typeof searchBooking === 'function') searchBooking();
    }, 800);
  } catch (err) {
    console.error('Lỗi khi xóa đánh giá:', err);
    showHrAlert(err.message, 'error');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can mr-1"></i> Xóa đánh giá';
  }
}

function showHrAlert(msg, type = 'error') {
  const alertBox = document.getElementById('hrModalAlert');
  if (!alertBox) return;
  alertBox.className = type === 'success'
    ? 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 block'
    : 'p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block';
  alertBox.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600'} mr-1.5"></i> ${msg}`;
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

