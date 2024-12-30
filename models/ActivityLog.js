const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g., 'upload', 'edit', 'delete', 'download'
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    timestamp: { type: Date, default: Date.now }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
