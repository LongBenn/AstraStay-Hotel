
-- 1. KHỞI TẠO KEYSPACE
CREATE KEYSPACE IF NOT EXISTS hotel_reservations_vn
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
};

USE hotel_reservations_vn;

-- Q1. Tìm khách sạn gần một điểm tham quan nhất định
CREATE TABLE IF NOT EXISTS hotels_by_poi (
    poi_name text,
    hotel_id text,
    name text,
    phone text,
    address text,
    PRIMARY KEY (poi_name, hotel_id)
);

-- Q2. Tìm thông tin về một khách sạn nhất định (tên, vị trí, điện thoại)
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id text,
    name text,
    phone text,
    address text,
    PRIMARY KEY (hotel_id)
);

-- Q3. Tìm điểm tham quan gần một khách sạn nhất định
CREATE TABLE IF NOT EXISTS pois_by_hotel (
    hotel_id text,
    poi_name text,
    description text,
    PRIMARY KEY (hotel_id, poi_name)
);

-- Q4. Tìm phòng trống trong một khoảng thời gian nhất định
CREATE TABLE IF NOT EXISTS available_rooms_by_hotel_date (
    hotel_id text,
    start_date date,
    room_number int,
    is_available int,
    room_id text,
    PRIMARY KEY (hotel_id, start_date, room_number)
);

-- Q5. Tìm giá và tiện ích cho một phòng
CREATE TABLE IF NOT EXISTS amenities_by_room (
    hotel_id text,
    room_id text,
    amenity_name text,
    description text,
    rate float,
    PRIMARY KEY ((hotel_id, room_id), amenity_name)
);

-- Q6. Tra cứu thông tin đặt phòng theo mã xác nhận (Confirm Number)
CREATE TABLE IF NOT EXISTS reservations_by_confirmation (
    confirm_number int,
    hotel_id text,
    room_id text,
    start_date date,
    end_date date,
    guest_id text,
    PRIMARY KEY (confirm_number, hotel_id)
) WITH CLUSTERING ORDER BY (hotel_id ASC);

-- Q7. Tìm kiếm đặt phòng theo khách sạn và ngày bắt đầu
CREATE TABLE IF NOT EXISTS reservations_by_hotel_date (
    hotel_id text,
    start_date date,
    room_id text,
    end_date date,
    confirm_number int,
    guest_id text,
    PRIMARY KEY ((hotel_id, start_date), room_id)
) WITH CLUSTERING ORDER BY (room_id ASC);

-- Q8. Tìm kiếm tất cả đặt phòng theo họ của khách
CREATE TABLE IF NOT EXISTS reservations_by_guest (
    guest_last_name text,
    hotel_id text,
    guest_id text,
    room_id text,
    start_date date,
    end_date date,
    confirm_number int,
    PRIMARY KEY (guest_last_name, hotel_id, guest_id)
) WITH CLUSTERING ORDER BY (hotel_id ASC, guest_id ASC);

-- Q9. Tìm thông tin chi tiết của khách hàng theo ID
CREATE TABLE IF NOT EXISTS guests (
    guest_id text,
    first_name text,
    last_name text,
    email text,
    phone_numbers text,
    addresses text,
    PRIMARY KEY (guest_id)
);


-- Dữ liệu mẫu cho Q1: hotels_by_poi
INSERT INTO hotels_by_poi (poi_name, hotel_id, name, phone, address)
VALUES ('Chợ Bến Thành', '2d76c2a1-f312-4934-83ae-a59c0574805f', 'Khách sạn Rex Sài Gòn', '028 3829 2185', '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

INSERT INTO hotels_by_poi (poi_name, hotel_id, name, phone, address)
VALUES ('Chợ Bến Thành', 'b93a7112-f4dd-41cc-b529-d5d79114078e', 'Khách sạn Caravelle Sài Gòn', '028 3823 4999', '19-23 Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

INSERT INTO hotels_by_poi (poi_name, hotel_id, name, phone, address)
VALUES ('Phố đi bộ Nguyễn Huệ', '2d76c2a1-f312-4934-83ae-a59c0574805f', 'Khách sạn Rex Sài Gòn', '028 3829 2185', '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

-- Dữ liệu mẫu cho Q2: hotels
INSERT INTO hotels (hotel_id, name, phone, address)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'Khách sạn Rex Sài Gòn', '028 3829 2185', '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

INSERT INTO hotels (hotel_id, name, phone, address)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 'Khách sạn Caravelle Sài Gòn', '028 3823 4999', '19-23 Lam Sơn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

INSERT INTO hotels (hotel_id, name, phone, address)
VALUES ('5061bde8-f6f4-4767-9b92-cff82d9ab52b', 'Khách sạn Sofitel Legend Metropole Hà Nội', '024 3826 6919', '15 Ngô Quyền, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội');

-- Dữ liệu mẫu cho Q3: pois_by_hotel
INSERT INTO pois_by_hotel (hotel_id, poi_name, description)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'Chợ Bến Thành', 'Khu chợ biểu tượng lịch sử và thiên đường ẩm thực Sài Gòn');

INSERT INTO pois_by_hotel (hotel_id, poi_name, description)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'Phố đi bộ Nguyễn Huệ', 'Không gian dạo chơi, biểu diễn nghệ thuật đường phố náo nhiệt');

INSERT INTO pois_by_hotel (hotel_id, poi_name, description)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 'Nhà hát Thành phố', 'Công trình kiến trúc Gothic Pháp cổ kính ngay đối diện khách sạn');

