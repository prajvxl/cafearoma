require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static('public')); // serves the ordering-portal frontend

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cafe', require('./routes/cafeRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

