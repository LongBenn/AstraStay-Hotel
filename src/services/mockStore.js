// Dữ liệu hạt giống mở rộng phong phú chuẩn theo Hotel.cql và Tài liệu hướng dẫn Cassandra Astra DB
const { v4: uuidv4 } = require('uuid');

// 1. DANH SÁCH KHÁCH SẠN (10 khách sạn tiêu chuẩn 4 - 5 sao trên cả nước)
const hotels = [
  {
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    name: 'Khách sạn Rex Sài Gòn',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3829 2185',
    address: '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    description: 'Biểu tượng khách sạn 5 sao di sản ngay trục phố đi bộ Nguyễn Huệ lịch sử.'
  },
  {
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    name: 'Khách sạn Caravelle Sài Gòn',
    city: 'TP. Hồ Chí Minh',
    phone: '028 3823 4999',
    address: '19-23 Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    description: 'Trái tim của Sài Gòn, đối diện Nhà hát Thành phố với quầy bar tầng thượng trứ danh.'
  },
  {
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    name: 'Khách sạn Sofitel Legend Metropole Hà Nội',
    city: 'Hà Nội',
    phone: '024 3826 6919',
    address: '15 Ngô Quyền, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    description: 'Kiến trúc Pháp cổ thanh lịch, không gian yên bình cạnh hồ Hoàn Kiếm huyền bí.'
  },
  {
    hotel_id: 'HTL001',
    name: 'Saigon Riverside Hotel',
    city: 'TP. Hồ Chí Minh',
    phone: '028-1234567',
    address: '123 Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    star_rating: 4,
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    description: 'Khách sạn ven sông Sài Gòn với tầm nhìn khoáng đạt, đón gió sông trong lành.'
  },
  {
    hotel_id: 'HTL002',
    name: 'Hanoi Old Quarter Hotel',
    city: 'Hà Nội',
    phone: '024-7654321',
    address: '45 Hàng Bạc, Hàng Bạc, Hoàn Kiếm, TP. Hà Nội',
    star_rating: 4,
    image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    description: 'Khách sạn boutique ấm cúng mang phong cách phố cổ 36 phố phường Hà Nội.'
  },
  {
    hotel_id: 'HTL003-DN',
    name: 'InterContinental Danang Sun Peninsula',
    city: 'Đà Nẵng',
    phone: '0236 393 8888',
    address: 'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, TP. Đà Nẵng',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
    description: 'Khu nghỉ dưỡng sang trọng hàng đầu thế giới ẩn mình giữa thiên nhiên bán đảo Sơn Trà.'
  },
  {
    hotel_id: 'HTL004-DN',
    name: 'Novotel Danang Premier Han River',
    city: 'Đà Nẵng',
    phone: '0236 392 9999',
    address: '36 Bạch Đằng, Hải Châu 1, Hải Châu, TP. Đà Nẵng',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    description: 'Khách sạn cao tầng bên bờ sông Hàn với tầm nhìn ngắm trọn Cầu Rồng phun lửa.'
  },
  {
    hotel_id: 'HTL005-NT',
    name: 'Vinpearl Resort & Spa Nha Trang Bay',
    city: 'Nha Trang',
    phone: '0258 359 8900',
    address: 'Đảo Hòn Tre, Vĩnh Nguyên, TP. Nha Trang, Khánh Hòa',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    description: 'Thiên đường nghỉ dưỡng biển đảo biệt lập với bãi cát trắng mịn và làn nước xanh như ngọc.'
  },
  {
    hotel_id: 'HTL006-PQ',
    name: 'JW Marriott Phu Quoc Emerald Bay',
    city: 'Phú Quốc',
    phone: '0297 377 9999',
    address: 'Bãi Khem, An Thới, TP. Phú Quốc, Kiên Giang',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=800&q=80',
    description: 'Kiệt tác kiến trúc đại học huyền thoại bên bờ biển Bãi Khem đẹp nhất Phú Quốc.'
  },
  {
    hotel_id: 'HTL007-DL',
    name: 'Dalat Palace Heritage Hotel',
    city: 'Đà Lạt',
    phone: '0263 382 5444',
    address: '02 Trần Phú, Phường 3, TP. Đà Lạt, Lâm Đồng',
    star_rating: 5,
    image_url: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=800&q=80',
    description: 'Dinh thự Pháp cổ điển từ thập niên 1920 nhìn thẳng ra vẻ mộng mơ của hồ Xuân Hương.'
  }
];

