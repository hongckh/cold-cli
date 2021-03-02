const fs = require('fs');
const rimraf = require('rimraf');
const jsonfile = require('jsonfile');
const _ = require('lodash');
const ora = require('ora');
const chalk = require('chalk');

const logger = require('src/service/logger.service');
const ConfigProperties = require('src/config/config-properties');
const GeneratorUtils = require('src/utils/generator.utils');
const domainService = require('src/service/domain.service');
const CommentUtils = require('src/utils/comment.utils');
const CommonUtils = require('src/utils/common.utils');

class GenMongooseService {
    constructor() {
        this.init();
    }

    init(){
        /** Get Library Version */
        this.LIB_VERSION = ConfigProperties.LIB_VERSION;

        /**
         * Setup Generation target directories
         */
        this.OUTPUT_TARGET_DIR = ConfigProperties.OUTPUT_TARGET_DIR_MONGOOSE;
        this.OUTPUT_TARGET_REFRESH_DIR = ConfigProperties.OUTPUT_TARGET_DIR_MONGOOSE_REFRESH;

        /** Get JSON DEFINITIONS */
        this.DEF_JSON_DOMAIN = ConfigProperties.DEF_JSON_DOMAIN;
        this.DEF_JSON_JS = ConfigProperties.DEF_JSON_JS;
        this.DEF_JSON_JS_PACKAGE_MONGOOSE = ConfigProperties.DEF_JSON_JS_PACKAGE_MONGOOSE;
        this.DEF_JSON_TS = ConfigProperties.DEF_JSON_TS;
        this.DEF_JSON_TS_CONFIG = ConfigProperties.DEF_JSON_TS_CONFIG;
        this.DEF_JSON_MONGOOSE_TYPE_MAP = ConfigProperties.DEF_JSON_MONGOOSE_TYPE_MAP;

        /**
         * Setup mongoose code SRC base directory
         */
        this.SRC_DIR_BASE = ConfigProperties.SRC_DIR_BASE_MONGOOSE;
        this.DOMAIN_ROOT_DIR = ConfigProperties.DOMAIN_ROOT_DIR_MONGOOSE;
        this.PACKAGE_ROOT = ConfigProperties.PACKAGE_ROOT_MONGOOSE;

        this.INDENTATION = ConfigProperties.INDENTATION;

        this.SPINNER = new ora({spinner : 'dots'});

        this.reset();
    }

    async gen() {
        logger.infoFileOnly('===============================================');
        logger.infoFileOnly(`Creating Mongoose Library - version: ${ConfigProperties.LIB_VERSION}`);

        const startTimer = new Date();

        this.SPINNER.start(`Preparing for Mongoose Lib Generation ...`);

        await this.deleteGeneratedTarget();

        fs.mkdirSync(this.OUTPUT_TARGET_DIR, { recursive: true });
        fs.mkdirSync(this.DOMAIN_ROOT_DIR, { recursive: true });

        this.genPackageJson();
        this.genTsConfig();

        await this.processDomainDefinition(this.DEF_JSON_DOMAIN, this.PACKAGE_ROOT);

        const totalTime = CommonUtils.getTimeDiff(startTimer);

        logger.infoFileOnly(`All mongoose lib generated [ver: ${this.LIB_VERSION}]... `);
        this.SPINNER.succeed(`All ${chalk.cyan.underline.bold('MONGOOSE')} lib files generated [${chalk.yellow.bold(totalTime + 's')}]`);
    }

    reset(){
        this.processedClass = 0;
    }

