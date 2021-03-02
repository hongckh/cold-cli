const inquirer = require('inquirer');
const chalk = require('chalk');

const logger = require('src/service/logger.service');
const genJavaService = require('src/service/gen-java.service');
const genMongooseService = require('src/service/gen-mongoose.service');
const genJsService = require('src/service/gen-js.service');
const CommonUtils = require('src/utils/common.utils');
const ConfigProperties = require('src/config/config-properties');

class CliService {
    constructor(){}

    async run(){

        console.log('\nInitiating CLI ...\n');

        /** Ask for user config file location */
        const configFileDir = await this.getUserInput(`COLD-CLI config [${chalk.cyan(ConfigProperties.CONFIG_FILENAME)}] directory (blank for current directory):`);

        /** Init Config Properties */
        ConfigProperties.initConfig(configFileDir);
        /** Check if config file exists and check validity */

        /** Init cli app for domain */
        const appInit = require('src/config/app-init.config');
        await appInit.init();

        /** Ask for generation language */

        inquirer.prompt([
            {
                type: 'checkbox',
                message: 'Select lib to generate',
                name: 'lib',
                choices: [
                    { name: 'java' },
                    { name: 'javascript' },
                    { name: 'mongoose' },
                ],
                validate: (answer) => {
                    if (answer.length < 1) return 'You must choose at least one lib.';
                    return true;
                  },
            }
        ]).then(async answers => {
            const targetLibs = answers.lib;

            if(Array.isArray(targetLibs)){
                const startTimer = new Date();
                for(const lib of targetLibs){
                    switch (lib) {
                        case 'java':
                            await genJavaService.gen();
                            break;
                        case 'javascript':
                            await genJsService.gen();
                            break;
                        case 'mongoose':
                            await genMongooseService.gen();
                            break;
                        default:
                            break;
                    }
                }
                console.log(`Total time elapsed: ${chalk.yellow.bold(String(CommonUtils.getTimeDiff(startTimer) + 's'))}`);
            }
        });
    }

    /**
     * Get user input
     * @param {*} msg
     */
    async getUserInput(msg){
        return await new Promise( resolve => {
            inquirer.prompt([
                {
                    type: 'Input',
                    message: msg,
                    name: 'input'
                },
            ]).then( ans => {
                resolve(ans.input);
            });
        });
    }
}

module.exports = new CliService();