const config = require('config');
const _ = require('lodash');

const logger = require('src/service/logger.service');

const CommonUtils = require('src/utils/common.utils');
const ConfigProperties = require('src/config/config-properties');

class DomainService {
    constructor() {
        this.DEFINITION_DOMAIN_FILE = ConfigProperties.DEFINITION_DOMAIN_FILE;
        this.DEF_JSON_DOMAIN = ConfigProperties.DEF_JSON_DOMAIN;
        this.PACKAGE_ROOT = ConfigProperties.PACKAGE_ROOT;

        this.DEF_JSON_JAVASCRIPT_TYPE_MAP = ConfigProperties.DEF_JSON_JAVASCRIPT_TYPE_MAP;
        this.DEF_JSON_MONGOOSE_TYPE_MAP = ConfigProperties.DEF_JSON_MONGOOSE_TYPE_MAP;
        this.DEF_JSON_JS_DEPENDENCY_MAP = ConfigProperties.DEF_JSON_JS_DEPENDENCY_MAP;

        this.COUNT_CLASS = undefined;

    }

    /** Count total class in domain */
    async getAllClassCount(){
        let counter = 0;
        const processDomainDef = async (DEF) => {
            if (DEF == null) return;
            for (const [key, value] of Object.entries(DEF)) {
                const className = key;
                const type = value.type;
                if (!type) {
                    await processDomainDef(value);
                    continue;
                }
                if (type !== 'obj') continue;
                counter ++;
            }
        };
        await processDomainDef(this.DEF_JSON_DOMAIN);
        this.COUNT_CLASS = counter;
        return counter;
    }

    getDomainVersion(){
        return ConfigProperties.LIB_VERSION;
    }

    /** check if the class is defined  */
    isDomainClass(className) {
        const classDef = this.getClassDefJson(className);
        return classDef != undefined || classDef != null;
    }

    /**
     * Get the class definition json by class name
     * @param {*} className
     * @param {*} domainDef
     */
    getClassDefJson(className, domainDef) {
        /**
         * Cannot use the same DEF_JSON_DOMAIN since it will alter the original JSON obj
         * Don't use _.cloneDeep due performance issue
         */
        if (_.isEmpty(domainDef)) domainDef = CommonUtils.getJsonFromFile(this.DEFINITION_DOMAIN_FILE);

        for (const [key, value] of Object.entries(domainDef)) {
            const type = value.type;

            /** Check if the class matches the target class */
            if (type === 'obj' && key === className) {
                return value;
            } else if (type === 'obj') {
                // skip the remaining for the not matched class type
                continue;
            }

            /**
             * If not class type, then assume it is a package level
             * recursively loop into the package definition
             */
            const matchedClass = this.getClassDefJson(className, value);
            if (!_.isEmpty(matchedClass)) return matchedClass;
        }
    }

    /**
     * Get Class properties by class name
     * @param {*} className
     */
    getClassPropertiesByClassName(className){
        if(!className) return;
        const classDef = this.getClassDefJson(className);

        return classDef ? classDef.properties : undefined;
    }

    /**
     * Get class dependency from domain definition
     * Recursively search for the matching class
     * @param {*} className
     * @param {*} domainDef
     * @param {*} parentPackage
     */
    getClassDependency(className, domainDef, parentPackage) {
        /** use default root if no parent package is defined : domain */
        if (!parentPackage) parentPackage = this.PACKAGE_ROOT;
        /** Use default root DOMAIN JSON if no domain definition is defined */
        if (!domainDef) domainDef = _.cloneDeep(this.DEF_JSON_DOMAIN);

        for (const [key, value] of Object.entries(domainDef)) {
            const type = value.type;
            /** Check if the class matches the target class */
            if (type === 'obj' && key === className) {
                return `${parentPackage}.${key}`;
            } else if (type === 'obj') {
                // skip the remaining for the not matched class type
                continue;
            }

            /**
             * If not obj type, then assume it is a package level
             * recursively loop into the package definition
             */
            const matchedPackage = this.getClassDependency(
                className,
                value,
                `${parentPackage}.${key}`,
            );
            if (matchedPackage) return matchedPackage;
        }

    }

    /**
     * Check if the class is an enum
     * by class name
     * @param {*} className
     * @return {*}
     * @memberof DomainService
     */
    isEnumClassByClassName(className) {
        if (!className) return false;
        const classDef = this.getClassDefJson(className);

        if (!classDef) return false;

        return this.isEnumClassByClassConfig(classDef);
    }