    /** Generate package.json */
    genPackageJson() {
        const packageJsonTargetFile = `${this.OUTPUT_TARGET_DIR}/package.json`;

        /** Update package version */
        this.DEF_JSON_JS_PACKAGE_MONGOOSE.version = this.LIB_VERSION;

        jsonfile.writeFileSync(
            packageJsonTargetFile,
            this.DEF_JSON_JS_PACKAGE_MONGOOSE, { spaces: this.INDENTATION, EOL: '\r\n' },
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

    /** Delete Previously Generated Target if exists */
    async deleteGeneratedTarget() {
        await new Promise(resolve => {
            // logger.infoFileOnly(`Clearing target refresh directory : ${this.OUTPUT_TARGET_REFRESH_DIR}`);
            rimraf(this.OUTPUT_TARGET_REFRESH_DIR, () => resolve());
        });
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

            /** skip if is enum */
            if (domainService.isEnumClassByClassName(className)) continue;

            /** Create class file */
            const filename = domainService.getJsStyledClassName(key) + '.schema';
            const classConfig = value;

            const file = GeneratorUtils.getFileStream(filename, parentPackage, this.SRC_DIR_BASE, '.ts');
            if (!file) throw `Failed to get Class File Stream : className[${filename}], parentPackage[${parentPackage}]`;

            const processingFile = `${parentPackage.replace(/\./g,'/')}/${filename}.ts`;

            await new Promise(resolve => setTimeout(resolve, 1));
            this.SPINNER.text = 'Creating '
                + chalk.cyan.underline.bold('MONGOOSE')
                + ` [${CommonUtils.getLoadPercentageStr(domainService.COUNT_CLASS, this.processedClass)}] `
                // + '[v.' + chalk.green(this.LIB_VERSION) + '] '
                + chalk.yellow(processingFile);
            logger.infoFileOnly(`Creating ${processingFile}`);

            this.processedClass++;

            /**
             * Getting file strings
             */
            const strArr = _.compact(_.concat(
                this.getImportStr(className, classConfig),
                this.getClassBodyStr(className, classConfig),
            ));

            strArr.forEach((str) => file.write(str + '\n'));

            file.end();
        }
    }

    /**
     * Get all import string needed per class
     */
    getImportStr(className, classConfig) {
        if (!className || !classConfig) return;

        const importStrArr = [];

        const classProperties = classConfig.properties;
        const classAttributes = classConfig.attributes;

        /**  Add default mongoose schema */
        importStrArr.push('import { Schema } from "mongoose";');

        const attributeImportStrArr = this.getAttributeImportStr(className, classConfig);

        /**
         * Scan for extend dependencies
         * - check if the extended class exists
         * - if yes
         *      class: import corresponding interface
         */
        const extendedClassAttrImportStrArr = this.getExtendedClassAttrImportStr(classProperties.extends);


        return _.union(importStrArr, attributeImportStrArr, extendedClassAttrImportStrArr);

    }

    /**
     * Get import string needed for
     * class attributes
     *  1. Check for injection (Mixed / Class)
     *  2. Check for Mongoose Type Map
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

            if (typeDepImportPath) {
                importStrArr.push(`import { ${type}Schema } from '${typeDepImportPath}';`);
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
     * Get extended class import strings
     * @param {*} extendedClass
     */
    getExtendedClassAttrImportStr(extendedClass) {
        if (!extendedClass) return [];

        if (_.isString(extendedClass)) {
            const extendedClassConfig = domainService.getClassDefJson(extendedClass);
            const extendedClassExtends = extendedClass.properties ? extendedClass.properties.extends : null;

            return _.concat(this.getAttributeImportStr(extendedClass, extendedClassConfig),
                this.getExtendedClassAttrImportStr(extendedClassExtends));
        } else if (_.isObject(extendedClass) && !Array.isArray(extendedClass)) {
            for (const [extendsKey, extendsConfigs] of Object.entries(extendedClass)) {
                const firstExtendedClass = extendsKey;

                return this.getExtendedClassAttrImportStr(firstExtendedClass);
            }
        }
    }

    /**
     * Get Class Body String´
     */
    getClassBodyStr(className, classConfig) {
        if (!className || !classConfig) return;

        const bodyStrArr = [];

        const classDesc = classConfig.properties ? classConfig.properties.desc : null;

        if (classDesc) {
            bodyStrArr.push(`\n${CommentUtils.getCommentBlockArr(classDesc)}`);
        }

        bodyStrArr.push(`\nconst ${className}Schema = new Schema ({`);

        /** Get class attribute schema */
        const attrSchemaStrArr = this.getClassAttributeSchemaStrArr(classConfig);
        if (attrSchemaStrArr) {
            attrSchemaStrArr.map(s => `${this.INDENTATION}${s}`).forEach(s => bodyStrArr.push(s));
        }

        /** Get class extended schema */
        const extendedClassSchemaStrArr = this.getExtendedClassAttrSchemaStrArr(classConfig.properties ? classConfig.properties.extends : undefined);
        if (extendedClassSchemaStrArr) {
            extendedClassSchemaStrArr.map(s => s ? `${this.INDENTATION}${s}` : null).forEach(s => s ? bodyStrArr.push(s) : null);
        }


        bodyStrArr.push('});');
        bodyStrArr.push(`\nexport { ${className}Schema };`);

        return bodyStrArr;

    }

    /** Get Class Attribute Schema Str Array */
    getClassAttributeSchemaStrArr(classConfig, injection) {

        if (!classConfig || !classConfig.attributes) return;

        const attributeConfigs = classConfig.attributes;
        const classInjectionConfig = classConfig.properties ? classConfig.properties.injection : null;

        const attrSchemaStrArr = [];

        for (const [attrKey, attrConfig] of Object.entries(attributeConfigs)) {

            const attrSchema = this.getAttributeTypeSchema(attrConfig, classInjectionConfig, injection);

            if (!attrSchema) return;


            const attrDesc = attrConfig.desc;
            if (attrDesc) {

                CommentUtils.getCommentBlockArr(attrDesc).forEach(s => {
                    attrSchemaStrArr.push(s);
                });
            }

            attrSchemaStrArr.push(`${attrKey}: ${attrSchema},`);
        }

        return attrSchemaStrArr;
    }

    /**
     * Get attribute schema array string
     * from the extended class recursively
     *
     * support a single injection class
     */
    getExtendedClassAttrSchemaStrArr(extendedClass, injection) {
        if (!extendedClass) return;

        if (_.isString(extendedClass)) {
            const extendedClassDef = domainService.getClassDefJson(extendedClass);

            if (!extendedClassDef) return;
            const extendedClassExtends = extendedClassDef.properties ? extendedClassDef.properties.extends : undefined;

            return _.concat(
                this.getClassAttributeSchemaStrArr(extendedClassDef, injection),
                this.getExtendedClassAttrSchemaStrArr(extendedClassExtends)
            );
        } else if (_.isObject(extendedClass) && !Array.isArray(extendedClass)) {
            /** only support single extension  */
            for (const [extendsKey, extendsConfigs] of Object.entries(extendedClass)) {
                const firstExtendedClass = extendsKey;
                const injectionConfig = extendsConfigs.injection;

                return this.getExtendedClassAttrSchemaStrArr(firstExtendedClass, _.isString(injectionConfig) ? injectionConfig : null);
            }
        }
    }

    /**
     * Check if the attribute config
     * is a generic attribute for injecting class
     * @param {*} attrConfig
     * @param {*} classInjectionConfig
     */
    isGenericAttributeForInjection(attrConfig, classInjectionConfig) {
        if (!attrConfig || !classInjectionConfig) return false;

        const type = attrConfig.type;
        if (_.isString(classInjectionConfig)) {
            return type == classInjectionConfig;
        } else if (_.isObject(classInjectionConfig)) {
            for (const [key, value] of Object.entries(classInjectionConfig)) {
                if (key == type) return true;
            }
        }
        return false;
    }

    /**
     * Get attribute type schema
     */
    getAttributeTypeSchema(attrConfig, classInjectionConfig, injectedClass) {
        if (!attrConfig) return;

        const type = attrConfig.type;
        const injection = attrConfig.injection;

        /** skip if no type */
        if (!type) return;
        /** Array attribute schema */
        if (domainService.isArrayAttributeType(type)) {
            if (!injection || (Array.isArray(injection) && injection.length <= 0)) return;

            const injectedType = Array.isArray(injection) ? injection[0] : injection;

            return `[ ${this.getAttributeTypeSchema({type: injectedType})} ]`;
        }

        /** non array attribute schema */
        else {
            const mongooseDefType = this.getMongooseTypeFromMap(type);

            if (mongooseDefType) return mongooseDefType;


            const isGenericInjectionType = this.isGenericAttributeForInjection(attrConfig, classInjectionConfig, injectedClass);
            if (isGenericInjectionType && classInjectionConfig && injectedClass) {
                const injectedMongooseDefType = this.getMongooseTypeFromMap(injectedClass);
                if (injectedMongooseDefType) return injectedMongooseDefType;
                if (domainService.isDomainClass(injectedClass)) {
                    return domainService.isEnumClassByClassName(injectedClass) ?
                        `{ type: String, enum : ${domainService.getEnumClassAttributesArrStr(injectedClass)} }` :
                        `${injectedClass}Schema`;
                }

            } else if (isGenericInjectionType) {
                return 'Schema.Types.Mixed';
            }

            const isClassSchema = domainService.isDomainClass(type);

            if (isClassSchema) return domainService.isEnumClassByClassName(type) ?
                `{ type: String, enum : ${domainService.getEnumClassAttributesArrStr(type)} }` :
                `${type}Schema`;

        }

    }

    /**
     * Get the attribute type dependency if any
     * @param {*} type
     */
    getAttributeTypeDependency(type) {
        /** No dependency for mongoose default type */
        if (this.isMongooseDefaultType(type)) return;

        /** Check if domain definition exists type */
        const typeDep = domainService.getClassDependency(type);
        // if(_.isEmpty(typeDep)) return;

        return typeDep;
    }

    /**
     * Get Mongoose Schema Class Filename
     * @param {*} className
     */
    getMongooseClassName(className) {
        if (!className) return;

        return `${domainService.getJsStyledClassName(className)}.schema`;
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
        /** Skip enum dependency import --> use String  */
        if (domainService.isEnumClassByClassName(className)) return;

        return `src/${attributeDep.replace(/\./g,'/').replace(className, this.getMongooseClassName(className))}`;

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
            const classDepPath = this.getClassDependencyPath(injectionConfig);
            return classDepPath ? [`import { ${injectionConfig}Schema } from '${classDepPath}';`] :
                null;
        }

        /** Array injection config */
        if (Array.isArray(injectionConfig)) {
            const depPathArr = [];
            injectionConfig.forEach(c => _.isString(c) ? depPathArr.push(this.getInjectionDepImportStrArr(c)) : null);
            return depPathArr;
        }

        /**
         * TODO: handle Object injection config
         */
        // if(_.isObject(injectionConfig)){
        //     for(const [key, value] of Object.entries(injectionConfig)){

        //     }
        // }
    }

    /**
     * Check if the type is one of the mongoose
     * default type
     * @param {*} type
     */
    isMongooseDefaultType(type) {
        return !_.isEmpty(this.getMongooseTypeFromMap(type));
    }

    /**
     * Get the mongoose type from predefined
     * mongooseTypeMap if exists
     * @param {*} type
     */
    getMongooseTypeFromMap(type) {
        if (!type || !this.DEF_JSON_MONGOOSE_TYPE_MAP) return;

        for (const [mType, refMap] of Object.entries(this.DEF_JSON_MONGOOSE_TYPE_MAP)) {
            /** Check if the type can match the refMap */
            if ((_.isString(refMap) && refMap == type) ||
                (Array.isArray(refMap) && refMap.includes(type))) {
                return mType;
            }
        }
    }

}

module.exports = new GenMongooseService();