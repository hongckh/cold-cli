const fs = require('fs');
const rimraf = require('rimraf');
const jsonfile = require('jsonfile');
const _ = require('lodash');
const ora = require('ora');
const chalk = require('chalk');

const logger = require('src/service/logger.service');
const ConfigProperties = require('src/config/config-properties');
const GeneratorUtils = require('src/utils/generator.utils');
const CommentUtils = require('src/utils/comment.utils');
const domainService = require('src/service/domain.service');
const CommonUtils = require('src/utils/common.utils');

/** Service for generating javascript common library */
class GenJsService {
    constructor() {
        this.init();
    }

    init(){
        /** Get Library Version */
        this.LIB_VERSION = ConfigProperties.LIB_VERSION;

        /**
         * Setup Generation target directories
         */
        this.OUTPUT_TARGET_DIR = ConfigProperties.OUTPUT_TARGET_DIR_JS;
        this.OUTPUT_TARGET_REFRESH_DIR = ConfigProperties.OUTPUT_TARGET_DIR_JS_REFRESH;

        /** Get JSON DEFINITIONS */
        this.DEF_JSON_DOMAIN = ConfigProperties.DEF_JSON_DOMAIN;
        this.DEF_JSON_JS = ConfigProperties.DEF_JSON_JS;
        this.DEF_JSON_JS_DEPENDENCY_MAP = ConfigProperties.DEF_JSON_JS_DEPENDENCY_MAP;
        this.DEF_JSON_JS_PACKAGE_JS = ConfigProperties.DEF_JSON_JS_PACKAGE_JAVASCRIPT;
        this.DEF_JSON_TS = ConfigProperties.DEF_JSON_TS;
        this.DEF_JSON_TS_CONFIG = ConfigProperties.DEF_JSON_TS_CONFIG;
        this.DEF_JSON_JAVASCRIPT_TYPE_MAP = ConfigProperties.DEF_JSON_JAVASCRIPT_TYPE_MAP;

        /**
         * Setup mongoose code SRC base directory
         */
        this.SRC_DIR_BASE = ConfigProperties.SRC_DIR_BASE_JS;
        this.DOMAIN_ROOT_DIR = ConfigProperties.DOMAIN_ROOT_DIR_JS;
        this.PACKAGE_ROOT = ConfigProperties.PACKAGE_ROOT_JS;

        this.INDENTATION = ConfigProperties.INDENTATION;

        this.SPINNER = new ora({spinner : 'dots'});

        this.reset();

    }

    async gen(){
        logger.infoFile('===============================================');
        logger.infoFile(`Creating Javascript Library - version: ${ConfigProperties.LIB_VERSION}`);

        const startTimer = new Date();

        this.SPINNER.start(`Preparing for Javascript Lib Generation ...`);

        await this.deleteGeneratedTarget();

        fs.mkdirSync(this.OUTPUT_TARGET_DIR, { recursive: true });
        fs.mkdirSync(this.DOMAIN_ROOT_DIR, { recursive: true });

        this.genPackageJson();
        this.genTsConfig();

        await this.processDomainDefinition(this.DEF_JSON_DOMAIN, this.PACKAGE_ROOT);

        const totalTime = CommonUtils.getTimeDiff(startTimer);

        logger.infoFile(`All javascript lib generated [ver: ${this.LIB_VERSION}] [${chalk.yellow.bold(totalTime + 's')}] `);
        this.SPINNER.succeed(`All ${chalk.cyan.underline.bold('JAVASCRIPT')} lib files generated [${chalk.yellow.bold(totalTime + 's')}]`);
    }

    /**
     * Reset class state
     */
    reset(){
        this.processedClass = 0;
    }

    /** Delete Previously Generated Target if exists */
    async deleteGeneratedTarget() {
        await new Promise(resolve => {
            // logger.info(`Clearing target refresh directory : ${this.OUTPUT_TARGET_REFRESH_DIR}`);
            rimraf(this.OUTPUT_TARGET_REFRESH_DIR, () => resolve());
        });
    }

