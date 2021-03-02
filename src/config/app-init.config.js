const ora = require('ora');
const chalk = require('chalk');

const pjson = require('@root/package.json');

const logger = require('src/service/logger.service');
const domainService = require('src/service/domain.service');
const CommentUtils = require('src/utils/comment.utils');

const genJavaService = require('src/service/gen-java.service');
const genMongooseService = require('src/service/gen-mongoose.service');
const genJsService = require('src/service/gen-js.service');

const init = async () => {

    const spinner = ora({color: 'green', spinner: 'dots'});

    console.log();
    spinner.start(`Initializing application: ${pjson.name}(v${pjson.version})`);

    CommentUtils.updateMaxCharPerLineByConfig();

    /** Initiate the services */
    domainService.init();
    genJavaService.init();
    genMongooseService.init();
    genJsService.init();

    const totalClass = await domainService.getAllClassCount();
    const libVer = domainService.getDomainVersion();
    spinner.isSpinning
        ? spinner.succeed(`Application initiated [lib ver.${chalk.bold.green(libVer)} | class #. ${chalk.bold.green(totalClass)}]... `)
        : spinner.stop();
    console.log();
};

module.exports = {
    init: init,
};