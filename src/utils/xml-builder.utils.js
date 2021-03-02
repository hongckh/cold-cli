const _ = require('lodash');
const xmlBuilder = require('xmlbuilder');

const ConfigProperties = require('src/config/config-properties');

class XmlBuilderUtils {

    /**
     * Build XML String from JSON
     * @param {*} json
     */
    static buildXmlFromJson(json){
        if(_.isEmpty(json)) return {};
        try {
            const xmlObj = this.getXmlObjFromJson(json);
            return xmlBuilder.create(xmlObj).end({ pretty: true});
        } catch (err) {
            throw 'Failed to build XML from JSON';
        }
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
                        configVal = ConfigProperties.CONFIG_JSON[value.replace(/^\${/,'').replace(/}$/, '')];
                    } catch (err) {
                        console.error('XML Object generation error : ' + err);
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