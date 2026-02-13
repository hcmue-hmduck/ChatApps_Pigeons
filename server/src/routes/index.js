const adminRouter = require('./adminRouter');
const homeRouter = require('./homeRouter');
const livekitRouter = require('./livekitRouter.js')

function route(app) {
    app.use('/admin', adminRouter);
    app.use('/home', homeRouter);
    app.use('/livekit', livekitRouter)
}

module.exports = route;