// 2. KHÁCH SẠN THEO ĐIỂM THAM QUAN (hotels_by_poi - Q1)
const hotels_by_poi = [
  // TP. Hồ Chí Minh
  {
    poi_name: 'Chợ Bến Thành',
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    name: 'Khách sạn Rex Sài Gòn',
    phone: '028 3829 2185',
    address: '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },
  {
    poi_name: 'Chợ Bến Thành',
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    name: 'Khách sạn Caravelle Sài Gòn',
    phone: '028 3823 4999',
    address: '19-23 Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },
  {
    poi_name: 'Phố đi bộ Nguyễn Huệ',
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    name: 'Khách sạn Rex Sài Gòn',
    phone: '028 3829 2185',
    address: '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },
  {
    poi_name: 'Nhà hát Thành phố',
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    name: 'Khách sạn Caravelle Sài Gòn',
    phone: '028 3823 4999',
    address: '19-23 Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },
  {
    poi_name: 'Bến Bạch Đằng',
    hotel_id: 'HTL001',
    name: 'Saigon Riverside Hotel',
    phone: '028-1234567',
    address: '123 Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },

  // Hà Nội
  {
    poi_name: 'Hồ Hoàn Kiếm',
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    name: 'Khách sạn Sofitel Legend Metropole Hà Nội',
    phone: '024 3826 6919',
    address: '15 Ngô Quyền, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội'
  },
  {
    poi_name: 'Hồ Hoàn Kiếm',
    hotel_id: 'HTL002',
    name: 'Hanoi Old Quarter Hotel',
    phone: '024-7654321',
    address: '45 Hàng Bạc, Hoàn Kiếm, TP. Hà Nội'
  },
  {
    poi_name: 'Nhà thờ Lớn Hà Nội',
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    name: 'Khách sạn Sofitel Legend Metropole Hà Nội',
    phone: '024 3826 6919',
    address: '15 Ngô Quyền, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội'
  },

  // Đà Nẵng
  {
    poi_name: 'Cầu Rồng Đà Nẵng',
    hotel_id: 'HTL004-DN',
    name: 'Novotel Danang Premier Han River',
    phone: '0236 392 9999',
    address: '36 Bạch Đằng, Hải Châu 1, Hải Châu, TP. Đà Nẵng'
  },
  {
    poi_name: 'Bán đảo Sơn Trà',
    hotel_id: 'HTL003-DN',
    name: 'InterContinental Danang Sun Peninsula',
    phone: '0236 393 8888',
    address: 'Bán đảo Sơn Trà, Thọ Quang, Sơn Trà, TP. Đà Nẵng'
  },
  {
    poi_name: 'Bãi biển Mỹ Khê',
    hotel_id: 'HTL004-DN',
    name: 'Novotel Danang Premier Han River',
    phone: '0236 392 9999',
    address: '36 Bạch Đằng, Hải Châu 1, Hải Châu, TP. Đà Nẵng'
  },

  // Nha Trang, Phú Quốc, Đà Lạt
  {
    poi_name: 'Vịnh Nha Trang',
    hotel_id: 'HTL005-NT',
    name: 'Vinpearl Resort & Spa Nha Trang Bay',
    phone: '0258 359 8900',
    address: 'Đảo Hòn Tre, Vĩnh Nguyên, TP. Nha Trang, Khánh Hòa'
  },
  {
    poi_name: 'Bãi Khem Phú Quốc',
    hotel_id: 'HTL006-PQ',
    name: 'JW Marriott Phu Quoc Emerald Bay',
    phone: '0297 377 9999',
    address: 'Bãi Khem, An Thới, TP. Phú Quốc, Kiên Giang'
  },
  {
    poi_name: 'Hồ Xuân Hương Đà Lạt',
    hotel_id: 'HTL007-DL',
    name: 'Dalat Palace Heritage Hotel',
    phone: '0263 382 5444',
    address: '02 Trần Phú, Phường 3, TP. Đà Lạt, Lâm Đồng'
  }
];

// 3. ĐIỂM THAM QUAN THEO KHÁCH SẠN (pois_by_hotel - Q3)
const pois_by_hotel = [
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', poi_name: 'Chợ Bến Thành', description: 'Khu chợ biểu tượng lịch sử và thiên đường ẩm thực Sài Gòn' },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', poi_name: 'Phố đi bộ Nguyễn Huệ', description: 'Không gian dạo chơi, biểu diễn nghệ thuật đường phố náo nhiệt' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', poi_name: 'Nhà hát Thành phố', description: 'Công trình kiến trúc Gothic Pháp cổ kính ngay đối diện khách sạn' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', poi_name: 'Chợ Bến Thành', description: 'Chợ truyền thống lâu đời bậc nhất trung tâm Quận 1' },
  { hotel_id: 'HTL001', poi_name: 'Bến Bạch Đằng', description: 'Công viên bến tàu du lịch ngắm hoàng hôn trên sông Sài Gòn' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', poi_name: 'Hồ Hoàn Kiếm', description: 'Trái tim của thủ đô nghìn năm văn hiến, Tháp Rùa và cầu Thê Húc' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', poi_name: 'Nhà thờ Lớn Hà Nội', description: 'Kiến trúc Gothic cổ kính xây dựng từ thế kỷ 19' },
  { hotel_id: 'HTL002', poi_name: 'Hồ Hoàn Kiếm', description: 'Chỉ 3 phút đi bộ ra bờ hồ Tháp Rùa lịch sử' },
  { hotel_id: 'HTL003-DN', poi_name: 'Bán đảo Sơn Trà', description: 'Lá phổi xanh của Đà Nẵng với hệ sinh thái linh trưởng Voọc chà vá chân nâu quý hiếm' },
  { hotel_id: 'HTL004-DN', poi_name: 'Cầu Rồng Đà Nẵng', description: 'Cây cầu biểu tượng với màn trình diễn phun lửa và phun nước cuối tuần' },
  { hotel_id: 'HTL004-DN', poi_name: 'Bãi biển Mỹ Khê', description: 'Một trong sáu bãi biển quyến rũ nhất hành tinh do Forbes bình chọn' },
  { hotel_id: 'HTL005-NT', poi_name: 'Vịnh Nha Trang', description: 'Một trong những vịnh biển đẹp nhất thế giới với rạn san hô phong phú' },
  { hotel_id: 'HTL006-PQ', poi_name: 'Bãi Khem Phú Quốc', description: 'Bãi biển hình cánh cung với bờ cát trắng mịn như kem và nước biển màu ngọc bích' },
  { hotel_id: 'HTL007-DL', poi_name: 'Hồ Xuân Hương Đà Lạt', description: 'Mặt hồ phẳng lặng mộng mơ được bao quanh bởi rặng thông xanh ngát' }
];

// 4. DANH SÁCH PHÒNG THEO KHÁCH SẠN (rooms_by_hotel - Q2, 50 phòng)
const rooms_by_hotel = [
  // Rex Hotel Sài Gòn (5 phòng)
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_number: 101, room_id: 'CH-101', room_type: 'Standard Deluxe', price_per_night: 1500000, status: 'AVAILABLE' },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_number: 102, room_id: 'CH-102', room_type: 'Executive Heritage', price_per_night: 2200000, status: 'OCCUPIED' },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_number: 201, room_id: 'CH-201', room_type: 'Junior Suite', price_per_night: 3800000, status: 'AVAILABLE' },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_number: 202, room_id: 'CH-234', room_type: 'Rex Suite City View', price_per_night: 1800000, status: 'AVAILABLE' },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_number: 301, room_id: 'CH-301', room_type: 'Presidential Suite', price_per_night: 7500000, status: 'MAINTENANCE' },

  // Caravelle Hotel (5 phòng)
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_number: 101, room_id: 'CV-101', room_type: 'Deluxe City View', price_per_night: 1800000, status: 'AVAILABLE' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_number: 102, room_id: 'CV-102', room_type: 'Opera Deluxe', price_per_night: 2500000, status: 'AVAILABLE' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_number: 201, room_id: 'kdefgt', room_type: 'Signature Suite', price_per_night: 4200000, status: 'OCCUPIED' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_number: 202, room_id: 'CV-202', room_type: 'Heritage Suite', price_per_night: 2600000, status: 'AVAILABLE' },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_number: 301, room_id: 'CV-301', room_type: 'Executive Club', price_per_night: 5200000, status: 'OCCUPIED' },

  // Metropole Hà Nội (5 phòng)
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_number: 101, room_id: '12-CFG', room_type: 'Heritage Deluxe', price_per_night: 3200000, status: 'OCCUPIED' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_number: 102, room_id: 'MP-102', room_type: 'Opera Wing Suite', price_per_night: 5500000, status: 'AVAILABLE' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_number: 201, room_id: 'MP-201', room_type: 'Grand Luxury French', price_per_night: 4100000, status: 'AVAILABLE' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_number: 202, room_id: 'MP-202', room_type: 'Legendary Suite', price_per_night: 6800000, status: 'AVAILABLE' },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_number: 301, room_id: 'MP-301', room_type: 'Imperial Suite', price_per_night: 11000000, status: 'MAINTENANCE' },

  // Saigon Riverside (4 phòng)
  { hotel_id: 'HTL001', room_number: 101, room_id: 'SR-101', room_type: 'Standard River View', price_per_night: 800000, status: 'AVAILABLE' },
  { hotel_id: 'HTL001', room_number: 102, room_id: 'SR-102', room_type: 'Deluxe Balcony', price_per_night: 1200000, status: 'OCCUPIED' },
  { hotel_id: 'HTL001', room_number: 201, room_id: 'SR-201', room_type: 'Riverside Suite', price_per_night: 2500000, status: 'AVAILABLE' },
  { hotel_id: 'HTL001', room_number: 202, room_id: 'SR-202', room_type: 'Family Riverfront', price_per_night: 1900000, status: 'AVAILABLE' },

  // Hanoi Old Quarter (4 phòng)
  { hotel_id: 'HTL002', room_number: 101, room_id: 'HQ-101', room_type: 'Superior Cozy', price_per_night: 700000, status: 'AVAILABLE' },
  { hotel_id: 'HTL002', room_number: 102, room_id: 'HQ-102', room_type: 'Old Town Window', price_per_night: 950000, status: 'AVAILABLE' },
  { hotel_id: 'HTL002', room_number: 201, room_id: 'HQ-201', room_type: 'Deluxe Balcony', price_per_night: 1350000, status: 'OCCUPIED' },
  { hotel_id: 'HTL002', room_number: 202, room_id: 'HQ-202', room_type: 'Family Suite', price_per_night: 1800000, status: 'AVAILABLE' },

  // InterContinental Danang Sun Peninsula (5 phòng)
  { hotel_id: 'HTL003-DN', room_number: 101, room_id: 'IC-101', room_type: 'Resort Classic Oceanview', price_per_night: 4500000, status: 'AVAILABLE' },
  { hotel_id: 'HTL003-DN', room_number: 102, room_id: 'IC-102', room_type: 'Club InterContinental Terrace', price_per_night: 6800000, status: 'OCCUPIED' },
  { hotel_id: 'HTL003-DN', room_number: 201, room_id: 'IC-201', room_type: 'Heaven Penthouse Suite', price_per_night: 9200000, status: 'AVAILABLE' },
  { hotel_id: 'HTL003-DN', room_number: 202, room_id: 'IC-202', room_type: 'Sun Peninsula Residence Villa', price_per_night: 12500000, status: 'AVAILABLE' },
  { hotel_id: 'HTL003-DN', room_number: 301, room_id: 'IC-301', room_type: 'Seaside Pool Villa', price_per_night: 14000000, status: 'MAINTENANCE' },

  // Novotel Danang Premier Han River (5 phòng)
  { hotel_id: 'HTL004-DN', room_number: 101, room_id: 'NV-101', room_type: 'Superior River View', price_per_night: 1450000, status: 'AVAILABLE' },
  { hotel_id: 'HTL004-DN', room_number: 102, room_id: 'NV-102', room_type: 'Executive Room with Lounge', price_per_night: 2350000, status: 'OCCUPIED' },
  { hotel_id: 'HTL004-DN', room_number: 201, room_id: 'NV-201', room_type: 'Studio Apartment', price_per_night: 3100000, status: 'AVAILABLE' },
  { hotel_id: 'HTL004-DN', room_number: 202, room_id: 'NV-202', room_type: 'Deluxe Suite Bridge View', price_per_night: 3800000, status: 'AVAILABLE' },
  { hotel_id: 'HTL004-DN', room_number: 301, room_id: 'NV-301', room_type: 'Presidential Suite High Floor', price_per_night: 8500000, status: 'AVAILABLE' },

  // Vinpearl Nha Trang Bay (5 phòng)
  { hotel_id: 'HTL005-NT', room_number: 101, room_id: 'VP-101', room_type: 'Deluxe King Ocean View', price_per_night: 2100000, status: 'AVAILABLE' },
  { hotel_id: 'HTL005-NT', room_number: 102, room_id: 'VP-102', room_type: 'Grand Deluxe Bay View', price_per_night: 2900000, status: 'OCCUPIED' },
  { hotel_id: 'HTL005-NT', room_number: 201, room_id: 'VP-201', room_type: '2-Bedroom Villa Private Pool', price_per_night: 5800000, status: 'AVAILABLE' },
  { hotel_id: 'HTL005-NT', room_number: 202, room_id: 'VP-202', room_type: '3-Bedroom Oceanfront Villa', price_per_night: 8900000, status: 'AVAILABLE' },
  { hotel_id: 'HTL005-NT', room_number: 301, room_id: 'VP-301', room_type: 'Presidential Beachfront Villa', price_per_night: 13000000, status: 'OCCUPIED' },

  // JW Marriott Phu Quoc (5 phòng)
  { hotel_id: 'HTL006-PQ', room_number: 101, room_id: 'JW-101', room_type: 'Emerald Bay King Balcony', price_per_night: 5100000, status: 'AVAILABLE' },
  { hotel_id: 'HTL006-PQ', room_number: 102, room_id: 'JW-102', room_type: 'Rue De Lamarck Suite', price_per_night: 7200000, status: 'OCCUPIED' },
  { hotel_id: 'HTL006-PQ', room_number: 201, room_id: 'JW-201', room_type: 'Turquoise Oceanfront Suite', price_per_night: 9500000, status: 'AVAILABLE' },
  { hotel_id: 'HTL006-PQ', room_number: 202, room_id: 'JW-202', room_type: '1-Bedroom Villa Private Pool', price_per_night: 12000000, status: 'AVAILABLE' },
  { hotel_id: 'HTL006-PQ', room_number: 301, room_id: 'JW-301', room_type: 'Lamarck House Grand Villa', price_per_night: 18500000, status: 'AVAILABLE' },

  // Dalat Palace Heritage (5 phòng)
  { hotel_id: 'HTL007-DL', room_number: 101, room_id: 'DP-101', room_type: 'Superior Lake View', price_per_night: 1950000, status: 'AVAILABLE' },
  { hotel_id: 'HTL007-DL', room_number: 102, room_id: 'DP-102', room_type: 'Luxury Heritage Classic', price_per_night: 2800000, status: 'AVAILABLE' },
  { hotel_id: 'HTL007-DL', room_number: 201, room_id: 'DP-201', room_type: 'Palace Suite with Fireplace', price_per_night: 4200000, status: 'OCCUPIED' },
  { hotel_id: 'HTL007-DL', room_number: 202, room_id: 'DP-202', room_type: 'Royal Suite Pine Garden', price_per_night: 5600000, status: 'AVAILABLE' },
  { hotel_id: 'HTL007-DL', room_number: 301, room_id: 'DP-301', room_type: 'Imperial French Suite', price_per_night: 7900000, status: 'MAINTENANCE' }
];

