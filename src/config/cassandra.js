const cassandra = require('cassandra-driver');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let client = null;
let isConnected = false;
let connectionMode = 'MOCK'; // 'ASTRA', 'LOCAL', or 'MOCK'
let connectionError = null;

// Lưu trữ lịch sử câu lệnh CQL vừa thực thi để phục vụ demo trực tiếp trên Web UI
const cqlHistory = [];

function recordCqlExecution(query, params, executionTimeMs, success = true, errorMsg = null) {
  const item = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    query: query.trim(),
    params: params || [],
    executionTimeMs: executionTimeMs || 1,
    success,
    error: errorMsg,
    mode: connectionMode
  };
  cqlHistory.unshift(item);
  if (cqlHistory.length > 50) {
    cqlHistory.pop();
  }
  return item;
}

function getCqlHistory() {
  return cqlHistory;
}

async function initCassandraClient() {
  const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
  const bundlePath = process.env.ASTRA_DB_SECURE_BUNDLE_PATH;
  const localContactPoints = process.env.CASSANDRA_CONTACT_POINTS;
  const keyspace = process.env.ASTRA_DB_KEYSPACE || process.env.CASSANDRA_KEYSPACE || 'hotel_reservations_vn';

  // 1. Kiểm tra cấu hình Astra DB Cloud
  if (token && bundlePath && !token.includes('your-token-here')) {
    const resolvedBundlePath = path.isAbsolute(bundlePath) ? bundlePath : path.join(process.cwd(), bundlePath);
    if (fs.existsSync(resolvedBundlePath)) {
      try {
        console.log(`[Cassandra] Đang kết nối tới Astra DB Cloud qua Secure Bundle: ${resolvedBundlePath}...`);
        const authProvider = new cassandra.auth.PlainTextAuthProvider('token', token);
        client = new cassandra.Client({
          cloud: { secureConnectBundle: resolvedBundlePath },
          authProvider: authProvider,
          keyspace: keyspace
        });
        await client.connect();
        isConnected = true;
        connectionMode = 'ASTRA';
        console.log(`[Cassandra] Kết nối thành công tới Astra DB Cloud! Keyspace: ${keyspace}`);
        return { client, isConnected, connectionMode };
      } catch (err) {
        console.warn(`[Cassandra] Không thể kết nối Astra DB: ${err.message}. Chuyển sang chế độ Fallback Mock Store.`);
        connectionError = err.message;
      }
    } else {
      console.warn(`[Cassandra] File Secure Bundle không tồn tại tại: ${resolvedBundlePath}.`);
    }
  }

  // 2. Kiểm tra cấu hình Cassandra Local
  if (localContactPoints) {
    try {
      console.log(`[Cassandra] Đang kết nối tới Cassandra Local tại ${localContactPoints}...`);
      const contactPoints = localContactPoints.split(',').map(s => s.trim());
      const localDataCenter = process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1';
      client = new cassandra.Client({
        contactPoints: contactPoints,
        localDataCenter: localDataCenter,
        keyspace: keyspace
      });
      await client.connect();
      isConnected = true;
      connectionMode = 'LOCAL';
      console.log(`[Cassandra] Kết nối thành công tới Cassandra Local!`);
      return { client, isConnected, connectionMode };
    } catch (err) {
      console.warn(`[Cassandra] Không thể kết nối Cassandra Local: ${err.message}.`);
      connectionError = err.message;
    }
  }

  // 3. Fallback sang Smart In-Memory Store mô phỏng CQL
  connectionMode = 'MOCK';
  isConnected = true;
  console.log(`[Cassandra] Chạy ở chế độ "Demo/Smart Mock Engine" (Mô phỏng dữ liệu CQL đầy đủ từ Hotel.cql).`);
  return { client: null, isConnected: true, connectionMode: 'MOCK' };
}

function getClient() {
  return client;
}

function getConnectionStatus() {
  return {
    isConnected,
    connectionMode,
    connectionError,
    keyspace: process.env.ASTRA_DB_KEYSPACE || process.env.CASSANDRA_KEYSPACE || 'hotel_reservations_vn'
  };
}

module.exports = {
  initCassandraClient,
  getClient,
  getConnectionStatus,
  recordCqlExecution,
  getCqlHistory
};
