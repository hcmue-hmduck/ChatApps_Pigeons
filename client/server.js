const express = require('express');
const path = require('path');
const app = express();

/**
 * PIGEONS - Client Production Server
 * Serves the Angular static files from dist/client/browser
 */

const PORT = process.env.PORT || 5200;

// Path to the built Angular files
const DIST_PATH = path.join(__dirname, 'dist/client/browser');

// Serve static assets (js, css, images, etc.)
app.use(express.static(DIST_PATH));

// Always return index.html for any other request (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Pigeons Client is running on port ${PORT}`);
    console.log(`Serving from: ${DIST_PATH}`);
});