// 5. TIỆN ÍCH PHÒNG (amenities_by_room - Q5)
const amenities_by_room = [
  // Rex Hotel CH-234
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_id: 'CH-234', amenity_name: 'Điều hòa 2 chiều Daikin', description: 'Hệ thống lọc không khí ion khử khuẩn tự động', rate: 1800000 },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_id: 'CH-234', amenity_name: 'Buffet sáng tiêu chuẩn 5 sao', description: 'Bữa sáng thực đơn Á - Âu tự chọn tại nhà hàng tầng thượng', rate: 1800000 },
  { hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f', room_id: 'CH-234', amenity_name: 'Bồn tắm massage Jacuzzi', description: 'Trải nghiệm ngâm bồn thư giãn với thảo mộc tự nhiên', rate: 1800000 },

  // Caravelle Hotel kdefgt
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_id: 'kdefgt', amenity_name: 'Internet cáp quang 500Mbps', description: 'Wi-Fi phủ sóng toàn phòng tốc độ cao miễn phí', rate: 4200000 },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_id: 'kdefgt', amenity_name: 'Hồ bơi vô cực ngoài trời', description: 'Bể bơi tầng cao ngắm trọn cảnh đêm sông Sài Gòn', rate: 4200000 },
  { hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e', room_id: 'kdefgt', amenity_name: 'Dịch vụ quản gia cao cấp', description: 'Phục vụ trà chiều và cocktail miễn phí tại Executive Lounge', rate: 4200000 },

  // Metropole Hà Nội 12-CFG
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_id: '12-CFG', amenity_name: 'Phòng tắm lát đá cẩm thạch Pháp', description: 'Kèm bộ sản phẩm chăm sóc cao cấp Hermes', rate: 3200000 },
  { hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b', room_id: '12-CFG', amenity_name: 'Thưởng thức trà chiều Le Club', description: 'Tiệc trà chiều phong cách quý tộc Pháp hàng ngày', rate: 3200000 },

  // InterContinental Danang IC-101
  { hotel_id: 'HTL003-DN', room_id: 'IC-101', amenity_name: 'Ban công ngắm trọn vịnh Bãi Bắc', description: 'Bàn ghế mây thư giãn hướng thẳng ra biển Đông', rate: 4500000 },
  { hotel_id: 'HTL003-DN', room_id: 'IC-101', amenity_name: 'Tàu điện cáp Nam Tràm Funifunicular', description: 'Trải nghiệm di chuyển 4 tầng cảnh quan Heaven - Sky - Earth - Sea', rate: 4500000 },

  // JW Marriott Phu Quoc JW-101
  { hotel_id: 'HTL006-PQ', room_id: 'JW-101', amenity_name: 'Bể bơi vỏ sò Seashell Pool', description: 'Hồ bơi biểu tượng đoạt nhiều giải thưởng kiến trúc thế giới', rate: 5100000 },
  { hotel_id: 'HTL006-PQ', room_id: 'JW-101', amenity_name: 'Xe đạp dạo quanh khuôn viên', description: 'Miễn phí trải nghiệm khuôn viên đại học Lamarck huyền thoại', rate: 5100000 }
];