    /** Generate package.json */
    genPackageJson() {
        const packageJsonTargetFile = `${this.OUTPUT_TARGET_DIR}/package.json`;

        /** Update package version */
        this.DEF_JSON_JS_PACKAGE_JS.version = this.LIB_VERSION;

        jsonfile.writeFileSync(
            packageJsonTargetFile,
            this.DEF_JSON_JS_PACKAGE_JS, { spaces: this.INDENTATION, EOL: '\r\n' },
            (err) => {
                if (err) logger.error(err);
                throw err;
            }
        );
    }

    /** Generate tsconfig.json */
    genTsConfig() {
        const tsconfigTargetFile = `${this.OUTPUT_TARGET_DIR}/tsconfig.json`;

        jsonfile.writeFileSync(
            tsconfigTargetFile,
            this.DEF_JSON_TS_CONFIG, { spaces: this.INDENTATION, EOL: '\r\n' },
            (err) => {
                if (err) logger.error(err);
                throw err;
            }
        );
    }

    /** Process Domain Definition Recursively */
    async processDomainDefinition(DEF, parentPackage) {
        if (DEF == null) return;
        for (const [key, value] of Object.entries(DEF)) {
            const className = key;
            const type = value.type;

            /**
             * Assume if type value not exists,
             * the object is categorized as a package
             */
            if (!type) {
                /** recursively create child packages / classes */
                await this.processDomainDefinition(value, `${parentPackage}.${key}`);
                continue;
            }

            /** If not an obj, skip the class creation process */
            if (type !== 'obj') continue;
            // if(className != 'PromoOptout') continue;
            /** Create class file */
            const filename = domainService.getJsStyledClassName(key) + '.model';
            const classConfig = value;

            const file = GeneratorUtils.getFileStream(filename, parentPackage, this.SRC_DIR_BASE, '.ts');
            if (!file) throw `Failed to get Class File Stream : className[${filename}], parentPackage[${parentPackage}]`;

            const processingFile = `${parentPackage.replace(/\./g,'/')}/${filename}.ts`;

            await new Promise(resolve => setTimeout(resolve, 1));
            this.SPINNER.text = 'Creating '
                + chalk.cyan.underline.bold('JAVASCRIPT')
                + ` [${CommonUtils.getLoadPercentageStr(domainService.COUNT_CLASS, this.processedClass)}] `
                // + '[v.' + chalk.green(this.LIB_VERSION) + '] '
                + chalk.yellow(processingFile);
            logger.infoFile(`Creating ${processingFile}`);

            this.processedClass++;

            /**
             * Getting file strings
             */
            const strArr = _.concat(
                this.getImportStr(className, classConfig),
                this.getClassBodyStr(className, classConfig),
            );

            strArr.filter(s => s != null && s != undefined)
                .forEach((str) => file.write(str + '\n'));

            file.end();
        }
    }

    /**
     * Get all import string needed per class
     */
    getImportStr(className, classConfig) {
        if (!className || !classConfig) return;

        const classProperties = classConfig.properties;
        const classAttributes = classConfig.attributes;

        const attributeImportStrArr = this.getAttributeImportStr(className, classConfig);

        /**
         * Scan for extend dependencies
         * - check if the extended class exists
         * - if yes
         *      class: import corresponding interface
         */
        const extendedClassImportStr = this.getExtendedClassImportStr(className);
        const extendedClassAttrImportStrArr = this.getExtendedClassAttrImportStr(classProperties.extends);

        let importStrArr = _.union(
                attributeImportStrArr,
                extendedClassAttrImportStrArr,
                extendedClassImportStr);

        if(Array.isArray(importStrArr) && importStrArr.length > 0 ){
            importStrArr = _.concat(importStrArr, '');
        }

        return importStrArr;
    }

