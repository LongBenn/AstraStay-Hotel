# AstraStay — Hệ Thống Quản Lý & Đặt Phòng Khách Sạn Chuẩn 
> **Ứng dụng Web Full-Stack Node.js khai thác Cơ sở dữ liệu phân tán NoSQL Apache Cassandra / DataStax Astra DB Cloud**  
> *Đồ án môn học Cơ sở dữ liệu NoSQL / Apache Cassandra 
---
Hướng dẫn Cài đặt & Khởi chạy (Dành cho Thành viên nhóm)

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

#### CHẾ ĐỘ 1: Chạy Ngay Lập Tức với Mock Engine (Khuyên dùng khi xem code hoặc demo nhanh)
Không cần tài khoản DataStax Astra DB, không cần tải file bundle, không cần cấu hình `.env`!
```bash
npm start
```
Ứng dụng sẽ tự động kích hoạt **Smart Mock Engine** trong RAM với đầy đủ dữ liệu mẫu từ `Hotel.cql` (10 khách sạn, 12 điểm du lịch, 48 phòng nghỉ, 12 khách hàng, 15 đơn đặt phòng và 15 hoá đơn với tổng doanh thu hơn 176 triệu VNĐ). Mọi tính năng từ đặt phòng Logged Batch đến sơ đồ phòng và biểu đồ Chart.js đều chạy 100% bình thường.

#### CHẾ ĐỘ 2: Kết nối trực tiếp DataStax Astra DB Cloud Thật (Chấm điểm thực tế)
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

### Kiến trúc Tổng thể & Chi tiết Từng Thành phần

### Sơ đồ Kiến trúc Hệ thống

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

### Bản đồ Thư mục & Trách nhiệm Từng Tệp Tin

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

## Thiết kế Dữ liệu NoSQL theo Tư duy Query-First

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

---

## Tính Nhất quán Dữ liệu với Cassandra Logged Batch

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

## Danh mục RESTful API Endpoints

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

## Bảng So sánh Chuyên sâu: Cassandra vs. SQL Truyền thống

| Tiêu chí so sánh | Cơ sở dữ liệu Quan hệ RDBMS (MySQL, PostgreSQL) | Cơ sở dữ liệu NoSQL (Apache Cassandra / Astra DB) |
| :--- | :--- | :--- |
| **Triết lý thiết kế** | **Data-First**: Chuẩn hoá cấu trúc thực thể (3NF) để tránh dư thừa; câu truy vấn viết sau tuỳ ý. | **Query-First**: Phải xác định trước câu hỏi nghiệp vụ cần truy vấn, thiết kế mỗi bảng tối ưu riêng cho 1 câu hỏi. |
| **Xử lý mối quan hệ** | Sử dụng câu lệnh `JOIN` tại thời điểm chạy. Khi dữ liệu lớn, chi phí CPU/RAM tăng theo hàm mũ. | **Không hỗ trợ JOIN**: Chấp nhận nhân bản dữ liệu (Denormalization) vào nhiều bảng để lấy dữ liệu với độ phức tạp $O(1)$. |
| **Khóa chính (Primary Key)** | Định danh bản ghi duy nhất, tạo chỉ mục tìm kiếm (B-Tree). | Gồm 2 phần: **Partition Key** (quyết định vị trí node lưu trữ) và **Clustering Column** (quyết định thứ tự sắp xếp trên đĩa). |
| **Tính toàn vẹn** | Ràng buộc khoá ngoại (Foreign Key) và giao dịch ACID chặt chẽ. | Áp dụng **`BatchStatement (LOGGED)`** để đồng bộ giữa các bảng nhân bản; theo mô hình Tunable Consistency (BASE). |
| **Khả năng mở rộng** | Mở rộng theo chiều dọc (Vertical Scaling): nâng cấp phần cứng máy chủ trung tâm (đắt đỏ, có giới hạn). | Mở rộng theo chiều ngang (Horizontal Scaling): thêm bao nhiêu node mạng tuỳ ý mà không cần dừng hệ thống. |
| **Mô hình kiến trúc** | Master-Slave: Node Master nhận ghi, các node Slave nhận đọc $\rightarrow$ Có điểm nghẽn Single Point of Failure. | Mạng ngang hàng Peer-to-Peer (Ring Topology): Mọi node đều bình đẳng, không có điểm nghẽn đơn lẻ. |

---

## Xử lý Lỗi Thường Gặp (Troubleshooting)

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
