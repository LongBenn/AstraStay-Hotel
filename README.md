# 🏨 AstraStay — Hệ Thống Quản Lý & Đặt Phòng Khách Sạn Chuẩn Production
> **Ứng dụng Web Full-Stack Node.js khai thác Cơ sở dữ liệu phân tán NoSQL Apache Cassandra / DataStax Astra DB Cloud**  
> *Đồ án môn học Cơ sở dữ liệu NoSQL / Apache Cassandra — Nhóm thực hiện: Nhóm Đồ Án 2026*

---

## 📌 Bảng Điều Hướng Nhanh (Table of Contents)
- [1. Giới thiệu Dự án & Quyết định Đề tài](#1-giới-thiệu-dự-án--quyết-định-đề-tài)
- [2. Hướng dẫn Đẩy Dự án lên GitHub (Dành cho Trưởng nhóm)](#2-hướng-dẫn-đẩy-dự-án-lên-github-dành-cho-trưởng-nhóm)
- [3. Hướng dẫn Cài đặt & Khởi chạy (Dành cho Thành viên nhóm)](#3-hướng-dẫn-cài-đặt--khởi-chạy-dành-cho-thành-viên-nhóm)
- [4. Kiến trúc Tổng thể & Chi tiết Từng Thành phần](#4-kiến-trúc-tổng-thể--chi-tiết-từng-thành-phần)
- [5. Thiết kế Dữ liệu NoSQL theo Tư duy Query-First](#5-thiết-kế-dữ-liệu-nosql-theo-tư-duy-query-first)
- [6. Tính Nhất quán Dữ liệu với Cassandra Logged Batch](#6-tính-nhất-quán-dữ-liệu-với-cassandra-logged-batch)
- [7. Hướng dẫn Trải nghiệm & Kịch bản Thuyết trình Demo](#7-hướng-dẫn-trải-nghiệm--kịch-bản-thuyết-trình-demo)
- [8. Danh mục RESTful API Endpoints](#8-danh-mục-restful-api-endpoints)
- [9. Bảng So sánh Chuyên sâu: Cassandra vs. SQL Truyền thống](#9-bảng-so-sánh-chuyên-sâu-cassandra-vs-sql-truyền-thống)
- [10. Xử lý Lỗi Thường Gặp (Troubleshooting)](#10-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## 1. Giới thiệu Dự án & Quyết định Đề tài

Trong tài liệu hướng dẫn thực hành (*Mục 11.2, trang 22* của `Huong_Dan_Cassandra_AstraDB_QuanLyKhachSan.pdf`), có 4 đề tài gợi ý:
1. **Đề tài 1**: Hệ thống đặt phòng khách sạn trực tuyến (mini) — Nghiệp vụ giao dịch OLTP cốt lõi.
2. **Đề tài 2**: Dashboard thống kê doanh thu khách sạn — Nghiệp vụ báo cáo BI & Phân tích số liệu.
3. **Đề tài 3**: Hệ thống cảnh báo phòng trống theo thời gian thực — Giám sát công suất phòng.
4. **Đề tài 4**: Phân tích hành vi đặt phòng của khách hàng — Khai thác khách hàng thân thiết.

### 🎯 Quyết định Kiến trúc của Nhóm:
Nhóm lựa chọn **ĐỀ TÀI 1 LÀM NỀN TẢNG TRỌNG TÂM**, đồng thời **TÍCH HỢP TOÀN DIỆN CẢ 3 ĐỀ TÀI CÒN LẠI** vào hệ thống tạo thành một bộ ứng dụng hoàn chỉnh (Full Production Suite):
- **Cổng Khách Hàng (Customer Portal)**: `http://localhost:3000`
  - Tra cứu khách sạn theo điểm tham quan (POI), lọc phòng theo trạng thái, tính tiền tự động (giá gốc + 5% service charge + 10% VAT).
  - Đặt phòng nguyên tử bằng **Cassandra Logged Batch**, xuất hoá đơn điện tử tức thì.
  - Tra cứu đơn đặt phòng thông minh: hiển thị sẵn **danh sách các đơn đặt gần nhất** để bấm chọn nhanh, tra cứu theo UUID hoặc mã khách hàng, huỷ đơn an toàn.
- **Cổng Quản Trị & Lễ Tân (Admin Portal)**: `http://localhost:3000/admin`
  - **Sơ đồ phòng (Room Matrix Grid)**: Quản lý trực quan trạng thái từng phòng (Trống / Có khách / Bảo trì), 1-click chuyển trạng thái tức thì.
  - **Lịch trình đón khách (Booking Schedule)**: Hiển thị đầy đủ mã UUID (kèm nút sao chép 1-click) và huy hiệu mã khách hàng (`guest_id`), lọc theo ngày/khách sạn.
  - **Dashboard Doanh thu (Đề tài 2)**: Biểu đồ cột doanh thu theo khách sạn, biểu đồ xu hướng doanh thu qua các tháng (`Chart.js`).
  - **Cảnh báo Công suất (Đề tài 3)**: Đo lường tỷ lệ lấp đầy phòng thời gian thực qua thẻ KPI và biểu đồ donut.
  - **Khách hàng Thân thiết (Đề tài 4)**: Bảng xếp hạng Top khách quen đặt phòng nhiều nhất.
- **CQL Live Inspector**: Cửa sổ giả lập terminal trên cả 2 trang, hiển thị **thời gian thực các câu lệnh CQL** được thực thi ngầm kèm thời gian chạy tính bằng mili-giây ($ms$) — công cụ đắc lực khi bảo vệ đồ án trước giảng viên.

---

## 2. Hướng dẫn Đẩy Dự án lên GitHub (Dành cho Trưởng nhóm)

Dự án đã cấu hình sẵn `.gitignore` để loại trừ `node_modules`, `.env`, và các file chứng chỉ `.zip` (tránh lộ token bảo mật).

### Các bước thực hiện:

#### Bước 1: Mở PowerShell tại thư mục dự án `d:\Cassandra`
```powershell
cd d:\Cassandra
```

#### Bước 2: Khởi tạo Git và thực hiện Commit đầu tiên
```bash
# Khởi tạo kho git cục bộ
git init

# Thêm tất cả tệp vào danh sách chuẩn bị commit
git add .

# Tạo commit đầu tiên
git commit -m "feat: complete AstraStay hotel management system with Node.js and Apache Cassandra"

# Đổi nhánh mặc định thành main
git branch -M main
```

#### Bước 3: Tạo Repository trên GitHub và Đẩy mã nguồn lên
1. Truy cập [github.com/new](https://github.com/new).
2. Đặt tên Repository (ví dụ: `cassandra-hotel-management` hoặc `AstraStay-Cassandra`).
3. Chọn chế độ **Public** hoặc **Private** tuỳ nhóm.
4. **Không tích chọn** *Add a README file*, *.gitignore* hoặc *License* (vì dự án đã có sẵn).
5. Nhấn **Create repository**.
6. Sao chép URL của repo và chạy 2 lệnh sau trên terminal máy tính:
```bash
# Thay thế URL bên dưới bằng URL repo GitHub của bạn:
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git

# Đẩy code lên nhánh main
git push -u origin main
```

> [!IMPORTANT]
> File `.gitignore` đã được cấu hình chặt chẽ để **không đẩy tệp `.env` và `*.zip` lên GitHub**. Thành viên khác khi tải code về sẽ cấu hình file `.env` theo mẫu `.env.example` hoặc chạy ngay ở chế độ Mock Demo mà không cần cài đặt phức tạp.

---

## 3. Hướng dẫn Cài đặt & Khởi chạy (Dành cho Thành viên nhóm)

### Yêu cầu Tiên quyết:
- Đã cài đặt **Node.js** (phiên bản 18.x trở lên, khuyến nghị Node.js 20 hoặc 24).
- Kiểm tra bằng lệnh: `node -v` và `npm -v`.

### Bước 1: Tải mã nguồn về máy
```bash
git clone https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
cd <ten-repo>
```

### Bước 2: Cài đặt các thư viện phụ thuộc
```bash
npm install
```

---

### Bước 3: Chọn Chế độ Vận hành

Dự án được xây dựng với cơ chế **Dual-Engine** thông minh:

#### 🟢 CHẾ ĐỘ 1: Chạy Ngay Lập Tức với Mock Engine (Khuyên dùng khi xem code hoặc demo nhanh)
Không cần tài khoản DataStax Astra DB, không cần tải file bundle, không cần cấu hình `.env`!
```bash
npm start
```
Ứng dụng sẽ tự động kích hoạt **Smart Mock Engine** trong RAM với đầy đủ dữ liệu mẫu từ `Hotel.cql` (10 khách sạn, 12 điểm du lịch, 48 phòng nghỉ, 12 khách hàng, 15 đơn đặt phòng và 15 hoá đơn với tổng doanh thu hơn 176 triệu VNĐ). Mọi tính năng từ đặt phòng Logged Batch đến sơ đồ phòng và biểu đồ Chart.js đều chạy 100% bình thường.

#### 🔵 CHẾ ĐỘ 2: Kết nối trực tiếp DataStax Astra DB Cloud Thật (Chấm điểm thực tế)
Dành cho việc kiểm tra khả năng kết nối Cloud thực tế theo đúng yêu cầu đề bài:

1. Đăng nhập [astra.datastax.com](https://astra.datastax.com) và tạo một Serverless Cassandra Database (ví dụ tên: `hotel_management_demo`, Keyspace: `hotel_reservations_vn`).
2. Vào tab **Overview** $\rightarrow$ Tải file **Secure Connect Bundle** (`secure-connect-xxx.zip`) về thư mục gốc của dự án.
3. Vào tab **Tokens** $\rightarrow$ Tạo Token mới với quyền **Database Administrator**, sao chép chuỗi `AstraCS:...`.
4. Tạo tệp `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   ```
   *(Trên Windows PowerShell: `copy .env.example .env`)*
5. Mở file `.env` và điền thông tin:
   ```env
   PORT=3000
   ASTRA_DB_APPLICATION_TOKEN=AstraCS:chuoi_token_cua_ban
   ASTRA_DB_SECURE_BUNDLE_PATH=./secure-connect-hotel_management_demo.zip
   ASTRA_DB_KEYSPACE=hotel_reservations_vn
   ```
6. Khởi tạo cấu trúc bảng (DDL) và nạp dữ liệu (DML) lên Astra DB Cloud:
   ```bash
   npm run init-db
   npm run seed
   ```
7. Khởi động server:
   ```bash
   npm start
   ```
   Lúc này huy hiệu trạng thái trên thanh Header của ứng dụng sẽ hiển thị: **`DataStax Astra DB (Cloud)`**.

---

### Bước 4: Mở Trình duyệt Trải nghiệm
- **Trang Cổng Khách Hàng**: 👉 [http://localhost:3000](http://localhost:3000)
- **Trang Cổng Quản Trị & Lễ Tân**: 👉 [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 4. Kiến trúc Tổng thể & Chi tiết Từng Thành phần

### 4.1. Sơ đồ Kiến trúc Hệ thống

```
+-------------------------------------------------------------------------------+
|                                FRONTEND LAYER                                 |
|                                                                               |
|   +------------------------------------+   +-------------------------------+  |
|   |  CỔNG KHÁCH HÀNG (index.html)      |   |  CỔNG QUẢN TRỊ (admin.html)   |  |
|   |  - Tìm phòng theo POI, Giá, Loại   |   |  - Sơ đồ phòng (Room Grid)    |  |
|   |  - Đặt phòng Logged Batch          |   |  - Lịch trình đón khách (Q4)  |  |
|   |  - Hoá đơn điện tử, In ấn PDF      |   |  - Dashboard Doanh thu (BI)   |  |
|   |  - Danh sách đơn đặt gần nhất      |   |  - Xếp hạng khách hàng quen   |  |
|   +------------------------------------+   +-------------------------------+  |
|                     |                                     |                   |
|                     +------------------+------------------+                   |
|                                        | (HTTP/JSON REST API)                 |
|                                        v                                      |
+-------------------------------------------------------------------------------+
|                        BACKEND LAYER (Node.js & Express)                      |
|                                                                               |
|   Controllers: hotelController, bookingController, roomController, ...        |
|   Service DAL: cassandraService.js (Prepared Statements, Logged Batch)        |
|   CQL Live Inspector: Giám sát câu lệnh CQL chạy ngầm theo mili-giây          |
+-------------------------------------------------------------------------------+
                                         |
                                         v
+-------------------------------------------------------------------------------+
|                            DATABASE ENGINE LAYER                              |
|                                                                               |
|   +---------------------------------------+  +----------------------------+   |
|   | DATASTAX ASTRA DB (CLOUD)             |  | SMART MOCK ENGINE          |   |
|   | - Driver: official cassandra-driver   |  | - Chạy trong RAM (Node.js) |   |
|   | - Kết nối: Secure Connect Bundle .zip |  | - Hạt giống từ Hotel.cql   |   |
|   | - Xác thực: Astra Token (AstraCS:...) |  | - Sẵn sàng demo tức thì    |   |
|   +---------------------------------------+  +----------------------------+   |
+-------------------------------------------------------------------------------+
```

### 4.2. Bản đồ Thư mục & Trách nhiệm Từng Tệp Tin

```
d:/Cassandra/
├── .env.example                  # File mẫu biến môi trường kết nối Astra DB Cloud
├── .gitignore                    # Cấu hình không đưa node_modules, .env, *.zip lên GitHub
├── package.json                  # Định nghĩa dependencies (cassandra-driver, express, uuid, cors)
├── Hotel.cql                     # Kịch bản DDL/DML gốc gồm 11 bảng chuẩn theo tài liệu môn học
├── README.md                     # Tài liệu này - Hướng dẫn tổng quan & cài đặt nhanh
├── BAO_CAO_KY_THUAT.md           # Báo cáo kỹ thuật chi tiết phân tích lý thuyết, kiến trúc, API
├── Kiểm tra tiêu chí.docx        # Báo cáo đánh giá 4 tiêu chí nghiệm thu đề tài
├── src/
│   ├── app.js                    # Khởi tạo Express server, đăng ký routes / và /admin
│   ├── config/
│   │   └── cassandra.js          # Bộ điều hướng kết nối DB (Astra DB / Local / Smart Mock Fallback)
│   ├── controllers/
│   │   ├── hotelController.js     # API tìm kiếm khách sạn theo POI, xem chi tiết KS (Q1, Q3)
│   │   ├── roomController.js      # API danh mục phòng & cập nhật trạng thái phòng (Q2)
│   │   ├── bookingController.js   # API tạo đặt phòng BATCH, huỷ đơn, lấy đơn gần nhất (Q3, Q4)
│   │   ├── invoiceController.js   # API tra cứu chi tiết hoá đơn điện tử (Q5)
│   │   └── analyticsController.js # API tính toán KPI, doanh thu khách sạn, Top khách quen (Đề tài 2, 4)
│   ├── services/
│   │   ├── cassandraService.js    # Tầng DAL thực thi Prepared Statements, BatchStatement (logged: true)
│   │   └── mockStore.js          # Dữ liệu hạt giống mở rộng (10 KS, 48 phòng, 15 đơn, 15 hoá đơn)
│   ├── routes/
│   │   └── api.js                # Khai báo toàn bộ đường dẫn RESTful API endpoints
│   └── scripts/
│       ├── init-db.js            # Script tự động tạo 11 bảng DDL trên Astra DB Cloud
│       └── seed-data.js          # Script tự động nạp dữ liệu mẫu DML lên Astra DB Cloud
└── public/
    ├── index.html                # Giao diện Cổng Khách Hàng (Tìm phòng, Đặt phòng, Tra cứu đơn)
    ├── admin.html                # Giao diện Cổng Quản Trị & Lễ Tân (Sơ đồ phòng, Lịch trình, Dashboard)
    ├── css/
    │   └── styles.css            # Tùy biến CSS, giao diện Luxury Hospitality, định dạng in hoá đơn
    └── js/
        ├── common.js             # Hàm dùng chung: Sao chép Clipboard, kiểm tra trạng thái DB, CQL Inspector
        ├── guest.js              # Logic giao diện Khách Hàng: Tính tổng tiền, chọn đơn gần nhất, huỷ đơn
        ├── admin.js              # Logic giao diện Quản Trị: Sơ đồ phòng 1-click, lịch trình đầy đủ UUID
        └── charts.js             # Cấu hình biểu đồ Chart.js trực quan (Cột doanh thu, Xu hướng tháng)
```

---

## 5. Thiết kế Dữ liệu NoSQL theo Tư duy Query-First

Khác biệt cốt lõi nhất giữa Cassandra và SQL truyền thống:
- **SQL (Data-First)**: Chuẩn hoá các bảng (3NF), tránh dư thừa dữ liệu, khi cần lấy thông tin thì dùng `JOIN`.
- **Cassandra (Query-First)**: **Xác định câu hỏi truy vấn trước, thiết kế bảng phục vụ riêng cho câu hỏi đó sau**. Chấp nhận nhân bản dữ liệu (Denormalization) để đạt độ phức tạp tìm kiếm $O(1)$ trên cụm phân tán hàng trăm node.

### Bảng Ánh Xạ Truy Vấn Nghiệp Vụ $\rightarrow$ Bảng CQL:

| Mã | Nghiệp vụ cần phục vụ | Tên bảng CQL | Partition Key | Clustering Column | Giải thích lý do lựa chọn |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Q1** | Tìm khách sạn gần điểm tham quan (POI) | `hotels_by_poi` | `poi_name` | `hotel_id` (ASC) | `poi_name` làm Partition Key giúp gom toàn bộ khách sạn gần 1 danh lam thắng cảnh về cùng 1 node vật lý. Truy vấn `WHERE poi_name = ?` không cần quét toàn bộ cụm. |
| **Q2** | Xem thông tin chi tiết khách sạn | `hotels` | `hotel_id` | *(Không có)* | Khóa chính đơn phân bổ đều các khách sạn trên vòng băm (Hash Ring). |
| **Q2** | Danh mục phòng và trạng thái của khách sạn | `rooms_by_hotel` | `hotel_id` | `room_number` (ASC) | Toàn bộ phòng của 1 khách sạn nằm trong cùng 1 partition, sắp xếp vật lý tăng dần theo số phòng trên đĩa. |
| **Q3** | Khách sạn gần những điểm tham quan nào | `pois_by_hotel` | `hotel_id` | `poi_name` (ASC) | Tra cứu ngược từ khách sạn ra các danh lam thắng cảnh xung quanh. |
| **Q3** | Lịch sử đặt phòng của một khách hàng | `bookings_by_guest` | `guest_id` | `check_in_date` (DESC), `booking_id` (DESC) | **Rất quan trọng**: Khách hàng luôn muốn xem chuyến đi gần nhất/sắp tới trước tiên. Cấu hình `CLUSTERING ORDER BY (check_in_date DESC)` giúp dữ liệu lưu trữ đã được đảo ngược sẵn trên đĩa; đọc ra tức thì mà không tốn tài nguyên `ORDER BY`. |
| **Q4** | Lịch trình đón khách của khách sạn theo ngày | `bookings_by_hotel_date` | `hotel_id` | `check_in_date` (ASC), `booking_id` (ASC) | **Rất quan trọng**: Phục vụ bộ phận lễ tân chuẩn bị đón khách theo thứ tự thời gian tăng dần trong một khoảng ngày (`check_in_date >= ? AND check_in_date <= ?`). |
| **Q5** | Tiện ích và mức giá phòng của một khách sạn | `amenities_by_room` | `(hotel_id, room_id)` *(Composite PK)* | `amenity_name` (ASC) | Dùng khóa phân vùng kết hợp `(hotel_id, room_id)` để đảm bảo tính duy nhất, tránh va chạm khi các khách sạn khác nhau có cùng số phòng (ví dụ: phòng 101). |
| **Q5** | Chi tiết hoá đơn của một đơn đặt phòng | `invoices_by_booking` | `booking_id` | `invoice_id` (ASC) | Lấy tức thì thông tin thanh toán khi có mã đơn đặt. |
| **Q9** | Hồ sơ thông tin cá nhân khách hàng | `guests` | `guest_id` | *(Không có)* | Lưu trữ họ tên, điện thoại, email, địa chỉ khách hàng. |

> [!TIP]
> **Quy tắc Vàng**: Toàn bộ các truy vấn trong ứng dụng đều được chỉ định chính xác Partition Key và Clustering Column. **100% không sử dụng `ALLOW FILTERING`**, đảm bảo tốc độ phản hồi tính bằng mili-giây kể cả khi dữ liệu lên tới hàng triệu bản ghi.

---

## 6. Tính Nhất quán Dữ liệu với Cassandra Logged Batch

### Tại sao đơn đặt phòng phải lưu ở cả 2 bảng?
Do Cassandra không có phép `JOIN`:
1. Khi khách hàng xem lịch sử: Cần truy vấn nhanh theo `guest_id` $\rightarrow$ Đọc bảng `bookings_by_guest`.
2. Khi lễ tân xem lịch trình: Cần truy vấn nhanh theo `hotel_id` và ngày $\rightarrow$ Đọc bảng `bookings_by_hotel_date`.

### Giải pháp Atomic Logged Batch:
Trong [`src/services/cassandraService.js`](file:///d:/Cassandra/src/services/cassandraService.js), khi khách bấm đặt phòng, hệ thống thực thi một giao dịch nguyên tử gồm **4 câu lệnh đồng thời**:

```javascript
const batchQueries = [
  {
    // 1. Lưu vào lịch sử khách hàng (Q3)
    query: 'INSERT INTO bookings_by_guest (guest_id, check_in_date, booking_id, hotel_id, hotel_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
    params: [guest_id, cqlCheckIn, cqlBookingId, hotel_id, hotel_name, room_num, cqlCheckOut, total_amount, status]
  },
  {
    // 2. Lưu vào lịch trình đón khách của khách sạn (Q4)
    query: 'INSERT INTO bookings_by_hotel_date (hotel_id, check_in_date, booking_id, guest_id, guest_name, room_number, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
    params: [hotel_id, cqlCheckIn, cqlBookingId, guest_id, guest_name, room_num, cqlCheckOut, total_amount, status]
  },
  {
    // 3. Tạo hoá đơn điện tử (Q5)
    query: 'INSERT INTO invoices_by_booking (booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    params: [cqlBookingId, cqlInvoiceId, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, 'PAID', issued_at]
  },
  {
    // 4. Chuyển trạng thái phòng sang OCCUPIED (Q2)
    query: 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;',
    params: ['OCCUPIED', hotel_id, room_num]
  }
];

// Thực thi qua Driver với chế độ logged: true
await client.batch(batchQueries, { prepare: true, logged: true });
```

### Cơ chế đảm bảo tính toàn vẹn:
Node tiếp nhận (Coordinator Node) sẽ ghi nhận một bản ghi Batch Log vào bảng hệ thống trước khi gửi lệnh tới các Replica Node. Nếu mạng bị gián đoạn giữa chừng, bản ghi log này sẽ được tự động **Replay** để hoàn tất, bảo đảm: **Hoặc cả 4 bảng cùng ghi nhận thành công, hoặc không có bảng nào bị ghi sai lệch**.

---

## 7. Hướng dẫn Trải nghiệm & Kịch bản Thuyết trình Demo

Khi trình bày cho giảng viên hoặc các bạn trong nhóm, hãy thực hiện theo kịch bản 5 bước chuẩn sau:

### Bước 1: Khám phá Khách sạn theo Điểm Du Lịch (POI)
1. Mở Cổng Khách Hàng tại `http://localhost:3000`.
2. Tại thanh tìm kiếm, chọn Điểm tham quan: `Chợ Bến Thành`.
3. Bấm **Tìm kiếm**: Danh sách các khách sạn gần Chợ Bến Thành (Rex Hotel Sài Gòn, Caravelle Sài Gòn) hiển thị ngay lập tức.
4. Mở nút **CQL Live Inspector** ở góc dưới bên phải màn hình: Giảng viên sẽ thấy ngay câu truy vấn ngầm:
   `SELECT hotel_id, poi_name, hotel_name, address, star_rating FROM hotels_by_poi WHERE poi_name = ?;` với thời gian thực thi tính bằng mili-giây.

### Bước 2: Đặt Phòng Trực Tuyến & Hoá Đơn Điện Tử
1. Bấm **Xem phòng** tại khách sạn *Rex Hotel Sài Gòn*.
2. Chọn phòng có trạng thái `Trống` (ví dụ: Phòng 101 - Deluxe City View) và nhấn **Đặt ngay**.
3. Modal đặt phòng mở ra: Nhập thông tin khách hàng, ngày nhận phòng, ngày trả phòng.
4. Chú ý phần **Chi tiết thanh toán**: Hệ thống tự động tính tiền phòng + 5% phí dịch vụ + 10% VAT.
5. Nhấn **Xác nhận đặt phòng & Thanh toán**:
   - Modal chúc mừng mở ra hiển thị mã đơn đặt phòng UUID đầy đủ (kèm nút sao chép 1-click) và nút **In hoá đơn**.
   - Mở **CQL Live Inspector**: Quan sát lệnh `BEGIN BATCH ... APPLY BATCH;` ghi đồng thời vào 4 bảng.

### Bước 3: Tra Cứu & Huỷ Đặt Phòng
1. Cuộn xuống phần **Tra cứu đơn đặt phòng**:
   - Chú ý khu vực **Đơn đặt phòng gần nhất**: Bấm trực tiếp vào bất kỳ thẻ đơn nào để tra cứu tức thì mà không cần tự nhập mã!
   - Hoặc dán mã UUID vừa sao chép vào ô tìm kiếm và bấm **Tra cứu**.
2. Chi tiết đặt phòng và hoá đơn VAT hiển thị đầy đủ.
3. Bấm nút **Huỷ đơn đặt**: Hệ thống thực hiện Batch cập nhật trạng thái `CANCELLED` ở cả 2 bảng `bookings_by_guest` và `bookings_by_hotel_date`, đồng thời trả trạng thái phòng về `AVAILABLE`.

### Bước 4: Sơ Đồ Phòng Trực Quan Dạng Lưới (Cổng Quản Trị)
1. Chuyển sang Cổng Quản Trị tại `http://localhost:3000/admin`.
2. Xem tab **Sơ đồ phòng (Room Matrix)**:
   - Các phòng hiển thị màu trực quan: Xanh lá (Trống), Đỏ (Có khách), Vàng (Bảo trì).
   - Bấm trực tiếp vào nút **Có khách / Trống / Bảo trì** trên từng thẻ phòng: Trạng thái phòng được cập nhật tức thì vào bảng `rooms_by_hotel` bằng câu lệnh `UPDATE ... WHERE hotel_id = ? AND room_number = ?`.

### Bước 5: Lịch Trình Đón Khách & Dashboard Doanh Thu
1. Chuyển sang tab **Lịch trình đặt phòng**:
   - Bảng hiển thị danh sách khách đến theo từng khách sạn.
   - Cột **Mã đặt phòng** hiển thị đầy đủ UUID kèm nút sao chép màu xanh tiện lợi.
   - Cột **Mã khách hàng** hiển thị rõ ràng mã định danh (ví dụ `GUEST001`, `GUEST002`).
2. Chuyển sang tab **Dashboard Báo Cáo**:
   - Xem 4 thẻ KPI: Tổng số phòng, Tỷ lệ lấp đầy (Cảnh báo thời gian thực - Đề tài 3), Tổng doanh thu, Tổng lượt đặt phòng.
   - Xem 2 biểu đồ Chart.js trực quan: Biểu đồ cột Doanh thu theo khách sạn và Biểu đồ diện tích Xu hướng doanh thu theo các tháng (Đề tài 2).
   - Xem bảng **Top Khách hàng thân thiết** xếp hạng theo số lần đặt phòng và tổng chi tiêu (Đề tài 4).

---

## 8. Danh mục RESTful API Endpoints

| Method | Endpoint URL | Chức năng nghiệp vụ | Bảng Cassandra truy xuất |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels` | Lấy danh sách khách sạn (hỗ trợ lọc `?poi=...`) | `hotels`, `hotels_by_poi` |
| `GET` | `/api/hotels/pois` | Lấy danh sách tất cả các điểm du lịch | `hotels_by_poi` |
| `GET` | `/api/hotels/:id` | Xem thông tin chi tiết một khách sạn | `hotels`, `pois_by_hotel` |
| `GET` | `/api/hotels/:id/rooms` | Lấy danh mục phòng của khách sạn | `rooms_by_hotel` |
| `PATCH` | `/api/hotels/:id/rooms/:roomNumber/status` | Đổi trạng thái phòng (AVAILABLE / OCCUPIED / MAINTENANCE) | `rooms_by_hotel` |
| `POST` | `/api/bookings` | **Tạo đơn đặt phòng mới (Cassandra Logged Batch)** | `bookings_by_guest`, `bookings_by_hotel_date`, `invoices_by_booking`, `rooms_by_hotel` |
| `GET` | `/api/bookings/recent` | Lấy danh sách các đơn đặt phòng mới nhất | `bookings_by_hotel_date` |
| `GET` | `/api/bookings/detail/:bookingId` | Tra cứu chi tiết đơn đặt phòng theo UUID | `invoices_by_booking`, `bookings_by_guest` |
| `DELETE` | `/api/bookings/:bookingId` | **Huỷ đơn đặt phòng (Dual-write Batch)** | `bookings_by_guest`, `bookings_by_hotel_date`, `rooms_by_hotel` |
| `GET` | `/api/bookings/guest/:guestId` | Lấy lịch sử đặt phòng của một khách hàng (Q3) | `bookings_by_guest` |
| `GET` | `/api/bookings/hotel/:hotelId` | Lấy lịch trình đặt phòng theo khách sạn & ngày (Q4) | `bookings_by_hotel_date` |
| `GET` | `/api/invoices/:bookingId` | Tra cứu chi tiết hoá đơn theo mã đơn (Q5) | `invoices_by_booking` |
| `GET` | `/api/analytics/dashboard` | Lấy số liệu KPI, biểu đồ doanh thu và Top khách quen | `invoices_by_booking`, `bookings_by_guest`, `rooms_by_hotel` |
| `GET` | `/api/analytics/cql-history` | Lấy lịch sử các câu lệnh CQL chạy ngầm | Cache giám sát hệ thống |
| `GET` | `/api/analytics/system-status` | Kiểm tra loại database đang kết nối | Trạng thái Driver |

---

## 9. Bảng So sánh Chuyên sâu: Cassandra vs. SQL Truyền thống

| Tiêu chí so sánh | Cơ sở dữ liệu Quan hệ RDBMS (MySQL, PostgreSQL) | Cơ sở dữ liệu NoSQL (Apache Cassandra / Astra DB) |
| :--- | :--- | :--- |
| **Triết lý thiết kế** | **Data-First**: Chuẩn hoá cấu trúc thực thể (3NF) để tránh dư thừa; câu truy vấn viết sau tuỳ ý. | **Query-First**: Phải xác định trước câu hỏi nghiệp vụ cần truy vấn, thiết kế mỗi bảng tối ưu riêng cho 1 câu hỏi. |
| **Xử lý mối quan hệ** | Sử dụng câu lệnh `JOIN` tại thời điểm chạy. Khi dữ liệu lớn, chi phí CPU/RAM tăng theo hàm mũ. | **Không hỗ trợ JOIN**: Chấp nhận nhân bản dữ liệu (Denormalization) vào nhiều bảng để lấy dữ liệu với độ phức tạp $O(1)$. |
| **Khóa chính (Primary Key)** | Định danh bản ghi duy nhất, tạo chỉ mục tìm kiếm (B-Tree). | Gồm 2 phần: **Partition Key** (quyết định vị trí node lưu trữ) và **Clustering Column** (quyết định thứ tự sắp xếp trên đĩa). |
| **Tính toàn vẹn** | Ràng buộc khoá ngoại (Foreign Key) và giao dịch ACID chặt chẽ. | Áp dụng **`BatchStatement (LOGGED)`** để đồng bộ giữa các bảng nhân bản; theo mô hình Tunable Consistency (BASE). |
| **Khả năng mở rộng** | Mở rộng theo chiều dọc (Vertical Scaling): nâng cấp phần cứng máy chủ trung tâm (đắt đỏ, có giới hạn). | Mở rộng theo chiều ngang (Horizontal Scaling): thêm bao nhiêu node mạng tuỳ ý mà không cần dừng hệ thống. |
| **Mô hình kiến trúc** | Master-Slave: Node Master nhận ghi, các node Slave nhận đọc $\rightarrow$ Có điểm nghẽn Single Point of Failure. | Mạng ngang hàng Peer-to-Peer (Ring Topology): Mọi node đều bình đẳng, không có điểm nghẽn đơn lẻ. |

---

## 10. Xử lý Lỗi Thường Gặp (Troubleshooting)

### 1. Lỗi `NoHostAvailable` hoặc kết nối Astra DB thất bại
- **Nguyên nhân**: Token sai hoặc hết hạn, file Secure Connect Bundle `.zip` bị đặt sai đường dẫn, hoặc tường lửa chặn cổng 29042.
- **Khắc phục**: Kiểm tra lại đường dẫn trong file `.env`, tạo lại Token mới với quyền `Database Administrator` trên portal DataStax. Hoặc tạm thời xoá file `.env` để ứng dụng tự động chạy ở chế độ **Mock Demo**.

### 2. Database trên Astra DB ở trạng thái `Hibernated` ("Ngủ đông")
- **Nguyên nhân**: Gói miễn phí của DataStax sẽ tự động tạm ngưng database sau vài ngày không có truy vấn để tiết kiệm tài nguyên.
- **Khắc phục**: Truy cập [astra.datastax.com](https://astra.datastax.com), tìm database của bạn và bấm nút **Resume / Wake Up**. Chờ khoảng 1-2 phút cho database chuyển sang màu xanh lá (`Active`) rồi mới chạy lại ứng dụng.

### 3. Lỗi xung đột cổng `EADDRINUSE: address already in use :::3000`
- **Nguyên nhân**: Có một tiến trình Node.js khác đang chiếm giữ cổng 3000.
- **Khắc phục**:
  ```powershell
  # Tìm và tắt tiến trình chiếm cổng 3000 trên Windows:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```
  Hoặc đổi biến `PORT=3001` trong file `.env`.

---

## 📄 Tài liệu Đính kèm trong Dự án
- 📘 [`BAO_CAO_KY_THUAT.md`](./BAO_CAO_KY_THUAT.md): Báo cáo kỹ thuật phân tích chi tiết từng hàm, luồng dữ liệu và cơ chế Cassandra.
- 📑 [`Kiểm tra tiêu chí.docx`](./Kiểm%20tra%20tiêu%20chí.docx): Tài liệu kiểm tra và xác nhận đạt 100% 4 tiêu chí nghiệm thu của đề tài.
- 🗄️ [`Hotel.cql`](./Hotel.cql): File kịch bản DDL/DML gốc gồm 11 bảng chuẩn.
- 📕 [`Huong_Dan_Cassandra_AstraDB_QuanLyKhachSan.pdf`](./Huong_Dan_Cassandra_AstraDB_QuanLyKhachSan.pdf): Tài liệu bài giảng lý thuyết và bài tập môn học.

---
*Chúc nhóm thực hiện đồ án thành công và đạt điểm số tối đa! 🎉*