    /**
     * Get import string needed for
     * class attributes
     *  1. Check for injection (Mixed / Class)
     *  2. Check for JS Type Map
     *  3. Check for domain definition
     *  If not found --> throw error
     * @param {*} classConfig
     */
    getAttributeImportStr(className, classConfig) {
        const attributeConfigs = classConfig.attributes;
        if (!attributeConfigs) return [];

        /** Skip processing enum classes */
        if (domainService.isEnumClassByClassConfig(classConfig)) return;

        const importStrArr = [];

        /** Loop attribute by key,value pair */
        for (const [attrKey, attrObj] of Object.entries(attributeConfigs)) {
            const type = attrObj.type;

            /** Handle normal attribute */
            const typeDepImportPath = this.getClassDependencyPath(type);
            if(typeDepImportPath){
                const importObjName = this.isJsDefaultType(type) || domainService.isEnumClassByClassName(type)
                    ? this.isJsDefaultType(type) ? this.getJsTypeFromMap(type) : type
                    : `I${type}`;
                importStrArr.push(`import { ${importObjName} } from '${typeDepImportPath}';`);
            }

            /** Handle injection attribute (String / Array) */
            const injectionDepImportStrArr = this.getInjectionDepImportStrArr(attrObj.injection);
            if (Array.isArray(injectionDepImportStrArr)) {
                injectionDepImportStrArr.forEach(depPath => importStrArr.push(depPath));
            }
        }

        return importStrArr;
    }

    /**
     * Get Class Dependency for Import String
     * @param {*} className
     */
    getClassDependencyPath(className) {
        if (!className) return;

        const attributeDep = this.getAttributeTypeDependency(className);
        if (!attributeDep) return;

        /** Check if dependency is for ENUM */

        return this.isJsDefaultType(className)
            ? attributeDep
            : `src/${attributeDep.replace(/\./g,'/').replace(className, this.getJsClassName(className))}`;

    }

    /**
     * Get the injection class dependency if any
     * return an array of string for injection
     * @param {*} injectionConfig
     */
    getInjectionDepImportStrArr(injectionConfig) {
        if (!injectionConfig) return;

        /** String injection config */
        if (_.isString(injectionConfig)) {
            const type = injectionConfig;
            const classDepPath = this.getClassDependencyPath(type);
            if(!classDepPath) return;

            const importObjName = this.isJsDefaultType(type) || domainService.isEnumClassByClassName(type)
                ? this.isJsDefaultType(type) ? this.getJsTypeFromMap(type) : type
                : `I${type}`;
            return  [`import { ${importObjName} } from '${classDepPath}';`] ;
        }

        /** Array injection config */
        if (Array.isArray(injectionConfig)) {
            const depPathArr = [];
            injectionConfig.forEach(c => _.isString(c) ? depPathArr.push(this.getInjectionDepImportStrArr(c)) : null);
            return depPathArr;
        }
    }

    /**
     * Get the attribute type dependency if any
     * @param {*} type
     */
    getAttributeTypeDependency(type) {

        /** Check if is JS default type */
        const jsDefaultType = this.getJsTypeFromMap(type);
        if (jsDefaultType) return this.getJsTypeDep(jsDefaultType);

        /** Check if domain definition exists type */
        return domainService.getClassDependency(type);

    }

    /**
     * Check if the type is one of the mongoose
     * default type
     * @param {*} type
     */
    isJsDefaultType(type) {
        return !_.isEmpty(this.getJsTypeFromMap(type));
    }

    /**
     * Get the JS type from predefined
     * javascriptTypeMap if exists
     * @param {*} type
     */
    getJsTypeFromMap(type) {
        if (!type || !this.DEF_JSON_JAVASCRIPT_TYPE_MAP) return;

        for (const [mType, refMap] of Object.entries(this.DEF_JSON_JAVASCRIPT_TYPE_MAP)) {
            /** Check if the type can match the refMap */
            if ((_.isString(refMap) && refMap == type) ||
                (Array.isArray(refMap) && refMap.includes(type))) {
                return mType;
            }
        }
    }

