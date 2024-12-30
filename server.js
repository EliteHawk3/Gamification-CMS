require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

// Import Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Healthy', message: 'Server is running smoothly.' });
});
const resourceRoutes = require('./routes/resourceRoutes');
app.use('/api/resources', resourceRoutes);
// Serve Static Files
app.use('/uploads', express.static('uploads'));
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import Dashboard Routes
app.use('/api/dashboard', dashboardRoutes); // Use Dashboard Routes

// Server Listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