    /**
     * Check if the class config is an eum     *
     * @param {*} classConfig
     * @return {*}
     * @memberof DomainService
     */
    isEnumClassByClassConfig(classConfig) {
        if (!classConfig) throw "Empty class config!";

        const properties = classConfig.properties;
        if (!properties) throw "Class missing properties config!";

        return properties.classType == "ENUM";
    }

    /**
     * Get Enum Class Attributes by class name
     * @param {*} className
     */
    getEnumClassAttributes(className) {
        if (!className) throw "Empty class name to get ENUM class attributes";

        const classDef = this.getClassDefJson(className);

        if (!classDef) throw `Class[${className}] not defined to get ENUM class attributes`;

        if (!this.isEnumClassByClassConfig(classDef)) throw `Class[${className}] is not an ENUM class`;

        return classDef.attributes;
    }

    /**
     * Get ENUM Class Attribute Array String
     * @param {*} className
     */
    getEnumClassAttributesArrStr(className) {
        const enumAttributes = this.getEnumClassAttributes(className);

        if (!Array.isArray(enumAttributes) || enumAttributes.length <= 0) return '[]';

        let str = '[ ';

        enumAttributes.forEach(attribute => {
            if (_.isString(attribute)) str += `'${attribute}',`;
            else if (_.isObject(attribute)) {
                for (const key of Object.keys(attribute)) {
                    str += `'${key}',`;
                }
            }
        });

        str += ' ]';
        return str;
    }

    /**
     * Check if the attribute is an injected attribute
     * @param {*} attributeConfig
     */
    isInjectedAttribute(attributeConfig) {
        if (!attributeConfig) return false;

        return !_.isEmpty(attributeConfig.injection);
    }

    /**
     * Is injected class
     * @param {*} className
     */
    isInjectedClass(className) {
        if(!className) return false;

        const classProperties = this.getClassPropertiesByClassName(className);
        if(!classProperties) return false;

        const classInjection = classProperties.injection;
        return classInjection != undefined && classInjection != null;
    }