    /** Get JS Type Dependency */
    getJsTypeDep(type) {
        if(!type) return;
        return this.DEF_JSON_JS_DEPENDENCY_MAP[type];
    }

    /**
     * Get JS model Class Filename
     * @param {*} className
     */
    getJsClassName(className) {
        if (!className) return;

        return `${domainService.getJsStyledClassName(className)}.model`;
    }

    /**
     * Get extended class attribute import strings
     * @param {*} extendedClass
     */
    getExtendedClassAttrImportStr(extendedClass) {
        if (!extendedClass) return [];

        if (_.isString(extendedClass)) {
            const extendedClassConfig = domainService.getClassDefJson(extendedClass);
            const extendedClassExtends = extendedClassConfig.properties ? extendedClassConfig.properties.extends : null;

            return _.concat(this.getAttributeImportStr(extendedClass, extendedClassConfig),
                this.getExtendedClassAttrImportStr(extendedClassExtends));
        } else if (_.isObject(extendedClass) && !Array.isArray(extendedClass)) {
            return this.getExtendedClassAttrImportStr(Object.keys(extendedClass)[0]);
        }
    }

    /**
     * Get extended class import string
     * @param {*} extendedClass
     */
    getExtendedClassImportStr(className){
        const extendObj = domainService.getClassExtendsObjByClassName(className);
        if(!extendObj) return;

        const strArr = [];

        const extendedClass = Object.keys(extendObj)[0];
        const extendedClassConfig = Object.values(extendObj)[0];
        const injectionClass = extendedClassConfig ? extendedClassConfig.injection : undefined;

        const extendedClassDepPath = this.getClassDependencyPath(extendedClass);
        const injectionClassDepPath = injectionClass ? this.getClassDependencyPath(injectionClass) : injectionClass;
        const isJsDefaultTypeInject = injectionClass? this.isJsDefaultType(injectionClass) : true;

        if(extendedClassDepPath){
            strArr.push(`import { I${extendedClass} } from '${extendedClassDepPath}';`);
        }
        if(injectionClassDepPath && !isJsDefaultTypeInject){
            strArr.push(`import { ${injectionClass} } from '${injectionClassDepPath}';`);
        }

        return strArr;
    }

    /**
     * Get Class Body String
     * different body string for normal class and enum class
     */
    getClassBodyStr(className, classConfig) {
        if (!className || !classConfig) return;

        let bodyStrArr = [];

        const classDesc = classConfig.properties ? classConfig.properties.desc : null;
        const classDescStrArr = CommentUtils.getCommentBlockArr(classDesc);
        if (classDesc && Array.isArray(classDescStrArr) && classDescStrArr.length > 0) {
            bodyStrArr = _.concat(bodyStrArr, CommentUtils.getCommentBlockArr(classDesc));
        }

        return !domainService.isEnumClassByClassName(className)
            ? _.concat(bodyStrArr,
                this.getExportInterfaceStrArr(className, classConfig),
                this.getExportClassStrArr(className, classConfig))
            : _.concat(bodyStrArr,
                this.getExportEnumStrArr(className, classConfig),
                this.getExportEnumObjStrArr(className, classConfig));
    }

    /**
     * Get class export interface string array
     */
    getExportInterfaceStrArr(className, classConfig){
        if(!className || !classConfig) return ;

        const strArr = [];

        const classProperties = classConfig.properties;
        const classExtendsConfig = domainService.getClassExtendsObjByClassName(className);
        const classExtendsClass = classExtendsConfig ? Object.keys(classExtendsConfig)[0] : undefined;
        const classExtendsInject = classExtendsConfig && Object.values(classExtendsConfig)[0] ? Object.values(classExtendsConfig)[0].injection : undefined;
        const classExtendStr = classExtendsClass
            ? ` extends I${classExtendsClass}${classExtendsInject? '<' + classExtendsInject + '>' : ''}`
            : '';

        const classInjectStr = this.getClassInjectionStr(className);

        strArr.push(`export interface I${className}${classInjectStr}${classExtendStr} {`);

        const attrStrArr = this.getClassAttributeStrArrByClassName(className);
        attrStrArr ? attrStrArr.forEach(s => strArr.push(s)) : void 0;
        strArr.push('}');

        return strArr;
    }

