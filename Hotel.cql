
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

-- Q4. Tìm phòng trống trong một khoảng thời gian nhất định (kèm giá và rating)
CREATE TABLE IF NOT EXISTS available_rooms_by_hotel_date (
    hotel_id text,
    start_date date,
    room_number int,
    room_id text,
    room_type text,
    price decimal,
    is_available int,
    average_rating decimal,
    review_count int,
    PRIMARY KEY (hotel_id, start_date, room_number)
) WITH CLUSTERING ORDER BY (start_date ASC, room_number ASC);

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


-- ==============================================================================
-- BỔ SUNG: TÌM GIÁ PHÒNG & ĐÁNH GIÁ PHÒNG (REVIEWS & RATINGS)
-- ==============================================================================

-- BẢNG 1: Danh sách đánh giá của một phòng (mới nhất xếp trước)
CREATE TABLE IF NOT EXISTS reviews_by_room (
    hotel_id text,
    room_id text,
    review_date timestamp,
    review_id uuid,
    guest_id text,
    confirm_number int,
    rating int,
    comment text,
    PRIMARY KEY ((hotel_id, room_id), review_date, review_id)
) WITH CLUSTERING ORDER BY (review_date DESC);

-- BẢNG 2: Điểm đánh giá trung bình và số lượt review tiền tính toán (Precomputed)
CREATE TABLE IF NOT EXISTS room_rating_summary (
    hotel_id text,
    room_id text,
    average_rating decimal,
    review_count int,
    rating_sum int,
    PRIMARY KEY ((hotel_id, room_id))
);

-- BẢNG 3: Tìm phòng theo điểm đánh giá trong khách sạn (Top-Rated)
CREATE TABLE IF NOT EXISTS rooms_by_hotel_rating (
    hotel_id text,
    average_rating decimal,
    room_id text,
    room_number int,
    room_type text,
    review_count int,
    price_per_night decimal,
    PRIMARY KEY (hotel_id, average_rating, room_id)
) WITH CLUSTERING ORDER BY (average_rating DESC, room_id ASC);

-- BẢNG 4: Chống đánh giá trùng lặp theo confirm_number (Validation Access Pattern)
CREATE TABLE IF NOT EXISTS reviews_by_confirmation (
    confirm_number int,
    review_id uuid,
    hotel_id text,
    room_id text,
    guest_id text,
    rating int,
    review_date timestamp,
    PRIMARY KEY (confirm_number)
);

-- Dữ liệu mẫu reviews_by_room
INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', '2026-03-12 09:30:00', 11111111-1111-1111-1111-111111111111, '0eacb0ae-a973-4bfd-9818-9a927b713cf4', 16380824, 5, 'Phòng Suite cực kỳ rộng rãi, bồn sục Jacuzzi view phố đi bộ rất thoáng và đẹp.');

INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', '2026-02-16 14:15:00', 22222222-2222-2222-2222-222222222222, 'c262832f-6f09-4a4a-8e92-447304fcebd8', 11029831, 5, 'Dịch vụ chu đáo, giường ngủ êm ái, cách âm tuyệt đối!');

INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-101', '2026-03-01 10:00:00', 33333333-3333-3333-3333-333333333333, 'GUEST001', 44556677, 5, 'Phòng Standard King giá rất hợp lý ngay trung tâm Quận 1.');

INSERT INTO reviews_by_room (hotel_id, room_id, review_date, review_id, guest_id, confirm_number, rating, comment)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-101', '2026-02-20 16:20:00', 44444444-4444-4444-4444-444444444444, 'GUEST002', 55667788, 4, 'Phòng sạch sẽ, tiện nghi đầy đủ, nhân viên thân thiện.');

-- Dữ liệu mẫu room_rating_summary
INSERT INTO room_rating_summary (hotel_id, room_id, average_rating, review_count, rating_sum)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', 4.9, 85, 416);

