const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message,
            stack: error.stack
        }
    });
}

module.exports = {notFound, errorHandler}