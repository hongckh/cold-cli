const winston = require('winston');
require('winston-daily-rotate-file');

const ConfigProperties = require('src/config/config-properties');

const timeFormatFull = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: 'numeric',
  hour12: false,
};

const timeFormatShort = {
  hour: '2-digit',
  minute: '2-digit',
  second: 'numeric',
  hour12: false,
};

const LAST_UPDATED_BY_FILE = 'LAST_UPDATED_BY_FILE';
const LAST_UPDATED_BY_CONSOLE = 'LAST_UPDATED_BY_CONSOLE';

const timeSync = {
  time: new Date(),
  timeStr: null,
  lastUpdatedBy: undefined,
};

/**
 * Synchronize the timestamp of all transport logs
 * @param {*} lastUpdatedBy : last updating winston transport (e.g. FILE/CONSOLE)
 */
const syncTime = (lastUpdatedBy) => {
  if (
    timeSync.lastUpdatedBy === lastUpdatedBy ||
    timeSync.lastUpdatedBy === undefined
  ) {
    timeSync.time = new Date();
    timeSync.timeStr = `${timeSync.time.toLocaleTimeString([],timeFormatFull)}:${String(timeSync.time.getMilliseconds()).padStart(3,0)}`;
    timeSync.lastUpdatedBy = lastUpdatedBy;
  }
};

// Get the synchronized timestamp for logging
const getSyncTime = (lastUpdatedBy) => {
  syncTime(lastUpdatedBy);
  return timeSync.timeStr;
};

const logFormatFile = winston.format.printf(function (info) {
  const now = getSyncTime(LAST_UPDATED_BY_FILE);
  return `${now} [${info.level.toUpperCase()}]: ${info.message ? JSON.stringify(info.message, null, 4).slice(1, -1) : ''}`;
});

const logFormatConsole = winston.format.printf(function (info) {
  getSyncTime(LAST_UPDATED_BY_CONSOLE);
  const timeOnly = `${timeSync.time.toLocaleTimeString([],timeFormatShort)}:${String(timeSync.time.getMilliseconds()).padStart(3,0)}`;
  return `${timeOnly} [${info.level}]: ${info.message ? JSON.stringify(info.message, null, 4).slice(1, -1) : ''}`;
});

const options = {
  file: {
    level: 'info',
    filename: `${ConfigProperties.LOG_DIR}/app-%DATE%.log`,
    handleExceptions: true,
    json: true,
    maxSize: '100m',
    maxFiles: '30d',
    colorize: true,
    zippedArchive: true,
    format: winston.format.combine(logFormatFile),
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    format: winston.format.combine(winston.format.colorize(), logFormatConsole),
    colorize: true,
    prettyPrint: true,
  },
};

const consoleTransports = new winston.transports.Console(options.console);
const fileTransports = ConfigProperties.isLogEnabled()
  ? new winston.transports.DailyRotateFile(options.file)
  : new winston.transports.Console(options.console);

fileTransports.on('rotate', function (oldFilename, newFilename) {
  // do anything
});

const winstonLogger = new winston.createLogger({
  transports: [
    consoleTransports,
    fileTransports,
  ],
  exitOnError: false, // do not exist on handled exceptions
});

const winstonFileLogger = new winston.createLogger({
  transports: [
    fileTransports,
  ],
  exitOnError: false, // do not exist on handled exceptions
});

const winstonConsoleLogger = new winston.createLogger({
  transports: [
    consoleTransports,
  ],
  exitOnError: false, // do not exist on handled exceptions
});

winstonLogger.stream = {
  // eslint-disable-next-line no-unused-vars
  write: function (message, encoding) {
    winstonLogger.info(message);
  },
};

module.exports = {
  winstonLogger : winstonLogger,
  winstonFileLogger : winstonFileLogger,
  winstonConsoleLogger : winstonConsoleLogger,
};