INSERT INTO room_rating_summary (hotel_id, room_id, average_rating, review_count, rating_sum)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-101', 4.6, 120, 552);

-- Dữ liệu mẫu rooms_by_hotel_rating
INSERT INTO rooms_by_hotel_rating (hotel_id, average_rating, room_id, room_number, room_type, review_count, price_per_night)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 4.9, 'CH-234', 204, 'Executive Suite', 85, 1800000);

INSERT INTO rooms_by_hotel_rating (hotel_id, average_rating, room_id, room_number, room_type, review_count, price_per_night)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 4.6, 'CH-101', 101, 'Standard King', 120, 950000);

-- Dữ liệu mẫu reviews_by_confirmation
INSERT INTO reviews_by_confirmation (confirm_number, review_id, hotel_id, room_id, guest_id, rating, review_date)
VALUES (16380824, 11111111-1111-1111-1111-111111111111, '2d76c2a1-f312-4934-83ae-a59c0574805f', 'CH-234', '0eacb0ae-a973-4bfd-9818-9a927b713cf4', 5, '2026-03-12 09:30:00');


-- TRUY VẤN MẪU:

-- 1. Tìm phòng trống và giá từ ngày 2026-03-10 đến 2026-03-15 tại Rex Sài Gòn
SELECT hotel_id, start_date, room_number, room_id, room_type, price, is_available, average_rating, review_count
FROM available_rooms_by_hotel_date
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND start_date >= '2026-03-10'
  AND start_date < '2026-03-15';

-- 2. Xem tất cả đánh giá của phòng 'CH-234' (mới nhất xếp trước)
SELECT guest_id, confirm_number, rating, comment, review_date
FROM reviews_by_room
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND room_id = 'CH-234';

-- 3. Xem điểm đánh giá trung bình của phòng 'CH-234' (O(1) Point Query)
SELECT hotel_id, room_id, average_rating, review_count
FROM room_rating_summary
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND room_id = 'CH-234';

-- 4. Tìm các phòng có rating từ 4.0 trở lên trong khách sạn (Không dùng ALLOW FILTERING)
SELECT room_id, room_number, room_type, average_rating, review_count, price_per_night
FROM rooms_by_hotel_rating
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND average_rating >= 4.0;


-- ==============================================================================
-- BỔ SUNG: BẢNG ĐÁNH GIÁ & BÌNH LUẬN NỔI BẬT (FEATURED REVIEWS)
-- ==============================================================================

-- BẢNG 5: Đánh giá nổi bật theo khách sạn và xếp hạng (Rating 5 sao xếp trước)
CREATE TABLE IF NOT EXISTS featured_reviews (
    hotel_id text,
    rating int,
    review_id uuid,
    guest_id text,
    guest_name text,
    guest_avatar text,
    hotel_name text,
    room_id text,
    room_number int,
    room_type text,
    comment text,
    review_date timestamp,
    is_featured boolean,
    helpful_count int,
    stay_date text,
    badge_title text,
    PRIMARY KEY (hotel_id, rating, review_id)
) WITH CLUSTERING ORDER BY (rating DESC, review_id ASC);

-- Dữ liệu mẫu cho featured_reviews
INSERT INTO featured_reviews (hotel_id, rating, review_id, guest_id, guest_name, guest_avatar, hotel_name, room_id, room_number, room_type, comment, review_date, is_featured, helpful_count, stay_date, badge_title)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 5, 11111111-1111-1111-1111-111111111111, '0eacb0ae-a973-4bfd-9818-9a927b713cf4', 'Trần Thị Mai', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', 'Khách sạn Rex Sài Gòn', 'CH-234', 204, 'Executive Suite', 'Phòng Executive Suite cực kỳ rộng rãi, bồn sục Jacuzzi view phố đi bộ Nguyễn Huệ lung linh về đêm. Nhân viên phục vụ rất chu đáo và tinh tế!', '2026-03-12 09:30:00', true, 42, 'Kỳ nghỉ 5 đêm - Tháng 03/2026', 'Doanh Nhân & Chuyên Gia');