// 6. DANH SÁCH KHÁCH HÀNG (guests - Q9, 15 khách hàng thân thiết)
const guests = [
  {
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    first_name: 'Văn An',
    last_name: 'Nguyễn',
    email: 'vanan.nguyen@gmail.com',
    phone_numbers: '0903123456',
    addresses: '128 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh'
  },
  {
    guest_id: '0eacb0ae-a973-4bfd-9818-9a927b713cf4',
    first_name: 'Thị Mai',
    last_name: 'Trần',
    email: 'thimai.tran@gmail.com',
    phone_numbers: '0918765432',
    addresses: '45 Hoàng Hoa Thám, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh'
  },
  {
    guest_id: 'GUEST001',
    first_name: 'Văn A',
    last_name: 'Nguyễn',
    email: 'nguyenvana@gmail.com',
    phone_numbers: '0988776655',
    addresses: '100 Lê Duẩn, Quận 1, TP. Hồ Chí Minh'
  },
  {
    guest_id: 'GUEST002',
    first_name: 'Thị B',
    last_name: 'Trần',
    email: 'tranthib@gmail.com',
    phone_numbers: '0977665544',
    addresses: '200 Kim Mã, Ba Đình, TP. Hà Nội'
  },
  {
    guest_id: 'GUEST003',
    first_name: 'Quang Dũng',
    last_name: 'Lê',
    email: 'quangdung.le@gmail.com',
    phone_numbers: '0912334455',
    addresses: '78 Nguyễn Thị Minh Khai, Quận Hải Châu, TP. Đà Nẵng'
  },
  {
    guest_id: 'GUEST004',
    first_name: 'Thị Hương',
    last_name: 'Phạm',
    email: 'huong.pham@fpt.com.vn',
    phone_numbers: '0933445566',
    addresses: '15 Trần Phú, Vĩnh Nguyên, TP. Nha Trang'
  },
  {
    guest_id: 'GUEST005',
    first_name: 'Minh Tuấn',
    last_name: 'Hoàng',
    email: 'tuan.hoang@vinamilk.com.vn',
    phone_numbers: '0944556677',
    addresses: '88 Hàng Bài, Hoàn Kiếm, TP. Hà Nội'
  },
  {
    guest_id: 'GUEST006',
    first_name: 'Ngọc Lan',
    last_name: 'Vũ',
    email: 'ngoclan.vu@gmail.com',
    phone_numbers: '0966778899',
    addresses: '32 Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
  },
  {
    guest_id: 'GUEST007',
    first_name: 'Bảo Long',
    last_name: 'Đặng',
    email: 'long.dang@techcombank.com.vn',
    phone_numbers: '0908889999',
    addresses: '12 Quang Trung, Phường 2, TP. Đà Lạt'
  },
  {
    guest_id: 'GUEST008',
    first_name: 'Thanh Thảo',
    last_name: 'Bùi',
    email: 'thao.bui@vietcombank.com.vn',
    phone_numbers: '0919998888',
    addresses: '68 Trần Hưng Đạo, Dương Đông, TP. Phú Quốc'
  },
  {
    guest_id: 'GUEST009',
    first_name: 'Đức Huy',
    last_name: 'Đỗ',
    email: 'huy.do@viettel.vn',
    phone_numbers: '0983221144',
    addresses: '19 Duy Tân, Cầu Giấy, TP. Hà Nội'
  },
  {
    guest_id: 'GUEST010',
    first_name: 'Phương Nga',
    last_name: 'Hồ',
    email: 'nga.ho@shopee.vn',
    phone_numbers: '0971239876',
    addresses: '55 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh'
  },
  {
    guest_id: 'GUEST011',
    first_name: 'Tuấn Khang',
    last_name: 'Ngô',
    email: 'khang.ngo@gmail.com',
    phone_numbers: '0938765123',
    addresses: '22 Hoàng Văn Thụ, TP. Cần Thơ'
  },
  {
    guest_id: 'GUEST012',
    first_name: 'Thu Trang',
    last_name: 'Dương',
    email: 'trang.duong@vingroup.net',
    phone_numbers: '0912987345',
    addresses: '88 Lạch Tray, Quận Ngô Quyền, TP. Hải Phòng'
  }
];

