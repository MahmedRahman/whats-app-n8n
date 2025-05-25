const mainRoutes = require('./main');
const settingsRoutes = require('./settings');
const sessionRoutes = require('./session');
const webhookRoutes = require('./webhook');

/**
 * Initialize all routes with their required dependencies
 * @param {Object} app - Express application instance
 * @param {Object} dependencies - Dependencies required by the routes
 */
function initRoutes(app, dependencies) {
    // Initialize routes that need dependencies
    const sessionRouter = sessionRoutes.init(dependencies);
    const webhookRouter = webhookRoutes.init(dependencies);

    // Register all routes
    app.use(mainRoutes);
    app.use(settingsRoutes);
    app.use(sessionRouter);
    app.use(webhookRouter);

    console.log('All routes have been initialized');
}

module.exports = { initRoutes };
