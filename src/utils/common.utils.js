const fs = require('fs');
const _ = require('lodash');

class CommonUtils {

    static getJsonFromFile(filePath) {
        try {
            if(!filePath) return;

            /** Check if file exists */
            if(!fs.existsSync(filePath)) return;

            const buffer = fs.readFileSync(filePath);
            return JSON.parse(buffer);
        } catch (e) {
            console.error(`Failed to get JSON from file : ${filePath}`);
        }
    }

    /** Check if file exist  */
    static isExistFile(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * Get the time difference
     * @param {*} date
     */
    static getTimeDiff(date){
        if(!date || !_.isDate(date)) return undefined;

        return ((new Date).getTime() - date.getTime())/1000;
    }

    /**
     * get the loading percentage
     * @param {*} total
     * @param {*} count
     */
    static getLoadPercentage(total, count) {
        if(total <=0 || count < 0) return undefined;
        return count / total;
    }

    static getLoadPercentageStr(total, count) {
        const percentage = this.getLoadPercentage(total, count);

        if(!_.isNumber(percentage)) return "??%";

        return String(Math.floor(percentage * 100)).padStart(2,0) + '%';
    }

}

module.exports = CommonUtils;