const _ = require('lodash');
const xmlBuilder = require('xmlbuilder');
const config = require('config');

const logger = require('src/service/logger.service');

class XmlBuilderUtils {

    /**
     * Build XML String from JSON
     * @param {*} json
     */
    static buildXmlFromJson(json){
        if(_.isEmpty(json)) return {};
        const xmlObj = this.getXmlObjFromJson(json);
        return xmlBuilder.create(xmlObj).end({ pretty: true});
    }

    /**
     * Build XML Object from JSON
     * @param {*} json
     */
    static getXmlObjFromJson(json){
        const xmlObj = {};
        if(_.isEmpty(json)) return xmlObj;

        _.forEach(json, (value, key) => {
            if (typeof value === "string") {

                /** Support config value injection if exists */
                if(/^\${.*}$/.test(value)) {
                    let configVal;
                    try{
                        configVal = config.get(value.replace(/^\${/,'').replace(/}$/, ''));
                    } catch (err) {
                        logger.error(err);
                        configVal = undefined;
                    }
                    xmlObj[key] = { '#text': configVal ? configVal : value };
                }
                else {
                    xmlObj[key] = { '#text': value };
                }
            }
            else if (typeof value === 'object' && /^@/.test(key)){
                _.forEach(value, (attrValue,attrKey)=> xmlObj[`@${attrKey}`] = attrValue);
            }
            else if (typeof value === 'object' && Array.isArray(value)){
                xmlObj[key] = [];
                _.forEach(value, arrVale => xmlObj[key].push(this.getXmlObjFromJson(arrVale)));
            }
            else if (typeof value === 'object') xmlObj[key] = this.getXmlObjFromJson(value);
        });
        return xmlObj;
    }

}

module.exports = XmlBuilderUtils;