-- Dữ liệu mẫu cho Q4: available_rooms_by_hotel_date
INSERT INTO available_rooms_by_hotel_date (hotel_id, start_date, room_number, is_available, room_id)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', '2026-02-11', 15, 0, 'CH-445');

INSERT INTO available_rooms_by_hotel_date (hotel_id, start_date, room_number, is_available, room_id)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', '2026-03-10', 11, 1, 'CH-234');

INSERT INTO available_rooms_by_hotel_date (hotel_id, start_date, room_number, is_available, room_id)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', '2026-07-22', 11, 0, 'CH-234');

INSERT INTO available_rooms_by_hotel_date (hotel_id, start_date, room_number, is_available, room_id)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', '2026-08-10', 11, 1, 'CH-234');

-- Dữ liệu mẫu cho Q5: amenities_by_room
INSERT INTO amenities_by_room (hotel_id, room_id, amenity_name, description, rate)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 'kdefgt', 'Internet cáp quang 500Mbps', 'Wi-Fi phủ sóng toàn phòng tốc độ cao miễn phí', 2200000.0);

INSERT INTO amenities_by_room (hotel_id, room_id, amenity_name, description, rate)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 'kdefgt', 'Hồ bơi vô cực ngoài trời', 'Bể bơi tầng cao ngắm trọn cảnh đêm sông Sài Gòn', 2200000.0);

INSERT INTO amenities_by_room (hotel_id, room_id, amenity_name, description, rate)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', 'Điều hòa 2 chiều Daikin', 'Hệ thống lọc không khí khử khuẩn tự động', 1800000.0);

INSERT INTO amenities_by_room (hotel_id, room_id, amenity_name, description, rate)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', 'Buffet sáng tiêu chuẩn 5 sao', 'Bữa sáng thực đơn Á - Âu tự chọn tại nhà hàng tầng thượng', 1800000.0);

-- Dữ liệu mẫu cho Q6: reservations_by_confirmation
INSERT INTO reservations_by_confirmation (confirm_number, hotel_id, room_id, start_date, end_date, guest_id)
VALUES (16380824, '2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', '2026-03-10', '2026-03-11', '0eacb0ae-a973-4bfd-9818-9a927b713cf4');

INSERT INTO reservations_by_confirmation (confirm_number, hotel_id, room_id, start_date, end_date, guest_id)
VALUES (28471920, '5061bde8-f6f4-4767-9b92-cff82d9ab52b', '12-CFG', '2026-10-10', '2026-11-12', 'c262832f-6f09-4a4a-8e92-447304fcebd8');

INSERT INTO reservations_by_confirmation (confirm_number, hotel_id, room_id, start_date, end_date, guest_id)
VALUES (39102845, 'b93a7112-f4dd-41cc-b529-d5d79114078e', 'kdefgt', '2026-03-10', '2026-03-14', 'c262832f-6f09-4a4a-8e92-447304fcebd8');

-- Dữ liệu mẫu cho Q7: reservations_by_hotel_date
INSERT INTO reservations_by_hotel_date (hotel_id, start_date, room_id, end_date, confirm_number, guest_id)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', '2026-03-10', 'CH-234', '2026-03-11', 16380824, '0eacb0ae-a973-4bfd-9818-9a927b713cf4');

