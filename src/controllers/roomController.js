const cassandraService = require('../services/cassandraService');

exports.getRoomsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status } = req.query;
    let rooms = await cassandraService.getRoomsByHotel(hotelId);
    if (status) {
      rooms = rooms.filter(r => r.status.toUpperCase() === status.toUpperCase());
    }
    return res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoomStatus = async (req, res) => {
  try {
    const { hotelId, roomNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Phải là AVAILABLE, OCCUPIED, hoặc MAINTENANCE.'
      });
    }

    const updatedRoom = await cassandraService.updateRoomStatus(hotelId, roomNumber, status.toUpperCase());
    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái phòng ${roomNumber} thành ${status.toUpperCase()}`,
      data: updatedRoom
    });
  } catch (error) {
    console.error('Error updating room status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAmenitiesByRoom = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const amenities = await cassandraService.getAmenitiesByRoom(hotelId, roomId);
    return res.json({ success: true, data: amenities });
  } catch (error) {
    console.error('Error fetching room amenities:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
