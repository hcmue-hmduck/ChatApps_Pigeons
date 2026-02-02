const adminRouter = require('./adminRouter');
const homeRouter = require('./homeRouter');

function route(app) {
    app.use('/admin', adminRouter);
    app.use('/home', homeRouter);
}

module.exports = route;