#!/usr/bin/env node

// set root path as project root directory
require('app-module-path').addPath(__dirname);

// initialize module alias setup
require('module-alias/register');

const boxen = require('boxen');
const chalk = require('chalk');
const figlet = require('figlet');

const pjson = require('@root/package.json');

// application starting console log (not logged in log file)
console.log();
console.log(figlet.textSync('COLD-CLI', {
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true
}));

console.log(boxen(
    (`Starting application: ${chalk.green(pjson.name)} (${chalk.green('ver.' +pjson.version)})\n`) +
    `Description: ${pjson.description}`,
    {padding: 1}
));

const endApp = () => {
    console.log('\n========= Ending application... =========\n');
};

(async () => {
    try {

        const cliService = require('src/service/cli.service');
        await cliService.run();
        // endApp();
    } catch (e) {
        console.log();
        console.log(chalk.red.bold('** Fetal application error : ') + e);
        endApp();
    }

})();
