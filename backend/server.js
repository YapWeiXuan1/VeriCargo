const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const routes = require('./routes/index');

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '12mb' }));
app.use('/api', routes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