    /** Get JS Style class name */
    getJsStyledClassName(className) {
        if (!className);
        return className.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /** be the class attributes config  */
    getAttributeConfigByClassName(className){
        const classConfig = this.getClassDefJson(className);

        if(!classConfig) return;

        return classConfig.attributes;
    }

    /**
     * get the class attributes config in
     * form of an standard object structure
     *
     * support single injection of string only
     */
    getAttributeConfigObjByClassName(className, injectedType){

        const attributeConfig = this.getAttributeConfigByClassName(className);
        if(!attributeConfig) return;

        const classInjectConfigObj = this.getClassInjectObjByClassName(className);
        const classFirstInjectionType = classInjectConfigObj ? Object.keys(classInjectConfigObj)[0] : null;
        let injectDict = {};
        if(this.isUndefinedType(classFirstInjectionType) && classFirstInjectionType && injectedType){
            injectDict[classFirstInjectionType] = injectedType;
        } else {
            injectDict = null;
        }

        const configObj = {};
        if(Array.isArray(attributeConfig)) {
            attributeConfig.forEach(aConfig => {
                if(_.isString(aConfig)) {
                    configObj[aConfig] = null;
                }
                else if (_.isObject(aConfig)){
                    for(const [key, value] of Object.entries(aConfig)){
                        configObj[key] = this.getInjectedAttrConfigValue(value, injectDict);
                    }
                }
            });
        } else if (_.isObject(attributeConfig)){
            for(const [key, value] of Object.entries(attributeConfig)){
                configObj[key] = this.getInjectedAttrConfigValue(value, injectDict);
            }
        }

        return configObj;
    }

    /**
     * update the attribute config bye injection dictionary
     * cannot handle array
     * @param {*} value
     */
    getInjectedAttrConfigValue(value, injectDic) {

        if(!value || !injectDic || Array.isArray(value)) return value;

        if(_.isString(value)){
            const translatedType = injectDic[value];
            return translatedType ? translatedType : value;
        }

        const type = value.type;
        if(!type) return value;

        const isArrayType = this.isArrayAttributeType(type);

        if(isArrayType && value.injection && _.isString(value.injection)){
            const injection = value.injection;
            const translatedType = injectDic[injection];
            value.injection = translatedType ? translatedType : injection;

        } else if (!isArrayType) {
            const translatedType = injectDic[type];
            value.type = translatedType ? translatedType : type;
        }
        return value;
    }

    /**
     * Get all class attribute config object
     * including the extended class
     * @param {*} className
     */
    getAllClassAttrConfigObjByClassName(className){
        if(!className) return;

        const attributeConfigObj = this.getAttributeConfigObjByClassName(className);
        const classExtendedConfigObj = this.getClassExtendedAttrConfigObjByClassName(className);

        return _.assign(attributeConfigObj, classExtendedConfigObj);
    }

    /**
     * Get the class extends class
     * @param {*} className
     */
    getClassExtendedAttrConfigObjByClassName(className) {
        const classProperties = this.getClassPropertiesByClassName(className);
        if(!classProperties) return;
        const extendedClass = classProperties.extends;
        return this.getClassExtendedAttrConfigObj(extendedClass);
    }

    /**
     * Get the extended Class attribute object
     * @param {*} extendedClass
     */
    getClassExtendedAttrConfigObj(extendedClass, injection) {
        if(!extendedClass) return;

        if(_.isString(extendedClass)){
            const extendedClassProp = this.getClassPropertiesByClassName(extendedClass);
            const extendedClassExtends = extendedClassProp ? extendedClassProp.extends : null;

            const extendedClassAttrObj = this.getAttributeConfigObjByClassName(extendedClass, injection);
            const extendedClassExtendsAttrConfig = this.getClassExtendedAttrConfigObj(extendedClassExtends);

            return _.assign(extendedClassAttrObj, extendedClassExtendsAttrConfig);
        }
        else if (_.isObject(extendedClass) && !Array.isArray(extendedClass)){
            const firstExtendedClass = Object.keys(extendedClass)[0];
            const firstExtendedClassConfig = Object.values(extendedClass)[0];
            const injectedType = firstExtendedClassConfig ? firstExtendedClassConfig.injection : null;
            return this.getClassExtendedAttrConfigObj(firstExtendedClass, injectedType);
        }
    }

    /**
     * Get the class extends class object if exists
     * by class name
     */
    getClassExtendsObjByClassName(className){
        const classProperties = this.getClassPropertiesByClassName(className);
        if(!classProperties) return;
        const configObj = {};

        const extendsConfig = classProperties.extends;

        if(_.isString(extendsConfig)){
            configObj[extendsConfig] = null;
        } else if (Array.isArray(extendsConfig) && extendsConfig.length > 0){
            const firstConfig = extendsConfig[0];
            if(_.isString(firstConfig)) configObj[firstConfig] = null;
            else if(_.isObject(firstConfig)) {
                configObj[Object.keys(firstConfig)[0]] = Object.values(firstConfig)[0];
            }
        } else if(_.isObject(extendsConfig)){
            configObj[Object.keys(extendsConfig)[0]] = Object.values(extendsConfig)[0];
        }

        return configObj;
    }

    /**
     * Get the class properties injection config
     * if exists in object form
     * @param {*} className
     */
    getClassInjectObjByClassName(className){
        const classProperties = this.getClassPropertiesByClassName(className);
        if(!classProperties) return;

        const injectionConfig = classProperties.injection;

        if(!injectionConfig) return;

        const configObj = {};

        if(_.isString(injectionConfig)){
            configObj[injectionConfig] = null;
        }
        else if (Array.isArray(injectionConfig)){
            injectionConfig.forEach(inject => {
                if(_.isString(inject)) {
                    configObj[inject] = null;
                } else if (_.isObject(inject)) {
                    configObj[Object.keys(inject)[0]] = Object.values(inject)[0];
                }
            });
        }
        else if (_.isObject(injectionConfig)){
            return injectionConfig;
        }

        return configObj;

    }

    /**
     * Check if the attribute is an mongoose array
     * target attribute type: Set / List
     * @param {*} attributeConfig
     */
    isArrayAttributeType(attributeConfig) {
        if (!attributeConfig) return false;

        const type = _.isString(attributeConfig) ? attributeConfig : attributeConfig.type;
        return 'Set' == type || 'List' == type;
    }

    /**
     * Check if the type is undefined in
     * domain definition
     * or language based type map
     * @param {*} type
     */
    isUndefinedType(type){
        if(!type) return true;

        const isDomainClass = this.isDomainClass(type);

        const isJsType = !_.isNil(this.DEF_JSON_JAVASCRIPT_TYPE_MAP[type]);
        const isMongooseType = !_.isNil(this.DEF_JSON_MONGOOSE_TYPE_MAP[type]);
        const isJavaType = !_.isNil(this.DEF_JSON_JS_DEPENDENCY_MAP[type]);

        return !isDomainClass && !isJavaType && !isJsType && !isMongooseType;
    }
}

module.exports = new DomainService();