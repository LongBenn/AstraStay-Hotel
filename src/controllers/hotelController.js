const cassandraService = require('../services/cassandraService');

exports.getAllHotels = async (req, res) => {
  try {
    const { poi, checkin, checkout } = req.query;

    if (checkin || checkout) {
      if (!checkin || !checkout) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn đầy đủ ngày nhận và ngày trả phòng.'
        });
      }

      const checkInDate = new Date(`${checkin}T00:00:00`);
      const checkOutDate = new Date(`${checkout}T00:00:00`);

      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate.getTime() <= checkInDate.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Ngày trả phòng phải lớn hơn ngày nhận phòng.'
        });
      }
    }

    if (poi) {
      const hotelsInPoi = await cassandraService.getHotelsByPoi(poi);
      return res.json({ success: true, data: hotelsInPoi, poi });
    }
    const hotels = await cassandraService.getAllHotels();
    return res.json({ success: true, data: hotels });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHotelById = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const hotel = await cassandraService.getHotelById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn' });
    }
    const pois = await cassandraService.getPoisByHotel(hotelId);
    return res.json({ success: true, data: { ...hotel, nearby_pois: pois } });
  } catch (error) {
    console.error('Error fetching hotel detail:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllPois = async (req, res) => {
  try {
    const pois = await cassandraService.getAllPois();
    return res.json({ success: true, data: pois });
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