INSERT INTO featured_reviews (hotel_id, rating, review_id, guest_id, guest_name, guest_avatar, hotel_name, room_id, room_number, room_type, comment, review_date, is_featured, helpful_count, stay_date, badge_title)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 5, 22222222-2222-2222-2222-222222222222, 'c262832f-6f09-4a4a-8e92-447304fcebd8', 'Nguyễn Văn An', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', 'Khách sạn Rex Sài Gòn', 'CH-234', 204, 'Executive Suite', 'Dịch vụ chuẩn 5 sao di sản Sài Gòn, giường ngủ êm ái, cách âm tuyệt đối. Tiệc buffet sáng tại Rooftop Garden là trải nghiệm khó quên.', '2026-02-16 14:15:00', true, 38, 'Chuyến công tác - Tháng 02/2026', 'Khách Hàng Thân Thiết');

INSERT INTO featured_reviews (hotel_id, rating, review_id, guest_id, guest_name, guest_avatar, hotel_name, room_id, room_number, room_type, comment, review_date, is_featured, helpful_count, stay_date, badge_title)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 5, 88888888-8888-8888-8888-888888888888, 'c262832f-6f09-4a4a-8e92-447304fcebd8', 'Nguyễn Văn An', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', 'Khách sạn Caravelle Sài Gòn', 'kdefgt', 201, 'Signature Suite', 'Phòng Signature Suite view trọn Nhà hát Lớn và sông Sài Gòn. Dịch vụ quản gia đẳng cấp, cocktail tại Saigon Saigon Bar rất ấn tượng.', '2026-03-14 15:00:00', true, 56, 'Kỳ nghỉ gia đình - Tháng 03/2026', 'Thành Viên VIP');