// 7. LỊCH SỬ ĐẶT PHÒNG THEO KHÁCH HÀNG (bookings_by_guest - Q3, 20 bản ghi)
let bookings_by_guest = [
  {
    guest_id: '0eacb0ae-a973-4bfd-9818-9a927b713cf4',
    check_in_date: '2026-03-10',
    booking_id: '16380824-0000-0000-0000-000000000001',
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    hotel_name: 'Khách sạn Rex Sài Gòn',
    room_number: 202,
    room_id: 'CH-234',
    check_out_date: '2026-03-12',
    total_amount: 3600000,
    status: 'CONFIRMED'
  },
  {
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    check_in_date: '2026-03-10',
    booking_id: '39102845-0000-0000-0000-000000000002',
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    hotel_name: 'Khách sạn Caravelle Sài Gòn',
    room_number: 201,
    room_id: 'kdefgt',
    check_out_date: '2026-03-14',
    total_amount: 16800000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    check_in_date: '2026-10-10',
    booking_id: '28471920-0000-0000-0000-000000000003',
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    hotel_name: 'Khách sạn Sofitel Legend Metropole Hà Nội',
    room_number: 101,
    room_id: '12-CFG',
    check_out_date: '2026-10-12',
    total_amount: 6400000,
    status: 'CONFIRMED'
  },
  {
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    check_in_date: '2026-05-15',
    booking_id: '44556677-0000-0000-0000-000000000004',
    hotel_id: 'HTL003-DN',
    hotel_name: 'InterContinental Danang Sun Peninsula',
    room_number: 102,
    room_id: 'IC-102',
    check_out_date: '2026-05-18',
    total_amount: 20400000,
    status: 'CHECKED_OUT'
  },
  {
    guest_id: 'GUEST001',
    check_in_date: '2026-10-01',
    booking_id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    hotel_id: 'HTL001',
    hotel_name: 'Saigon Riverside Hotel',
    room_number: 102,
    room_id: 'SR-102',
    check_out_date: '2026-10-03',
    total_amount: 2400000,
    status: 'CONFIRMED'
  },
  {
    guest_id: 'GUEST001',
    check_in_date: '2026-06-20',
    booking_id: '55667788-0000-0000-0000-000000000005',
    hotel_id: 'HTL005-NT',
    hotel_name: 'Vinpearl Resort & Spa Nha Trang Bay',
    room_number: 102,
    room_id: 'VP-102',
    check_out_date: '2026-06-23',
    total_amount: 8700000,
    status: 'CHECKED_OUT'
  },
  {
    guest_id: 'GUEST002',
    check_in_date: '2026-11-05',
    booking_id: '66778899-0000-0000-0000-000000000006',
    hotel_id: 'HTL001',
    hotel_name: 'Saigon Riverside Hotel',
    room_number: 201,
    room_id: 'SR-201',
    check_out_date: '2026-11-07',
    total_amount: 5000000,
    status: 'CONFIRMED'
  },
  {
    guest_id: 'GUEST003',
    check_in_date: '2026-09-15',
    booking_id: '77889900-0000-0000-0000-000000000007',
    hotel_id: 'HTL004-DN',
    hotel_name: 'Novotel Danang Premier Han River',
    room_number: 102,
    room_id: 'NV-102',
    check_out_date: '2026-09-17',
    total_amount: 4700000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'GUEST004',
    check_in_date: '2026-07-10',
    booking_id: '88990011-0000-0000-0000-000000000008',
    hotel_id: 'HTL006-PQ',
    hotel_name: 'JW Marriott Phu Quoc Emerald Bay',
    room_number: 102,
    room_id: 'JW-102',
    check_out_date: '2026-07-14',
    total_amount: 28800000,
    status: 'CHECKED_OUT'
  },
  {
    guest_id: 'GUEST005',
    check_in_date: '2026-08-01',
    booking_id: '99001122-0000-0000-0000-000000000009',
    hotel_id: 'HTL007-DL',
    hotel_name: 'Dalat Palace Heritage Hotel',
    room_number: 201,
    room_id: 'DP-201',
    check_out_date: '2026-08-03',
    total_amount: 8400000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'GUEST006',
    check_in_date: '2026-04-12',
    booking_id: '11223344-0000-0000-0000-000000000010',
    hotel_id: 'HTL002',
    hotel_name: 'Hanoi Old Quarter Hotel',
    room_number: 201,
    room_id: 'HQ-201',
    check_out_date: '2026-04-15',
    total_amount: 4050000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'GUEST007',
    check_in_date: '2026-06-01',
    booking_id: '22334455-0000-0000-0000-000000000011',
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    hotel_name: 'Khách sạn Rex Sài Gòn',
    room_number: 102,
    room_id: 'CH-102',
    check_out_date: '2026-06-03',
    total_amount: 4400000,
    status: 'OCCUPIED'
  },
  {
    guest_id: 'GUEST008',
    check_in_date: '2026-08-20',
    booking_id: '33445566-0000-0000-0000-000000000012',
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    hotel_name: 'Khách sạn Caravelle Sài Gòn',
    room_number: 301,
    room_id: 'CV-301',
    check_out_date: '2026-08-22',
    total_amount: 10400000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'GUEST009',
    check_in_date: '2026-09-02',
    booking_id: '44332211-0000-0000-0000-000000000013',
    hotel_id: 'HTL005-NT',
    hotel_name: 'Vinpearl Resort & Spa Nha Trang Bay',
    room_number: 301,
    room_id: 'VP-301',
    check_out_date: '2026-09-05',
    total_amount: 39000000,
    status: 'CHECKED_IN'
  },
  {
    guest_id: 'GUEST010',
    check_in_date: '2026-09-10',
    booking_id: '55443322-0000-0000-0000-000000000014',
    hotel_id: 'HTL003-DN',
    hotel_name: 'InterContinental Danang Sun Peninsula',
    room_number: 102,
    room_id: 'IC-102',
    check_out_date: '2026-09-12',
    total_amount: 13600000,
    status: 'CONFIRMED'
  }
];

