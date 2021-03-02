
const ConfigProperties = require('src/config/config-properties');

class Logger {
    constructor() {
    }

    init() {
        this.winston = require('src/config/winston.config');
    }

    info(data) {
        ConfigProperties.isLogEnabled()
            ? this.winston.winstonLogger.info(data)
            : this.winston.winstonConsoleLogger.info(data);
    }

    error(data) {
        ConfigProperties.isLogEnabled()
            ? this.winston.winstonLogger.error(data)
            : this.winston.winstonConsoleLogger.error(data);
    }

    infoFileOnly(data) {
        ConfigProperties.isLogEnabled()
            ? this.winston.winstonFileLogger.info(data)
            : void 0;
    }

    errorFile(data) {
        ConfigProperties.isLogEnabled()
            ? this.winston.winstonFileLogger.error(data)
            : void 0;
    }
}

// singleton logger
module.exports = new Logger();
