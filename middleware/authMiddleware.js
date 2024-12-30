const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Extract token
    console.log('Token Received:', token); // Log token received

    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded Token:', verified); // Log verified token
        req.user = verified; // Attach user data
        next();
    } catch (err) {
        console.error('Token Error:', err.message); // Log error details
        res.status(400).json({ message: 'Invalid Token' });
    }
};

module.exports = authMiddleware;
