const adminRouter = require('./adminRouter');
const homeRouter = require('./homeRouter');
const livekitRouter = require('./livekitRouter.js')
const uploadRouter = require('./uploadRouter');

function route(app) {
    app.use('/admin', adminRouter);
    app.use('/home', homeRouter);
    app.use('/livekit', livekitRouter)
    app.use('/upload', uploadRouter);
}

module.exports = route;