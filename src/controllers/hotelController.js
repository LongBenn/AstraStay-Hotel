const cassandraService = require('../services/cassandraService');

exports.getAllHotels = async (req, res) => {
  try {
    const { poi } = req.query;
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
