const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const routes = require('./routes/index');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));