const winston = require('src/config/winston.config');

class Logger {

    constructor() {
    }

    info(data){
        winston.winstonLogger.info(data);
    }

    error(data){
        winston.winstonLogger.error(data);
    }

    infoFile(data) {
        winston.winstonFileLogger.info(data);
    }

    errorFile(data) {
        winston.winstonFileLogger.error(data);
    }

}

// singleton logger
module.exports = new Logger();