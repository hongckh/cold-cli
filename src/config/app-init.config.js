const ora = require('ora');
const chalk = require('chalk');

const pjson = require('@root/package.json');

const logger = require('src/service/logger.service');
const domainService = require('src/service/domain.service');

const init = async () => {

    const spinner = ora({color: 'green', spinner: 'dots'});
    spinner.start(`Initializing application: ${pjson.name}(v${pjson.version})`);

    const totalClass = await domainService.getAllClassCount();
    const libVer = domainService.getDomainVersion();
    spinner.isSpinning
        ? spinner.succeed(`Application initiated [lib ver.${chalk.bold.green(libVer)} | class #. ${chalk.bold.green(totalClass)}]... `)
        : spinner.stop();
};

module.exports = {
    init: init,
};