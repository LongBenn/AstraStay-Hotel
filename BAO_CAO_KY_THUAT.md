# BÁO CÁO KỸ THUẬT HỆ THỐNG QUẢN LÝ & ĐẶT PHÒNG KHÁCH SẠN ASTRA STAY
> **Dự án khai thác Cơ sở dữ liệu phân tán NoSQL Apache Cassandra trên DataStax Astra DB Cloud**  
> **Nền tảng phát triển**: Node.js (Express.js) + DataStax `cassandra-driver` + Single Page Application (Tailwind CSS, Chart.js)  
> **Tài liệu tham chiếu**: `Huong_Dan_Cassandra_AstraDB_QuanLyKhachSan.pdf` & `Hotel.cql`

---

## MỤC LỤC BÁO CÁO
1. [Giới thiệu Dự án & Phân tích Đề tài](#1-giới-thiệu-dự-án--phân-tích-đề-tài)
2. [Kiến trúc Tổng thể Hệ thống (System Architecture)](#2-kiến-trúc-tổng-thể-hệ-thống-system-architecture)
3. [Thiết kế Dữ liệu NoSQL theo Tư duy Query-First](#3-thiết-kế-dữ-liệu-nosql-theo-tư-duy-query-first)
4. [Tính Nhất quán Dữ liệu & Cơ chế Atomic Logged Batch](#4-tính-nhất-quán-dữ-liệu--cơ-chế-atomic-logged-batch)
5. [Cấu trúc Thư mục & Chi tiết Từng Thành phần Mã Nguồn](#5-cấu-trúc-thư-mục--chi-tiết-từng-thành-phần-mã-nguồn)
6. [Danh mục RESTful API Endpoints](#6-danh-mục-restful-api-endpoints)
7. [Bảng Đối sánh Chuyên sâu: Apache Cassandra vs. RDBMS (SQL)](#7-bảng-đối-sánh-chuyên-sâu-apache-cassandra-vs-rdbms-sql)
8. [Hướng dẫn Khởi chạy & Vận hành cho Thành viên Nhóm](#8-hướng-dẫn-khởi-chạy--vận-hành-cho-thành-viên-nhóm)
9. [Xử lý Các Tình huống Lỗi Thường gặp (Troubleshooting)](#9-xử-lý-các-tình-huống-lỗi-thường-gặp-troubleshooting)

---

## 1. Giới thiệu Dự án & Phân tích Đề tài

### 1.1. Bối cảnh
Trong chương trình thực hành NoSQL Cassandra, bài toán Quản lý Khách sạn là ví dụ kinh điển để sinh viên chuyển đổi từ tư duy **quan hệ (RDBMS - chuẩn hoá 3NF, dùng JOIN)** sang tư duy **cột mở rộng (Wide-column Store - phi chuẩn hoá, thiết kế xoay quanh truy vấn)**.

### 1.2. Phân tích 4 đề tài tại Mục 11.2 của tài liệu hướng dẫn:
- **Đề tài 1 (Đặt phòng trực tuyến)**: Trọng tâm nghiệp vụ vận hành (OLTP), đòi hỏi tra cứu phòng trống, đặt phòng, huỷ phòng và xuất hoá đơn.
- **Đề tài 2 (Dashboard doanh thu)**: Nghiệp vụ báo cáo, phân tích số liệu (BI/Analytics) với biểu đồ trực quan.
- **Đề tài 3 (Hệ thống cảnh báo phòng trống)**: Giám sát công suất phòng thời gian thực.
- **Đề tài 4 (Phân tích hành vi khách hàng)**: Khai thác khách hàng thân thiết và mùa cao điểm.

### 1.3. Quyết định Kiến trúc của Nhóm:
Nhóm quyết định xây dựng **Đề tài 1 làm nền tảng cốt lõi**, đồng thời **tích hợp trọn vẹn cả 3 đề tài còn lại** vào phân hệ Quản trị. Dự án được tách thành **2 trang web độc lập**:
- **Trang Khách hàng (`http://localhost:3000`)**: Tra cứu theo điểm du lịch (POI), đặt phòng trực tuyến, hoá đơn điện tử, tra cứu đơn theo UUID/mã khách, xem danh sách các đơn đặt gần nhất để chọn nhanh.
- **Trang Quản trị & Lễ tân (`http://localhost:3000/admin`)**: Sơ đồ phòng dạng lưới (Room Matrix Grid), đổi trạng thái phòng nhanh, lịch trình đón khách theo ngày (hiển thị đầy đủ UUID kèm nút sao chép), dashboard báo cáo doanh thu & phân tích khách hàng.

---

## 2. Kiến trúc Tổng thể Hệ thống (System Architecture)

```
+-------------------------------------------------------------------------------+
|                                FRONTEND LAYER                                 |
|                                                                               |
|   +------------------------------------+   +-------------------------------+  |
|   |  Cổng Khách Hàng (index.html)      |   |  Cổng Quản Trị (admin.html)   |  |
|   |  - Tìm kiếm POI, Đặt phòng BATCH   |   |  - Sơ đồ phòng (Room Grid)    |  |
|   |  - Hoá đơn điện tử, Tra cứu UUID   |   |  - Lịch trình đón khách (Q4)  |  |
|   |  - Danh sách đơn đặt gần nhất      |   |  - Dashboard Doanh Thu (Chart)|  |
|   +------------------------------------+   +-------------------------------+  |
|                     |                                     |                   |
|                     +------------------+------------------+                   |
|                                        | (HTTP/JSON REST API)                 |
+----------------------------------------|--------------------------------------+
                                         v
+-------------------------------------------------------------------------------+
|                           BACKEND LAYER (Node.js/Express)                     |
|                                                                               |
|   Controllers: hotelController, bookingController, roomController, ...        |
|   Service DAL: cassandraService.js (Prepared Statements, Logged Batch)        |
|   Query Inspector: Ghi log thời gian thực các câu lệnh CQL chạy ngầm          |
+----------------------------------------|--------------------------------------+
                                         v
+-------------------------------------------------------------------------------+
|                            DATABASE ENGINE LAYER                              |
|                                                                               |
|   +---------------------------------------+  +----------------------------+   |
|   | CHẾ ĐỘ 1: DATASTAX ASTRA DB (CLOUD)   |  | CHẾ ĐỘ 2: SMART MOCK       |   |
|   | - Driver: cassandra-driver            |  | - Chạy trong RAM (Node.js) |   |
|   | - Kết nối: Secure Connect Bundle .zip |  | - Seed data từ Hotel.cql   |   |
|   | - Xác thực: Token (AstraCS:...)       |  | - Sẵn sàng demo tức thì    |   |
|   +---------------------------------------+  +----------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 3. Thiết kế Dữ liệu NoSQL theo Tư duy Query-First

Khác với SQL thiết kế bảng trước rồi viết truy vấn sau, Cassandra yêu cầu **xác định câu hỏi trước, thiết kế bảng phục vụ riêng cho câu hỏi đó sau**.

### 3.1. Bảng Ánh xạ Chi tiết Truy vấn Nghiệp vụ $\rightarrow$ Bảng CQL

| Mã | Câu hỏi nghiệp vụ cần trả lời | Tên bảng CQL | Partition Key (Khóa phân vùng) | Clustering Column (Khóa phân cụm) | Rationale & Giải thích thiết kế |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Q1** | Khách sạn nào gần điểm tham quan X? | `hotels_by_poi` | `poi_name` | `hotel_id` (ASC) | Đặt `poi_name` làm Partition Key giúp gom toàn bộ khách sạn gần 1 danh lam thắng cảnh về cùng 1 node mạng. Truy vấn `WHERE poi_name = ?` đạt độ phức tạp $O(1)$ mà không cần quét bảng. |
| **Q2** | Thông tin chi tiết của khách sạn X? | `hotels` | `hotel_id` | *(Không có)* | Khóa chính đơn phân bổ đều các khách sạn trên vòng băm (Hash Ring) của cụm. |
| **Q2** | Danh sách phòng và trạng thái của khách sạn X? | `rooms_by_hotel` | `hotel_id` | `room_number` (ASC) | Gom toàn bộ phòng của một khách sạn vào cùng partition. `room_number` giúp dữ liệu được sắp xếp vật lý theo thứ tự số phòng tăng dần trên đĩa. |
| **Q3** | Khách sạn X gần những điểm tham quan nào? | `pois_by_hotel` | `hotel_id` | `poi_name` (ASC) | Tra cứu theo chiều ngược lại từ khách sạn ra các địa danh bao quanh. |
| **Q3** | Lịch sử các lần đặt phòng của khách hàng X? | `bookings_by_guest` | `guest_id` | `check_in_date` (DESC), `booking_id` (DESC) | **Rất quan trọng**: Khách hàng mở app luôn muốn thấy chuyến đi gần nhất/sắp tới trước tiên. Thiết lập `WITH CLUSTERING ORDER BY (check_in_date DESC)` giúp dữ liệu được ghi xuống đĩa theo thứ tự giảm dần sẵn; đọc ra tức thì mà không tốn CPU server `ORDER BY`. |
| **Q4** | Khách sạn X có những lượt đặt phòng nào trong khoảng ngày [A, B]? | `bookings_by_hotel_date` | `hotel_id` | `check_in_date` (ASC), `booking_id` (ASC) | **Rất quan trọng**: Phục vụ lễ tân chuẩn bị đón khách theo thứ tự thời gian tăng dần (`check_in_date >= A AND check_in_date <= B`). |
| **Q5** | Tiện ích và mức giá của phòng Y thuộc khách sạn X? | `amenities_by_room` | `(hotel_id, room_id)` *(Composite PK)* | `amenity_name` (ASC) | Sử dụng khóa phân vùng kết hợp `(hotel_id, room_id)` để đảm bảo tính duy nhất, tránh nhầm lẫn khi các khách sạn khác nhau có cùng số phòng. |
| **Q5** | Chi tiết hoá đơn của đơn đặt phòng Z? | `invoices_by_booking` | `booking_id` | `invoice_id` (ASC) | Truy xuất tức thì hoá đơn thanh toán ngay khi có mã đơn đặt. |
| **Q9** | Thông tin cá nhân của khách hàng X? | `guests` | `guest_id` | *(Không có)* | Lưu trữ hồ sơ họ tên, số điện thoại, email, địa chỉ. |

### 3.2. Vì sao Tuyệt đối Không Dùng `ALLOW FILTERING` trong Môi trường Thực tế?
Trong tài liệu hướng dẫn (Mục 12), DataStax cảnh báo: Lệnh `ALLOW FILTERING` buộc Cassandra phải quét toàn bộ các partition trên nhiều máy chủ vật lý để lọc dữ liệu. Điều này phá vỡ hoàn toàn lợi thế độ trễ mili-giây của Cassandra. Trong dự án AstraStay, **100% câu truy vấn đều lọc chuẩn xác trên Partition Key và Clustering Column**, không sử dụng `ALLOW FILTERING`.

---

## 4. Tính Nhất quán Dữ liệu & Cơ chế Atomic Logged Batch

### 4.1. Thách thức: Vì sao dữ liệu Đặt phòng phải lưu ở 2 bảng?
Do Cassandra không có lệnh `JOIN`:
- Khách hàng cần xem đơn của mình: `WHERE guest_id = ?` $\rightarrow$ Truy vấn vào partition của `guest_id` trên bảng `bookings_by_guest`.
- Lễ tân cần xem đơn của khách sạn theo ngày: `WHERE hotel_id = ?` $\rightarrow$ Truy vấn vào partition của `hotel_id` trên bảng `bookings_by_hotel_date`.

Nếu chỉ cập nhật một bảng mà quên bảng kia, hoặc mạng bị ngắt giữa 2 câu lệnh INSERT độc lập, hệ thống sẽ gặp lỗi **dữ liệu bị lệch (bảng có, bảng không)**.

### 4.2. Giải pháp: Sử dụng Cassandra `BatchStatement (loại LOGGED)`
Trong tệp [`src/services/cassandraService.js`](file:///d:/Cassandra/src/services/cassandraService.js), nhóm đã hiện thực hóa giao dịch nguyên tử (Atomic Batch):

```javascript
// Gộp 4 thao tác ghi vào 1 Batch duy nhất
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
    // 3. Phát sinh hoá đơn điện tử (Q5)
    query: 'INSERT INTO invoices_by_booking (booking_id, invoice_id, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, payment_status, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    params: [cqlBookingId, cqlInvoiceId, guest_id, hotel_id, room_charge, service_charge, tax, total_amount, 'PAID', issued_at]
  },
  {
    // 4. Chuyển phòng sang trạng thái OCCUPIED (Q2)
    query: 'UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;',
    params: ['OCCUPIED', hotel_id, room_num]
  }
];

// Thực thi qua DataStax Driver với logged: true
await client.batch(batchQueries, { prepare: true, logged: true });
```

### 4.3. Nguyên lý bảo đảm tính nhất quán dưới tầng kiến trúc Cassandra:
Khi nhận `LOGGED BATCH`, node tiếp nhận (Coordinator Node) sẽ ghi nhận một bản ghi Batch Log vào bảng hệ thống trước khi gửi lệnh tới các Replica Node. Nếu mạng bị gián đoạn giữa chừng, bản ghi log này sẽ được tự động **Replay** để hoàn tất, đảm bảo: **Hoặc cả 4 bảng cùng ghi nhận thành công, hoặc không có bảng nào bị sai lệch**.

---

## 5. Cấu trúc Thư mục & Chi tiết Từng Thành phần Mã Nguồn

```
d:/Cassandra/
├── .env.example                  # File mẫu biến môi trường (Token Astra, đường dẫn file zip)
├── .gitignore                    # Loại trừ node_modules, .env, *.zip khỏi Git
├── package.json                  # Cấu hình dự án và dependencies (cassandra-driver, express, uuid, cors)
├── Hotel.cql                     # Kịch bản DDL/DML gốc của bài toán khách sạn
├── BAO_CAO_KY_THUAT.md           # Báo cáo kỹ thuật chi tiết này
├── README.md                     # Hướng dẫn nhanh cho GitHub
├── src/
│   ├── app.js                    # Entry point của Express server, phân tuyến route / và /admin
│   ├── config/
│   │   └── cassandra.js          # Kết nối DataStax Astra DB Cloud / Local / Smart Mock Engine
│   ├── controllers/
│   │   ├── hotelController.js     # Xử lý API khách sạn, điểm tham quan POI (Q1, Q3)
│   │   ├── roomController.js      # Xử lý API phòng & cập nhật trạng thái phòng (Q2)
│   │   ├── bookingController.js   # Xử lý tạo đặt phòng (BATCH), huỷ phòng, tra cứu (Q3, Q4)
│   │   ├── invoiceController.js   # Xử lý tra cứu hoá đơn điện tử (Q5)
│   │   └── analyticsController.js # Xử lý Dashboard thống kê doanh thu & KPI (Đề tài 2, 4)
│   ├── services/
│   │   ├── cassandraService.js    # Tầng DAL thực thi truy vấn CQL, Prepared Statements & Batch
│   │   └── mockStore.js          # Bộ dữ liệu hạt giống mở rộng phong phú (10 KS, 48 phòng, 15 đơn)
│   ├── routes/
│   │   └── api.js                # Định nghĩa toàn bộ RESTful API endpoints
│   └── scripts/
│       ├── init-db.js            # Script tự động tạo 11 bảng trên Astra DB Cloud
│       └── seed-data.js          # Script tự động nạp dữ liệu mẫu lên Astra DB Cloud
└── public/
    ├── index.html                # Trang Cổng Khách Hàng (Đặt phòng, tra cứu, hoá đơn)
    ├── admin.html                # Trang Cổng Quản Trị & Lễ Tân (Sơ đồ phòng, Lịch trình, Dashboard)
    ├── css/
    │   └── styles.css            # Styles tùy biến phong cách Luxury Resort, in ấn hoá đơn
    └── js/
        ├── common.js             # Tiện ích chung: Sao chép Clipboard, CQL Live Inspector
        ├── guest.js              # Logic phía Khách hàng: Tính tiền tự động, chọn đơn gần nhất
        ├── admin.js              # Logic phía Quản trị: Sơ đồ phòng, lịch trình đầy đủ UUID
        └── charts.js             # Cấu hình biểu đồ Chart.js (Cột, Vùng, Donut)
```

---

## 6. Danh mục RESTful API Endpoints

| Phương thức | Endpoint URL | Mục đích nghiệp vụ | Bảng Cassandra liên quan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hotels` | Lấy danh sách khách sạn (có hỗ trợ `?poi=...`) | `hotels`, `hotels_by_poi` |
| `GET` | `/api/hotels/pois` | Lấy danh mục điểm tham quan | `hotels_by_poi` |
| `GET` | `/api/hotels/:hotelId` | Xem thông tin chi tiết một khách sạn | `hotels`, `pois_by_hotel` |
| `GET` | `/api/hotels/:hotelId/rooms` | Lấy danh sách phòng theo khách sạn | `rooms_by_hotel` |
| `PATCH` | `/api/hotels/:hotelId/rooms/:num/status` | Cập nhật trạng thái phòng (Trống/Có khách/Bảo trì) | `rooms_by_hotel` |
| `POST` | `/api/bookings` | **Tạo đơn đặt phòng mới (Cassandra LOGGED BATCH)** | `bookings_by_guest`, `bookings_by_hotel_date`, `invoices_by_booking`, `rooms_by_hotel` |
| `GET` | `/api/bookings/recent` | Lấy danh sách đơn đặt gần nhất cho khách chọn | `bookings_by_hotel_date` |
| `GET` | `/api/bookings/detail/:bookingId` | Tra cứu chi tiết đơn đặt phòng theo UUID | `invoices_by_booking`, `bookings_by_guest` |
| `DELETE` | `/api/bookings/:bookingId` | **Huỷ đơn đặt phòng (Cassandra BATCH)** | `bookings_by_guest`, `bookings_by_hotel_date`, `rooms_by_hotel` |
| `GET` | `/api/bookings/guest/:guestId` | Xem lịch sử đặt phòng của một khách hàng (Q3) | `bookings_by_guest` |
| `GET` | `/api/bookings/hotel/:hotelId` | Xem lịch trình khách đến theo khách sạn và ngày (Q4) | `bookings_by_hotel_date` |
| `GET` | `/api/invoices/:bookingId` | Tra cứu hoá đơn theo mã đơn đặt (Q5) | `invoices_by_booking` |
| `GET` | `/api/analytics/dashboard` | Lấy chỉ số KPI, biểu đồ doanh thu và khách quen | `invoices_by_booking`, `bookings_by_guest`, `rooms_by_hotel` |
| `GET` | `/api/analytics/cql-history` | Lấy lịch sử các câu lệnh CQL chạy ngầm | Bộ đệm giám sát truy vấn |
| `GET` | `/api/analytics/system-status` | Kiểm tra trạng thái kết nối Database | Cấu hình Driver |

---

## 7. Bảng Đối sánh Chuyên sâu: Apache Cassandra vs. RDBMS (SQL)

Bảng này cung cấp cơ sở lý luận vững chắc phục vụ buổi thuyết trình bảo vệ đồ án trước hội đồng:

| Tiêu chí so sánh | Cơ sở dữ liệu Quan hệ (RDBMS - MySQL, SQL Server) | Cơ sở dữ liệu NoSQL (Apache Cassandra / Astra DB) |
| :--- | :--- | :--- |
| **Triết lý thiết kế** | **Data-First**: Chuẩn hoá cấu trúc thực thể (3NF) để tránh dư thừa, truy vấn viết linh hoạt sau. | **Query-First**: Xác định trước các câu hỏi nghiệp vụ, thiết kế mỗi bảng tối ưu riêng cho 1 câu hỏi. |
| **Xử lý liên kết dữ liệu** | Sử dụng câu lệnh `JOIN` tại thời điểm chạy (Run-time). Chi phí CPU/RAM tăng theo cấp số nhân khi dữ liệu lớn. | **Không hỗ trợ JOIN**: Chấp nhận nhân bản dữ liệu (Denormalization) để đổi lấy tốc độ đọc ghi cực cao $O(1)$. |
| **Đảm bảo toàn vẹn** | Khóa ngoại (Foreign Keys) và giao dịch ACID chặt chẽ. | Sử dụng **`BatchStatement (LOGGED)`** để đồng bộ giữa các bảng nhân bản; tuân theo mô hình Tunable Consistency (BASE). |
| **Khả năng mở rộng** | Mở rộng theo chiều dọc (Vertical Scaling - nâng cấp phần cứng máy chủ trung tâm). Chi phí đắt đỏ, có giới hạn vật lý. | Mở rộng theo chiều ngang (Horizontal Scaling - bổ sung thêm nhiều máy chủ giá rẻ vào cụm phân tán không có node Master). |
| **Khóa chính (Primary Key)** | Dùng để định danh duy nhất bản ghi và tạo chỉ mục (B-Tree). | Gồm 2 phần: **Partition Key** (quyết định vị trí lưu trữ trên node) và **Clustering Column** (sắp xếp vật lý trên đĩa). |
| **Mô hình kiến trúc** | Thường là Master-Slave (Node chính ghi, node phụ đọc) $\rightarrow$ Có điểm nghẽn Single Point of Failure. | Kiến trúc mạng ngang hàng (Peer-to-Peer) $\rightarrow$ Mọi node bình đẳng, không có điểm lỗi đơn lẻ. |

---

## 8. Hướng dẫn Khởi chạy & Vận hành cho Thành viên Nhóm

### Cách 1: Chạy ngay lập tức (Chế độ Demo Smart Mock - Khuyên dùng khi xem code hoặc demo nhanh)
Ứng dụng được trang bị bộ giả lập In-Memory thông minh với dữ liệu đầy đủ từ `Hotel.cql`:
```bash
# 1. Cài đặt các thư viện cần thiết
npm install

# 2. Khởi động server
npm start
```
Mở trình duyệt:
- **Trang Khách hàng**: 👉 `http://localhost:3000`
- **Trang Quản trị & Lễ tân**: 👉 `http://localhost:3000/admin`

---

### Cách 2: Kết nối trực tiếp Cụm Cloud thật DataStax Astra DB
Dành cho việc chấm điểm kết nối Cloud thực tế:
1. Đăng nhập [astra.datastax.com](https://astra.datastax.com), tạo Database miễn phí (tên `hotel_management_demo`, keyspace `hotel_reservations_vn`).
2. Tải file **Secure Connect Bundle** (`secure-connect-xxx.zip`) về thư mục dự án.
3. Tạo **Application Token** (Role: Database Administrator).
4. Tạo tệp `.env` trong thư mục dự án:
   ```env
   PORT=3000
   ASTRA_DB_APPLICATION_TOKEN=AstraCS:chuỗi-token-của-bạn
   ASTRA_DB_SECURE_BUNDLE_PATH=./secure-connect-hotel_management_demo.zip
   ASTRA_DB_KEYSPACE=hotel_reservations_vn
   ```
5. Chạy 2 lệnh khởi tạo và nạp dữ liệu lên Cloud:
   ```bash
   npm run init-db
   npm run seed
   ```
6. Khởi động ứng dụng:
   ```bash
   npm start
   ```
   Huy hiệu trạng thái trên thanh Header sẽ hiển thị: **`DataStax Astra DB (Cloud)`**.

---

## 9. Xử lý Các Tình huống Lỗi Thường gặp (Troubleshooting)

| Hiện tượng lỗi | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **NoHostAvailable / Kết nối thất bại** | Sai đường dẫn file `.zip`, token hết hạn, hoặc cổng kết nối bị tường lửa chặn. | Kiểm tra lại đường dẫn trong `.env`, tạo token mới trên Astra Portal, kiểm tra kết nối mạng. |
| **Database ở trạng thái Hibernated ("ngủ")** | Gói Free Tier tự động tạm ngưng cụm sau một thời gian không hoạt động để tiết kiệm tài nguyên. | Vào Astra Portal, nhấn nút **Resume/Wake up** và chờ 1-2 phút trước khi chạy lại ứng dụng. |
| **Dữ liệu 2 bảng bị lệch nhau** | Chỉ sửa 1 bảng mà quên cập nhật bảng còn lại. | Luôn sử dụng hàm `executeBatch` của `cassandraService.js` để gửi `LOGGED BATCH` đồng thời. |
| **InvalidRequest: Cannot execute this query...** | Cố gắng viết điều kiện `WHERE` trên cột không phải Partition Key hoặc Clustering Column. | Thiết kế lại bảng mới khớp đúng truy vấn thay vì lạm dụng `ALLOW FILTERING`. |

---
*Tài liệu kỹ thuật lưu hành nội bộ nhóm dự án AstraStay - Năm 2026*
