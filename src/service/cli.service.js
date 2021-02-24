const inquirer = require('inquirer');
const chalk = require('chalk');

const logger = require('src/service/logger.service');
const genJavaService = require('src/service/gen-java.service');
const genMongooseService = require('src/service/gen-mongoose.service');
const genJsService = require('src/service/gen-js.service');
const CommonUtils = require('src/utils/common.utils');

class CliService {
    constructor(){}

    async run(){
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
}

module.exports = new CliService();