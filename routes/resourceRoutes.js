const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityLog = require('../models/ActivityLog'); // Import ActivityLog model

const upload = require('../middleware/uploadMiddleware'); // Import upload middleware
const roleMiddleware = require('../middleware/roleMiddleware');
const path = require('path'); // For file paths
const fs = require('fs'); // For file handling
// Admin-Only Route
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        await resource.deleteOne();
        res.json({ message: 'Resource deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// Download Resource by ID and Track Analytics
router.get('/download/:id', authMiddleware, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check permissions
        if (resource.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // File path
        const filePath = path.join(__dirname, '..', 'uploads', path.basename(resource.fileUrl));
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Update download count
        resource.downloads += 1;

        // Log download activity
        resource.logs.push(`Downloaded by ${req.user.email} at ${new Date().toISOString()}`);
        await resource.save();

        // Send the file
        res.download(filePath, resource.title || 'download', (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Error downloading file' });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload Resource with File and Metadata
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    const { title, description, tags, link } = req.body;

    try {
        // Validate inputs
        if (!title || (!req.file && !link)) {
            return res.status(400).json({ message: 'Title and either a file or a link are required.' });
        }

        // Process tags
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

        // Handle file upload or link
        const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const resource = new Resource({
            title,
            description,
            tags: tagsArray,
            fileUrl,
            link, // Store external links
            createdBy: req.user.id
        });

        await resource.save();

        // Log the upload
        await ActivityLog.create({
            user: req.user.id,
            action: 'upload',
            resource: resource._id
        });

        res.status(201).json(resource);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// Create Resource
router.post('/', authMiddleware, async (req, res) => {
    const { title, description, tags, fileUrl } = req.body;
    try {
        const resource = new Resource({
            title,
            description,
            tags,
            fileUrl,
            createdBy: req.user.id // Associate resource with logged-in user
        });
        await resource.save();
        res.status(201).json(resource);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get All Resources
// router.get('/', authMiddleware, async (req, res) => {
//     try {
//         const resources = await Resource.find().populate('createdBy', 'name email'); // Show creator details
//         res.json(resources);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });
// Delete Resource by ID
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        if (resource.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await resource.deleteOne();

        // Log the activity
        await ActivityLog.create({
            user: req.user.id,
            action: 'delete',
            resource: req.params.id
        });

        res.json({ message: 'Resource deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Get User Activity Logs
router.get('/activity-logs', authMiddleware, async (req, res) => {
    try {
        // Admins see all logs, users see only their logs
        const query = req.user.role === 'admin' ? {} : { user: req.user.id };

        const logs = await ActivityLog.find(query)
            .populate('user', 'name email')
            .populate('resource', 'title')
            .sort({ timestamp: -1 });

        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get Single Resource
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id).populate('createdBy', 'name email');
        if (!resource) return res.status(404).json({ message: 'Resource not found' });
        res.json(resource);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Edit Resource with Tracking
router.put('/:id', authMiddleware, async (req, res) => {
    const { title, description, tags } = req.body;

    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Allow update for owner or admin
        if (resource.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Log updates
        const updates = [];
        if (title && title !== resource.title) {
            updates.push(`Title changed to '${title}'`);
            resource.title = title;
        }
        if (description && description !== resource.description) {
            updates.push(`Description updated`);
            resource.description = description;
        }
        if (tags) {
            const newTags = tags.split(',').map(tag => tag.trim());
            if (JSON.stringify(newTags) !== JSON.stringify(resource.tags)) {
                updates.push(`Tags updated`);
                resource.tags = newTags;
            }
        }

        // Add update logs
        if (updates.length > 0) {
            resource.logs.push(
                `Updated by ${req.user.email} at ${new Date().toISOString()} - Changes: ${updates.join(', ')}`
            );
        }

        // Save the updated resource
        await resource.save();
        res.json(resource);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// // Edit Resource by ID
// router.put('/:id', authMiddleware, async (req, res) => {
//     const { title, description, tags } = req.body;

//     try {
//         // Find the resource
//         const resource = await Resource.findById(req.params.id);
//         if (!resource) {
//             return res.status(404).json({ message: 'Resource not found' });
//         }

//         // Check ownership or admin permissions
//         if (resource.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
//             return res.status(403).json({ message: 'Unauthorized' });
//         }

//         // Update fields if provided
//         if (title) resource.title = title;
//         if (description) resource.description = description;
//         if (tags) resource.tags = tags.split(',').map(tag => tag.trim());

//         // Save updated resource
//         await resource.save();

//         res.json(resource);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // Delete Resource
// router.delete('/:id', authMiddleware, async (req, res) => {
//     try {
//         const resource = await Resource.findById(req.params.id);
//         if (!resource) return res.status(404).json({ message: 'Resource not found' });

//         // Check ownership
//         if (resource.createdBy.toString() !== req.user.id) {
//             return res.status(403).json({ message: 'Unauthorized' });
//         }

//         await resource.deleteOne();
//         res.json({ message: 'Resource deleted' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// Search and Pagination with Sorting
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, tags, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

        // Build query object
        let query = {};

        // Search filter (title, description, or link)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { link: { $regex: search, $options: 'i' } } // Search links
            ];
        }

        // Tags filter
        if (tags) {
            const tagsArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $all: tagsArray };
        }

        // Pagination and sorting
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortBy = { [sort]: sortOrder };

        // Fetch filtered resources
        const total = await Resource.countDocuments(query);
        const resources = await Resource.find(query)
            .skip(skip)
            .limit(pageSize)
            .sort(sortBy)
            .populate('createdBy', 'name email');

        res.json({
            resources,
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});





module.exports = router;