// 8. ĐẶT PHÒNG THEO KHÁCH SẠN VÀ NGÀY (bookings_by_hotel_date - Q4, đồng bộ với Q3)
let bookings_by_hotel_date = [
  {
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    check_in_date: '2026-03-10',
    booking_id: '16380824-0000-0000-0000-000000000001',
    guest_id: '0eacb0ae-a973-4bfd-9818-9a927b713cf4',
    guest_name: 'Trần Thị Mai',
    room_number: 202,
    room_id: 'CH-234',
    check_out_date: '2026-03-12',
    total_amount: 3600000,
    status: 'CONFIRMED'
  },
  {
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    check_in_date: '2026-03-10',
    booking_id: '39102845-0000-0000-0000-000000000002',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    guest_name: 'Nguyễn Văn An',
    room_number: 201,
    room_id: 'kdefgt',
    check_out_date: '2026-03-14',
    total_amount: 16800000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    check_in_date: '2026-10-10',
    booking_id: '28471920-0000-0000-0000-000000000003',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    guest_name: 'Nguyễn Văn An',
    room_number: 101,
    room_id: '12-CFG',
    check_out_date: '2026-10-12',
    total_amount: 6400000,
    status: 'CONFIRMED'
  },
  {
    hotel_id: 'HTL003-DN',
    check_in_date: '2026-05-15',
    booking_id: '44556677-0000-0000-0000-000000000004',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    guest_name: 'Nguyễn Văn An',
    room_number: 102,
    room_id: 'IC-102',
    check_out_date: '2026-05-18',
    total_amount: 20400000,
    status: 'CHECKED_OUT'
  },
  {
    hotel_id: 'HTL001',
    check_in_date: '2026-10-01',
    booking_id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    guest_id: 'GUEST001',
    guest_name: 'Nguyễn Văn A',
    room_number: 102,
    room_id: 'SR-102',
    check_out_date: '2026-10-03',
    total_amount: 2400000,
    status: 'CONFIRMED'
  },
  {
    hotel_id: 'HTL005-NT',
    check_in_date: '2026-06-20',
    booking_id: '55667788-0000-0000-0000-000000000005',
    guest_id: 'GUEST001',
    guest_name: 'Nguyễn Văn A',
    room_number: 102,
    room_id: 'VP-102',
    check_out_date: '2026-06-23',
    total_amount: 8700000,
    status: 'CHECKED_OUT'
  },
  {
    hotel_id: 'HTL001',
    check_in_date: '2026-11-05',
    booking_id: '66778899-0000-0000-0000-000000000006',
    guest_id: 'GUEST002',
    guest_name: 'Trần Thị B',
    room_number: 201,
    room_id: 'SR-201',
    check_out_date: '2026-11-07',
    total_amount: 5000000,
    status: 'CONFIRMED'
  },
  {
    hotel_id: 'HTL004-DN',
    check_in_date: '2026-09-15',
    booking_id: '77889900-0000-0000-0000-000000000007',
    guest_id: 'GUEST003',
    guest_name: 'Lê Quang Dũng',
    room_number: 102,
    room_id: 'NV-102',
    check_out_date: '2026-09-17',
    total_amount: 4700000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: 'HTL006-PQ',
    check_in_date: '2026-07-10',
    booking_id: '88990011-0000-0000-0000-000000000008',
    guest_id: 'GUEST004',
    guest_name: 'Phạm Thị Hương',
    room_number: 102,
    room_id: 'JW-102',
    check_out_date: '2026-07-14',
    total_amount: 28800000,
    status: 'CHECKED_OUT'
  },
  {
    hotel_id: 'HTL007-DL',
    check_in_date: '2026-08-01',
    booking_id: '99001122-0000-0000-0000-000000000009',
    guest_id: 'GUEST005',
    guest_name: 'Hoàng Minh Tuấn',
    room_number: 201,
    room_id: 'DP-201',
    check_out_date: '2026-08-03',
    total_amount: 8400000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: 'HTL002',
    check_in_date: '2026-04-12',
    booking_id: '11223344-0000-0000-0000-000000000010',
    guest_id: 'GUEST006',
    guest_name: 'Vũ Ngọc Lan',
    room_number: 201,
    room_id: 'HQ-201',
    check_out_date: '2026-04-15',
    total_amount: 4050000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    check_in_date: '2026-06-01',
    booking_id: '22334455-0000-0000-0000-000000000011',
    guest_id: 'GUEST007',
    guest_name: 'Đặng Bảo Long',
    room_number: 102,
    room_id: 'CH-102',
    check_out_date: '2026-06-03',
    total_amount: 4400000,
    status: 'OCCUPIED'
  },
  {
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    check_in_date: '2026-08-20',
    booking_id: '33445566-0000-0000-0000-000000000012',
    guest_id: 'GUEST008',
    guest_name: 'Bùi Thanh Thảo',
    room_number: 301,
    room_id: 'CV-301',
    check_out_date: '2026-08-22',
    total_amount: 10400000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: 'HTL005-NT',
    check_in_date: '2026-09-02',
    booking_id: '44332211-0000-0000-0000-000000000013',
    guest_id: 'GUEST009',
    guest_name: 'Đỗ Đức Huy',
    room_number: 301,
    room_id: 'VP-301',
    check_out_date: '2026-09-05',
    total_amount: 39000000,
    status: 'CHECKED_IN'
  },
  {
    hotel_id: 'HTL003-DN',
    check_in_date: '2026-09-10',
    booking_id: '55443322-0000-0000-0000-000000000014',
    guest_id: 'GUEST010',
    guest_name: 'Hồ Phương Nga',
    room_number: 102,
    room_id: 'IC-102',
    check_out_date: '2026-09-12',
    total_amount: 13600000,
    status: 'CONFIRMED'
  }
];