    /**
     * Get class export class string array
     * with constructor for class declaration
     */
    getExportClassStrArr(className, classConfig){
        if(!className || !classConfig) return ;

        const strArr = [];

        const classInjectStr = this.getClassInjectionStr(className);

        strArr.push(`\nexport class ${className}${classInjectStr} implements I${className}${classInjectStr} {`);

        strArr.push(`${this.INDENTATION}constructor(`);

        const attrConfigObj = domainService.getAllClassAttrConfigObjByClassName(className);

        const constructDeclareStr = this.getClassConstructAttrStrArrByAttrConfig(attrConfigObj);

        if(Array.isArray(constructDeclareStr)){
            constructDeclareStr.forEach(s => strArr.push(this.INDENTATION + this.INDENTATION + s));
        }

        strArr.push(`${this.INDENTATION}){}`);

        strArr.push('}');

        return strArr;
    }

    /**
     * Get export const enum class string array
     */
    getExportEnumStrArr(className, classConfig){
        if(!className || !classConfig || !domainService.isEnumClassByClassConfig(classConfig)) return ;

        let strArr = [];

        strArr.push(`export const enum ${className} {`);

        const attributeConfigObj = domainService.getAttributeConfigObjByClassName(className);
        let attributeStrArr = [];
        if(attributeConfigObj) {
            for(const [key, config] of Object.entries(attributeConfigObj)){
                if(config && config.desc) {
                    attributeStrArr = _.concat(attributeStrArr, CommentUtils.getCommentBlockArr(config.desc));
                }
                attributeStrArr.push(`${key} = '${key}',`);
            }
        }
        strArr = _.concat(strArr, attributeStrArr.map(a => `${this.INDENTATION}${a}`));

        strArr.push('}');

        return strArr;
    }

    /**
     * Get the export const String array
     * for enum class
     */
    getExportEnumObjStrArr(className, classConfig){
        if(!className || !classConfig || !domainService.isEnumClassByClassConfig(classConfig)) return ;

        let strArr = [];

        strArr.push(`\nexport const ${className}Obj = {`);

        const attributeConfigObj = domainService.getAttributeConfigObjByClassName(className);
        let attributeStrArr = [];
        if(attributeConfigObj) {
            for(const [key, config] of Object.entries(attributeConfigObj)){
                attributeStrArr.push(`${key}: ${className}.${key},`);
            }
        }

        strArr = _.concat(strArr, attributeStrArr.map(a => `${this.INDENTATION}${a}`));
        strArr.push('}');

        return strArr;
    }

    /** Get Class Injection String */
    getClassInjectionStr(className) {
        let classInjectStr = '';
        const classInjectConfigObj = domainService.getClassInjectObjByClassName(className);
        if(classInjectConfigObj){
            for(const inject of Object.keys(classInjectConfigObj)){
                classInjectStr += `${inject}, `;
            }
            if(classInjectStr){
                classInjectStr = classInjectStr.replace(/, $/g, '');
                classInjectStr = `<${classInjectStr}>`;
            }
        }
        return classInjectStr;
    }

    /** Convert type to default type or no conversion */
    getConvertedType(type) {
        if(!type) return;
        const defaultType = this.getJsTypeFromMap(type);

        const isInjectedType = domainService.isInjectedClass(type);
        const attrInjectClassStr = isInjectedType ? '<any>' : '';

        return (defaultType ? defaultType : type) + attrInjectClassStr;
    }

