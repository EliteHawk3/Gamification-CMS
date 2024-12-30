const multer = require('multer');
const path = require('path');

// Set Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique file names
    }
});

// File Type Validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = /\.(jpeg|jpg|png|gif|pdf|mp4|avi)$/i; // Check file extension
    const allowedMIMETypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'video/mp4',
        'video/x-msvideo'
    ]; // Check MIME types

    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMIMETypes.includes(file.mimetype); // Updated MIME check

    console.log('File Name:', file.originalname);
    console.log('File MIME Type:', file.mimetype);
    console.log('File Extension:', path.extname(file.originalname).toLowerCase());
    console.log('Extname Valid:', extname);
    console.log('MIME Type Valid:', mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only images, PDFs, and videos are allowed.'));
    }
};


// Multer Configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

module.exports = upload;