// 9. DANH SÁCH HOÁ ĐƠN (invoices_by_booking - Q5)
let invoices_by_booking = [
  {
    booking_id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    invoice_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    guest_id: 'GUEST001',
    hotel_id: 'HTL001',
    room_charge: 2400000,
    service_charge: 120000,
    tax: 252000,
    total_amount: 2772000,
    payment_status: 'PAID',
    issued_at: new Date('2026-10-01T08:30:00Z')
  },
  {
    booking_id: '16380824-0000-0000-0000-000000000001',
    invoice_id: '8a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb6c',
    guest_id: '0eacb0ae-a973-4bfd-9818-9a927b713cf4',
    hotel_id: '2d76c2a1-f312-4934-83ae-a59c0574805f',
    room_charge: 3600000,
    service_charge: 180000,
    tax: 378000,
    total_amount: 4158000,
    payment_status: 'PAID',
    issued_at: new Date('2026-03-10T14:00:00Z')
  },
  {
    booking_id: '39102845-0000-0000-0000-000000000002',
    invoice_id: '7a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb6b',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    hotel_id: 'b93a7112-f4dd-41cc-b529-d5d79114078e',
    room_charge: 16800000,
    service_charge: 840000,
    tax: 1764000,
    total_amount: 19404000,
    payment_status: 'PAID',
    issued_at: new Date('2026-03-10T12:00:00Z')
  },
  {
    booking_id: '28471920-0000-0000-0000-000000000003',
    invoice_id: '6a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb6a',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    hotel_id: '5061bde8-f6f4-4767-9b92-cff82d9ab52b',
    room_charge: 6400000,
    service_charge: 320000,
    tax: 672000,
    total_amount: 7392000,
    payment_status: 'PAID',
    issued_at: new Date('2026-10-10T15:00:00Z')
  },
  {
    booking_id: '44556677-0000-0000-0000-000000000004',
    invoice_id: '5a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb69',
    guest_id: 'c262832f-6f09-4a4a-8e92-447304fcebd8',
    hotel_id: 'HTL003-DN',
    room_charge: 20400000,
    service_charge: 1020000,
    tax: 2142000,
    total_amount: 23562000,
    payment_status: 'PAID',
    issued_at: new Date('2026-05-15T11:00:00Z')
  },
  {
    booking_id: '55667788-0000-0000-0000-000000000005',
    invoice_id: '4a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb68',
    guest_id: 'GUEST001',
    hotel_id: 'HTL005-NT',
    room_charge: 8700000,
    service_charge: 435000,
    tax: 913500,
    total_amount: 10048500,
    payment_status: 'PAID',
    issued_at: new Date('2026-06-20T09:00:00Z')
  },
  {
    booking_id: '77889900-0000-0000-0000-000000000007',
    invoice_id: '3a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb67',
    guest_id: 'GUEST003',
    hotel_id: 'HTL004-DN',
    room_charge: 4700000,
    service_charge: 235000,
    tax: 493500,
    total_amount: 5428500,
    payment_status: 'PAID',
    issued_at: new Date('2026-09-15T10:00:00Z')
  },
  {
    booking_id: '88990011-0000-0000-0000-000000000008',
    invoice_id: '2a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb66',
    guest_id: 'GUEST004',
    hotel_id: 'HTL006-PQ',
    room_charge: 28800000,
    service_charge: 1440000,
    tax: 3024000,
    total_amount: 33264000,
    payment_status: 'PAID',
    issued_at: new Date('2026-07-10T16:00:00Z')
  },
  {
    booking_id: '99001122-0000-0000-0000-000000000009',
    invoice_id: '1a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb65',
    guest_id: 'GUEST005',
    hotel_id: 'HTL007-DL',
    room_charge: 8400000,
    service_charge: 420000,
    tax: 882000,
    total_amount: 9702000,
    payment_status: 'PAID',
    issued_at: new Date('2026-08-01T14:30:00Z')
  },
  {
    booking_id: '44332211-0000-0000-0000-000000000013',
    invoice_id: '0a1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb64',
    guest_id: 'GUEST009',
    hotel_id: 'HTL005-NT',
    room_charge: 39000000,
    service_charge: 1950000,
    tax: 4095000,
    total_amount: 45045000,
    payment_status: 'PAID',
    issued_at: new Date('2026-09-02T13:00:00Z')
  },
  {
    booking_id: '55443322-0000-0000-0000-000000000014',
    invoice_id: 'fa1ceb4d-3b7d-4bad-9bdd-2b0d7b3dcb63',
    guest_id: 'GUEST010',
    hotel_id: 'HTL003-DN',
    room_charge: 13600000,
    service_charge: 680000,
    tax: 1428000,
    total_amount: 15708000,
    payment_status: 'PAID',
    issued_at: new Date('2026-09-10T15:30:00Z')
  }
];

module.exports = {
  hotels,
  hotels_by_poi,
  pois_by_hotel,
  rooms_by_hotel,
  amenities_by_room,
  guests,
  bookings_by_guest,
  bookings_by_hotel_date,
  invoices_by_booking
};
