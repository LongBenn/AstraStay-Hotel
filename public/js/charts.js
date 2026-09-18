// Khởi tạo và cập nhật các biểu đồ Chart.js cho Dashboard Thống kê (Đề tài 2 & 4)
let hotelRevenueChartInstance = null;
let monthlyRevenueChartInstance = null;
let roomOccupancyChartInstance = null;

function renderDashboardCharts(stats) {
  if (!stats) return;

  // 1. Biểu đồ Doanh thu theo từng khách sạn (Bar Chart)
  const hotelNames = Object.keys(stats.revenueByHotel || {});
  const hotelRevenues = Object.values(stats.revenueByHotel || {}).map(v => v / 1000000); // Đổi sang Triệu VNĐ

  const ctxHotel = document.getElementById('chartHotelRevenue');
  if (ctxHotel) {
    if (hotelRevenueChartInstance) {
      hotelRevenueChartInstance.destroy();
    }
    hotelRevenueChartInstance = new Chart(ctxHotel, {
      type: 'bar',
      data: {
        labels: hotelNames,
        datasets: [{
          label: 'Doanh thu (Triệu VNĐ)',
          data: hotelRevenues,
          backgroundColor: [
            'rgba(63, 120, 173, 0.85)',
            'rgba(83, 139, 169, 0.85)',
            'rgba(112, 151, 180, 0.85)',
            'rgba(92, 119, 148, 0.85)',
            'rgba(126, 158, 183, 0.85)'
          ],
          borderColor: [
            '#3f78ad',
            '#538ba9',
            '#7097b4',
            '#5c7794',
            '#7e9eb7'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.y.toLocaleString('vi-VN')} Triệu VNĐ`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value + ' Tr'
            }
          }
        }
      }
    });
  }

  // 2. Biểu đồ Xu hướng Doanh thu theo tháng (Line/Area Chart - Đề tài 2)
  const months = Object.keys(stats.monthlyRevenue || {});
  const monthRevenues = Object.values(stats.monthlyRevenue || {}).map(v => v / 1000000);

  const ctxMonthly = document.getElementById('chartMonthlyRevenue');
  if (ctxMonthly) {
    if (monthlyRevenueChartInstance) {
      monthlyRevenueChartInstance.destroy();
    }
    monthlyRevenueChartInstance = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Doanh thu tháng (Triệu VNĐ)',
          data: monthRevenues,
          borderColor: '#3f78ad',
          backgroundColor: 'rgba(63, 120, 173, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#3f78ad',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.y.toLocaleString('vi-VN')} Triệu VNĐ`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value + ' Tr'
            }
          }
        }
      }
    });
  }

  // 3. Biểu đồ Tỷ lệ Lấp đầy Phòng (Donut Chart)
  const ctxOccupancy = document.getElementById('chartRoomOccupancy');
  if (ctxOccupancy && stats.kpi) {
    if (roomOccupancyChartInstance) {
      roomOccupancyChartInstance.destroy();
    }
    const { occupiedRooms, availableRooms, maintenanceRooms } = stats.kpi;
    roomOccupancyChartInstance = new Chart(ctxOccupancy, {
      type: 'doughnut',
      data: {
        labels: ['Đang có khách', 'Còn trống', 'Bảo trì'],
        datasets: [{
          data: [occupiedRooms, availableRooms, maintenanceRooms],
          backgroundColor: [
            '#ef4444',
            '#10b981',
            '#f59e0b'
          ],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        cutout: '70%'
      }
    });
  }
}