INSERT INTO reservations_by_hotel_date (hotel_id, start_date, room_id, end_date, confirm_number, guest_id)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', '2026-03-10', 'kdefgt', '2026-03-14', 39102845, 'c262832f-6f09-4a4a-8e92-447304fcebd8');

-- Dữ liệu mẫu cho Q8: reservations_by_guest
INSERT INTO reservations_by_guest (guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number)
VALUES ('Nguyễn', '5061bde8-f6f4-4767-9b92-cff82d9ab52b', 'c262832f-6f09-4a4a-8e92-447304fcebd8', '12-CFG', '2026-10-10', '2026-11-12', 28471920);

INSERT INTO reservations_by_guest (guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number)
VALUES ('Nguyễn', 'b93a7112-f4dd-41cc-b529-d5d79114078e', 'c262832f-6f09-4a4a-8e92-447304fcebd8', 'kdefgt', '2026-03-10', '2026-03-14', 39102845);

INSERT INTO reservations_by_guest (guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number)
VALUES ('Trần', '2d76c2a1-f312-4934-83ae-a59c0574805f', '0eacb0ae-a973-4bfd-9818-9a927b713cf4', 'CH-234', '2026-03-10', '2026-03-11', 16380824);

-- Dữ liệu mẫu cho Q9: guests
INSERT INTO guests (guest_id, first_name, last_name, email, phone_numbers, addresses)
VALUES ('c262832f-6f09-4a4a-8e92-447304fcebd8', 'Văn An', 'Nguyễn', 'vanan.nguyen@gmail.com, an.nv@congty.vn', '0903123456', '128 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh');

INSERT INTO guests (guest_id, first_name, last_name, email, phone_numbers, addresses)
VALUES ('0eacb0ae-a973-4bfd-9818-9a927b713cf4', 'Thị Mai', 'Trần', 'thimai.tran@gmail.com', '0918765432', '45 Hoàng Hoa Thám, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh');


-- Q1. Tìm khách sạn gần điểm tham quan 'Chợ Bến Thành'
SELECT poi_name, hotel_id, name, phone, address
FROM hotels_by_poi
WHERE poi_name = 'Chợ Bến Thành'
ORDER BY hotel_id;

-- Q2. Tìm thông tin về khách sạn Rex Sài Gòn ('2d76c2a1-f312-4934-83ae-a59c0574805f')
SELECT hotel_id, name, phone, address
FROM hotels
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f';

-- Q3. Tìm các điểm tham quan gần khách sạn Rex Sài Gòn ('2d76c2a1-f312-4934-83ae-a59c0574805f')
SELECT hotel_id, poi_name, description
FROM pois_by_hotel
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
ORDER BY poi_name;

-- Q4. Tìm phòng trống của khách sạn Rex theo thời gian
SELECT hotel_id, start_date, room_number, room_id, is_available
FROM available_rooms_by_hotel_date
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
ORDER BY start_date, room_number;

-- Q5. Tìm giá và tiện ích cho phòng 'kdefgt' của khách sạn Caravelle Sài Gòn
SELECT hotel_id, room_id, rate, amenity_name, description
FROM amenities_by_room
WHERE hotel_id = 'b93a7112-f4dd-41cc-b529-d5d79114078e'
  AND room_id = 'kdefgt'
ORDER BY amenity_name;

-- Q6. Tìm thông tin đặt phòng theo mã xác nhận 16380824
SELECT confirm_number, hotel_id, room_id, start_date, end_date, guest_id
FROM reservations_by_confirmation
WHERE confirm_number = 16380824
ORDER BY hotel_id;

-- Q7. Tìm kiếm đặt phòng tại Rex Sài Gòn nhận phòng ngày '2026-03-10'
SELECT hotel_id, start_date, room_id, end_date, confirm_number, guest_id
FROM reservations_by_hotel_date
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND start_date = '2026-03-10'
ORDER BY room_id;

-- Q8. Tìm kiếm tất cả đặt phòng theo họ khách hàng 'Nguyễn'
SELECT guest_last_name, hotel_id, guest_id, room_id, start_date, end_date, confirm_number
FROM reservations_by_guest
WHERE guest_last_name = 'Nguyễn'
ORDER BY hotel_id, guest_id;

-- Q9. Tìm kiếm thông tin chi tiết khách hàng Nguyễn Văn An theo ID
SELECT guest_id, first_name, last_name, email, phone_numbers, addresses
FROM guests
WHERE guest_id = 'c262832f-6f09-4a4a-8e92-447304fcebd8';