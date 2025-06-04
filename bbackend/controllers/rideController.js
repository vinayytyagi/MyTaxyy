const getCaptainRideHistory = async (req, res) => {
  try {
    const captainId = req.captain._id;

    // Find all rides for this captain, sorted by createdAt in descending order
    const rides = await Ride.find({ captain: captainId })
      .sort({ createdAt: -1 })
      .populate('user', 'fullname phone email')
      .lean();

    res.json({
      success: true,
      rides: rides
    });
  } catch (error) {
    console.error('Error fetching captain ride history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ride history'
    });
  }
}; 