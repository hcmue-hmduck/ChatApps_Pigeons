const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files
const distPath = path.join(__dirname, 'dist/client/browser');
app.use(express.static(distPath));

// Redirect tất cả routes về index.html cho Angular routing
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
