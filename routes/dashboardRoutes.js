const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware'); // For role checks
const User = require('../models/User'); // Fix: Import User Model
const Resource = require('../models/Resource');
const ActivityLog = require('../models/ActivityLog');
// User Dashboard API
router.get('/user', authMiddleware, async (req, res) => {
    try {
        // Total resources uploaded by the user
        const totalResources = await Resource.countDocuments({ createdBy: req.user.id });

        // Total downloads for the user's resources
        const userResources = await Resource.find({ createdBy: req.user.id });
        const totalDownloads = userResources.reduce((sum, resource) => sum + (resource.downloads || 0), 0);

        // Recent activity logs
        const recentLogs = await ActivityLog.find({ user: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('resource', 'title');

        // Send dashboard data
        res.json({
            totalResources,
            totalDownloads,
            recentLogs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Admin Dashboard API
router.get('/admin', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // Ensure only admins can access
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Total users
        const totalUsers = await User.countDocuments();

        // Total resources
        const totalResources = await Resource.countDocuments();

        // Total downloads
        const totalDownloads = await Resource.aggregate([
            { $group: { _id: null, total: { $sum: "$downloads" } } }
        ]);
        const downloadsCount = totalDownloads[0]?.total || 0;

        // Most downloaded resources
        const topResources = await Resource.find()
            .sort({ downloads: -1 })
            .limit(5)
            .select('title downloads');

        // Recent activity logs
        const recentLogs = await ActivityLog.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('user', 'name email')
            .populate('resource', 'title');

        // Send dashboard data
        res.json({
            totalUsers,
            totalResources,
            downloadsCount,
            topResources,
            recentLogs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