    /**
     * Get the class attribute injection
     * by the attribute injection config
     * @param {*} injectionConfig
     */
    getClassAttributeInjectStr(injection){

        if(!injection) return;

        if(_.isString(injection)) {
            return `<${this.getConvertedType(injection)}>`;
        }

        const strArr = [];

        if (Array.isArray(injection)){
            injection.forEach(inject => {
                if(_.isString(inject)){
                    strArr.push(this.getConvertedType(inject));
                }
                else if(_.isObject(inject)){
                    for(const key of Object.keys(inject)){
                        strArr.push(this.getConvertedType(key));
                    }
                }
            });
        } else if(_.isObject(injection)){
            for(const key of Object.keys(injection)){
                strArr.push(this.getConvertedType(key));
            }
        }

        if(strArr.length > 0){
            return '<' + strArr.join(',') + '>';
        }

        return strArr;
    }

    /**
     * Get Class attribute string array
     * by class name
     * @param {*} className
     */
    getClassAttributeStrArrByClassName(className) {
        const attributeObj = domainService.getAttributeConfigByClassName(className);
        return this.getClassAttributeStrArrByAttrConfig(attributeObj);
    }

    /**
     * Get Class Attribute String Array by attribute config object
     * @param {*} attributeObj
     */
    getClassAttributeStrArrByAttrConfig(attributeObj){

        if(!attributeObj) return;

        const strArr = [];

        for(const [key, attrConfig] of Object.entries(attributeObj)){
            const desc = attrConfig ? attrConfig.desc : undefined;

            if(desc){
                const descStrArr = CommentUtils.getCommentBlockArr(desc);
                descStrArr ? descStrArr.forEach(s => strArr.push(s)) : void 0;
            }

            let attrStr = '';

            attrStr += `${key}?: `;

            const attrDeclareStr = this.getAttrDeclareStrByAttrConfig(attrConfig);

            attrStr += attrDeclareStr;
            attrStr += ';';
            strArr.push(attrStr);
        }

        return strArr.map(s => `${this.INDENTATION}${s}`);
    }

    /**
     * Get Attribute declaration string
     * @param {*} attrConfig
     */
    getAttrDeclareStrByAttrConfig(attrConfig) {
        if(!attrConfig) return;

        const type = attrConfig.type;
        const isArrayType = domainService.isArrayAttributeType(type);

        let attrStr = "";

        if(!isArrayType){
            const jsDefaultType = this.getJsTypeFromMap(type);
            const isInterface = domainService.isDomainClass(type) && !domainService.isEnumClassByClassName(type);
            const attrInjectionStr = this.getClassAttributeInjectStr(attrConfig ? attrConfig.injection : null);

            const isInjectedType = domainService.isInjectedClass(type);
            const attrInjectClassStr = isInjectedType ? '<any>' : '';

            attrStr += jsDefaultType
                ? jsDefaultType
                : (isInterface ? 'I' + type : type);
            attrStr += attrInjectClassStr;
            attrStr += attrInjectionStr ? attrInjectionStr : '';
        } else {
            const injection = attrConfig ? attrConfig.injection : undefined;
            const jsDefaultType =  this.getJsTypeFromMap(injection);
            const isInterface = domainService.isDomainClass(injection) && !domainService.isEnumClassByClassName(injection);

            const isInjectedType = domainService.isInjectedClass(injection);
            const attrInjectClassStr = isInjectedType ? '<any>' : '';

            attrStr += (jsDefaultType
                ? jsDefaultType
                : (isInterface ? 'I' + injection : injection));
            attrStr += attrInjectClassStr;
            attrStr += '[]';
        }
        return attrStr;
    }

    /**
     * Get String array for
     * @param {*} attrObj
     */
    getClassConstructAttrStrArrByAttrConfig(attrObj) {
        if(!attrObj) return;
        const strArr = [];

        for(const [key, attrConfig] of Object.entries(attrObj)){
            let attrStr = '';
            attrStr += `public ${key}?: `;

            const attrDeclareStr = this.getAttrDeclareStrByAttrConfig(attrConfig);

            attrStr += `${attrDeclareStr},`;
            strArr.push(attrStr);
        }

        return strArr;
    }

}

module.exports = new GenJsService();
