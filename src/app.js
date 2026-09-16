const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { initCassandraClient, getConnectionStatus } = require('./config/cassandra');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Route riêng cho trang Quản trị & Lễ tân
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Fallback route cho Single Page App (Khách hàng)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi hệ thống máy chủ'
  });
});

// Start Server
async function startServer() {
  console.log('------------------------------------------------------------');
  console.log(' KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ KHÁCH SẠN CASSANDRA / ASTRA DB');
  console.log('------------------------------------------------------------');

  // Khởi tạo kết nối Cassandra / Astra DB
  await initCassandraClient();
  const status = getConnectionStatus();

  console.log(`[Status] Chế độ kết nối: ${status.connectionMode}`);
  console.log(`[Status] Keyspace: ${status.keyspace}`);

  app.listen(PORT, () => {
    console.log(`\n Máy chủ đang chạy tại: http://localhost:${PORT}`);
    console.log(` Giao diện Đặt phòng: http://localhost:${PORT}`);
    console.log(` API Endpoint:        http://localhost:${PORT}/api/hotels`);
    console.log('------------------------------------------------------------\n');
  });
}

startServer();

module.exports = app;