INSERT INTO featured_reviews (hotel_id, rating, review_id, guest_id, guest_name, guest_avatar, hotel_name, room_id, room_number, room_type, comment, review_date, is_featured, helpful_count, stay_date, badge_title)
VALUES ('5061bde8-f6f4-4767-9b92-cff82d9ab52b', 5, 99999999-9999-9999-9999-999999999999, 'GUEST006', 'Vũ Ngọc Lan', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', 'Khách sạn Sofitel Legend Metropole Hà Nội', '12-CFG', 101, 'Heritage Deluxe', 'Kiến trúc Pháp cổ kính ngập tràn cảm xúc nghệ thuật. Trà chiều tại Le Club và không gian hầm rượu cổ kính tạo nên kỳ nghỉ trọn vẹn.', '2026-02-10 14:00:00', true, 63, 'Kỳ nghỉ trăng mật - Tháng 02/2026', 'Cặp Đôi Nghỉ Dưỡng');

-- Truy vấn mẫu: Lấy tất cả đánh giá 5 sao nổi bật của khách sạn Rex Sài Gòn
SELECT hotel_id, rating, review_id, guest_name, room_type, comment, helpful_count, stay_date, badge_title
FROM featured_reviews
WHERE hotel_id = '2d76c2a1-f312-4934-83ae-a59c0574805f'
  AND rating = 5;


-- ==============================================================================
-- BỔ SUNG: MODULE ĐÁNH GIÁ KHÁCH SẠN TOÀN DIỆN (HOTEL REVIEWS & RATINGS)
-- ==============================================================================

-- BẢNG 17: Danh sách đánh giá theo khách sạn (hỗ trợ phân trang, lọc theo số sao, sắp xếp)
CREATE TABLE IF NOT EXISTS hotel_reviews (
    hotel_id text,
    review_id uuid,
    user_id text,
    user_name text,
    user_avatar text,
    booking_id text,
    confirm_number int,
    room_number int,
    room_type text,
    rating int,
    comment text,
    status text,          -- 'ACTIVE' | 'HIDDEN'
    is_verified_stay boolean,
    stay_date text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (hotel_id, review_id)
);

-- BẢNG 18: Tra cứu chi tiết đánh giá theo ID (hỗ trợ sửa, xoá, kiểm tra chính chủ O(1))
CREATE TABLE IF NOT EXISTS hotel_reviews_by_id (
    review_id uuid,
    hotel_id text,
    user_id text,
    booking_id text,
    confirm_number int,
    rating int,
    comment text,
    status text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (review_id)
);

-- BẢNG 19: Chống đánh giá trùng lặp theo Booking ID (Unique Constraint per Booking)
CREATE TABLE IF NOT EXISTS reviews_by_booking (
    booking_id text,
    review_id uuid,
    hotel_id text,
    user_id text,
    rating int,
    created_at timestamp,
    PRIMARY KEY (booking_id)
);

-- BẢNG 20: Thống kê đánh giá khách sạn tiền tính toán (Precomputed Summary O(1))
CREATE TABLE IF NOT EXISTS hotel_rating_summary (
    hotel_id text,
    average_rating decimal,
    review_count int,
    rating_sum int,
    count_1_star int,
    count_2_star int,
    count_3_star int,
    count_4_star int,
    count_5_star int,
    PRIMARY KEY (hotel_id)
);

-- Dữ liệu mẫu khởi tạo cho hotel_reviews
INSERT INTO hotel_reviews (hotel_id, review_id, user_id, user_name, user_avatar, booking_id, confirm_number, room_number, room_type, rating, comment, status, is_verified_stay, stay_date, created_at, updated_at)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 11111111-1111-1111-1111-111111111111, '0eacb0ae-a973-4bfd-9818-9a927b713cf4', 'Trần Thị Mai', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', '16380824-0000-0000-0000-000000000001', 16380824, 204, 'Executive Suite', 5, 'Khách sạn Rex Sài Gòn mang đậm dấu ấn lịch sử, phòng ốc tiện nghi và phục vụ chu đáo!', 'ACTIVE', true, '10/03/2026 - 12/03/2026', '2026-03-12 09:30:00', '2026-03-12 09:30:00');

INSERT INTO hotel_reviews (hotel_id, review_id, user_id, user_name, user_avatar, booking_id, confirm_number, room_number, room_type, rating, comment, status, is_verified_stay, stay_date, created_at, updated_at)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 22222222-2222-2222-2222-222222222222, 'c262832f-6f09-4a4a-8e92-447304fcebd8', 'Nguyễn Văn An', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', '44556677-0000-0000-0000-000000000004', 44556677, 204, 'Executive Suite', 5, 'Kỳ nghỉ tuyệt vời, vị trí đắc địa ngay trung tâm phố đi bộ. Bữa sáng buffet rất phong phú và ngon miệng.', 'ACTIVE', true, '01/03/2026 - 05/03/2026', '2026-03-05 14:15:00', '2026-03-05 14:15:00');

-- Dữ liệu mẫu hotel_rating_summary
INSERT INTO hotel_rating_summary (hotel_id, average_rating, review_count, rating_sum, count_1_star, count_2_star, count_3_star, count_4_star, count_5_star)
VALUES ('2d76c2a1-f312-4934-83ae-a59c0574805f', 4.9, 85, 416, 0, 1, 2, 7, 75);

INSERT INTO hotel_rating_summary (hotel_id, average_rating, review_count, rating_sum, count_1_star, count_2_star, count_3_star, count_4_star, count_5_star)
VALUES ('b93a7112-f4dd-41cc-b529-d5d79114078e', 4.8, 64, 307, 0, 0, 3, 9, 52);

INSERT INTO hotel_rating_summary (hotel_id, average_rating, review_count, rating_sum, count_1_star, count_2_star, count_3_star, count_4_star, count_5_star)
VALUES ('5061bde8-f6f4-4767-9b92-cff82d9ab52b', 4.9, 92, 450, 0, 0, 1, 8, 83);
