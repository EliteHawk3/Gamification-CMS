const roleMiddleware = (roles) => {
    return (req, res, next) => {
        console.log('User Role:', req.user.role); // Log user role
        console.log('Allowed Roles:', roles);    // Log allowed roles

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied: Insufficient permissions' });
        }
        next();
    };
};

module.exports = roleMiddleware;
