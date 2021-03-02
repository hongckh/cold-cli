const fs = require('fs');
const rimraf = require('rimraf');
const _ = require('lodash');
const ora = require('ora');
const chalk = require('chalk');

const logger = require('src/service/logger.service');
const XmlBuilderUtils = require('src/utils/xml-builder.utils');
const ConfigProperties = require('src/config/config-properties');
const CommentUtils = require('src/utils/comment.utils');
const GeneratorUtils = require('src/utils/generator.utils');
const domainService = require('src/service/domain.service');
const CommonUtils = require('src/utils/common.utils');

class GenJavaService {
    constructor() {
        this.init();
    }

    init(){
        /** Get Library Version */
        this.LIB_VERSION = ConfigProperties.LIB_VERSION;

        /**
         * Setup Generation target directories
         */
        this.OUTPUT_TARGET_DIR = ConfigProperties.OUTPUT_TARGET_DIR_JAVA;
        this.OUTPUT_TARGET_REFRESH_DIR = ConfigProperties.OUTPUT_TARGET_DIR_JAVA_REFRESH;

        /**
         * Get Definition JSON
         */
        this.DEF_JSON_JAVA = ConfigProperties.DEF_JSON_JAVA;
        this.DEF_JSON_DOMAIN = ConfigProperties.DEF_JSON_DOMAIN;
        this.DEF_JSON_MAVEN = ConfigProperties.DEF_JSON_MAVEN;

        /**
         * Setup JAVA code SRC base directory
         */
        this.SRC_DIR_BASE = ConfigProperties.SRC_DIR_BASE_JAVA;
        this.DOMAIN_ROOT_DIR = ConfigProperties.DOMAIN_ROOT_DIR_JAVA;
        this.PACKAGE_ROOT = ConfigProperties.PACKAGE_ROOT_JAVA;

        this.INDENTATION = ConfigProperties.INDENTATION;

        this.SPINNER = new ora({spinner : 'dots'});

        this.reset();
    }

    async deleteGeneratedTarget() {
        await new Promise((resolve, reject) => {
                // logger.info(`Clearing target refresh directory : ${this.OUTPUT_TARGET_REFRESH_DIR}`);
                rimraf(this.OUTPUT_TARGET_REFRESH_DIR, () => resolve());
            }
        );
    }

    reset(){
        this.processedClass = 0;
    }

    async gen() {
        logger.infoFileOnly('===============================================');
        logger.infoFileOnly(`Creating Java Library - version: ${this.LIB_VERSION}`);

        const startTimer = new Date();

        this.SPINNER.start(`Preparing for Java Lib Generation ...`);

        await this.deleteGeneratedTarget();

        fs.mkdirSync(this.OUTPUT_TARGET_DIR, { recursive: true });
        fs.mkdirSync(this.DOMAIN_ROOT_DIR, { recursive: true });

        /** Generate POM */
        this.genPom(this.DEF_JSON_MAVEN);

        await this.processDomainDefinition(this.DEF_JSON_DOMAIN, this.PACKAGE_ROOT);

        const totalTime = CommonUtils.getTimeDiff(startTimer);

        logger.infoFileOnly(`All java lib generated [version: ${this.LIB_VERSION}]... `);
        this.SPINNER.succeed(`All ${chalk.cyan.underline.bold('JAVA')} lib files generated [${chalk.yellow.bold(totalTime + 's')}]`);

    }

    async processDomainDefinition(DEF, parentPackage){
        if (DEF == null) return;

        for (const [key, value] of Object.entries(DEF)) {
            const className = key;
            const type = value.type;
            const attributes = value.attributes;
            const properties = value.properties;

            const classType = properties ? properties.classType : undefined;
            const additDependencies = properties ? properties.dependencies : undefined;

            /**
             * Assume if type value not exists,
             * the object is categorized as a package
             */
            if (!type) {
                /** recursively create child packages / classes */
                await this.processDomainDefinition(value, `${parentPackage}.${key}`);
                continue;
            }

            /** If not an obj, skip the java class creation process */
            if (type !== 'obj') continue;

            const file = GeneratorUtils.getFileStream(className, parentPackage, this.SRC_DIR_BASE ,'.java');
            if (!file) throw `Failed to get Class File Stream : className[${className}], parentPackage[${parentPackage}]`;
            file.on('error', (err) => logger.error(`err: ${err}`));

            const processingFile = `${parentPackage}.${className}.java`;

            await new Promise(resolve => setTimeout(resolve, 1));
            this.SPINNER.text = 'Creating '
                + chalk.cyan.underline.bold('JAVA')
                + ` [${CommonUtils.getLoadPercentageStr(domainService.COUNT_CLASS, this.processedClass)}] `
                // + '[v.' + chalk.green(this.LIB_VERSION) + '] '
                + chalk.yellow(processingFile);
            logger.infoFileOnly(`Creating ${processingFile}`);

            this.processedClass++;

            // write package
            const packageStr = `package ${parentPackage};\n`;

            // write import
            /** Scan class annotations for dependency needed*/
            const annotateImportStrArr = this.getAnnotateImportStrArr(
                properties ? properties.annotate : undefined,
            );

            /** Scan for class extension dependency */
            /** Scan attribute class type for dependency needed*/
            const attributesDepArr = this.getAttributeImportStrArr(
                attributes
            );
            /** Scan for class extension or implement dependency */
            const classExtendsImplementsDepArr = this.getClassExtendsImplementsDepArr(properties);

            const classAdditDepArr = this.getClassAdditionalDepArr(additDependencies);

            /** Scan for additional dependencies */

            const importStrArr = _.union(
                annotateImportStrArr,
                attributesDepArr,
                classExtendsImplementsDepArr,
                classAdditDepArr,
            ).filter(importStr => {
                /** Remove import from the same package */
                const importPackageStr = importStr.replace('import ','').replace(/\.[A-Z]{1}.*/,'');
                return parentPackage !== importPackageStr;
            }).sort();
            if(!_.isEmpty(importStrArr)) importStrArr.push('');

            // write class description
            const classDescStrArr = this.getClassDescStrArr(
                properties ? properties.desc : undefined,
            );
            if(!_.isEmpty(classDescStrArr)) classDescStrArr.push('');

            // write class annotation
            const classAnnotateStrArr = this.getClassAnnotationStrArr(
                properties ? properties.annotate : undefined,
            );

            // write class declaration string
            const classDeclareStr = this.getClassDeclareStr(className, properties);

            // construct body
            // write serializable version UID
            const serialVerUIDArr = this.getSerialVersionUID(properties);
            if(!_.isEmpty(serialVerUIDArr)) serialVerUIDArr.push('');

            // write attribute
            const attributeDeclareStrArr = this.getAttributeDeclareStrArr(attributes, classType);
            const attributeDefaultMethodStrArr = this.getAttributeDefaultMethods(key, attributes, properties);

            // write functions
            const bodyStrArr = _.concat(
                    serialVerUIDArr,
                    attributeDeclareStrArr,
                    attributeDefaultMethodStrArr,
                )
                .map(s => s ? this.INDENTATION + s : '');

            const strArr = _.concat(
                packageStr,
                importStrArr,
                classDescStrArr,
                classAnnotateStrArr,
                [`${classDeclareStr} {\n`],
                bodyStrArr,
                ['}'],
            );
            strArr.forEach((str) => file.write(str + '\n'));

            file.end();

        }
    }

    /**
     * Generate the MAVEN POM file
     * @param {*} defJson
     */
    genPom(defJson) {
        const file = fs.createWriteStream(`${this.OUTPUT_TARGET_DIR}/pom.xml`);
        file.on('error', (err) => logger.error(err));
        const pomXml = XmlBuilderUtils.buildXmlFromJson(defJson);
        file.write(pomXml);
        file.end();
    }

    /**
     * Get the dependency of the given type
     * - Check Java definition
     * - Check domain definition
     * - Return undefined if no match
     * @param {*} type
     */
    getTypeDependency(type) {
        if (_.isEmpty(type)) return;
        /** Check Java Dependency */
        const javaDep = this.getDependencyFromJavaDef(type);
        if (javaDep) return javaDep;
        /** Check domain def dependency */
        const classDep = this.getClassDependency(type);
        if (classDep) return classDep;
    }

    /**
     * Get Java Definition Dependency
     * include special class, annotation
     * @param {*} type
     */
    getDependencyFromJavaDef(type) {
        // get java definition dependency map
        const javaDependencyMap = this.DEF_JSON_JAVA.dependencyMap;
        for (const [key, dependency] of Object.entries(javaDependencyMap)) {
            if (type == key) return dependency;
        }
    }

    /**
     * Get the annotation dependency from Java Definition
     * @param {*} annotate
     */
    getAnnotationDepFromJavaDef(annotation) {
        if (_.isEmpty(annotation)) return;
        return this.getDependencyFromJavaDef(`@${annotation}`);
    }

    /**
     * Get Annotation Import String Array
     * From Java Definition file
     * @param {*} annotateConfigs
     */
    getAnnotateImportStrArr(annotateConfigs) {
        if(_.isEmpty(annotateConfigs)) return [];

        let annotateImportStrArr = [];

        const updateAnnotateImportStrArrByStrAnnotate = (str) =>{
            const annotateDep = this.getAnnotationDepFromJavaDef(str);
            annotateImportStrArr = annotateDep
                ? _.union(annotateImportStrArr, [`import ${annotateDep};`])
                : annotateImportStrArr;
        };

        if(typeof annotateConfigs == 'string') {
            updateAnnotateImportStrArrByStrAnnotate(annotateConfigs);
        }
        else if(Array.isArray(annotateConfigs)) {
            annotateConfigs.forEach((annotation) => {
                if(typeof annotation == 'string') {
                    updateAnnotateImportStrArrByStrAnnotate(annotation);
                }
                else if(typeof annotation == 'object'){
                    const depArr = this.getAnnotationDepFromObjConfig(annotation);
                    annotateImportStrArr = _.union(annotateImportStrArr, depArr);
                }
            });
        }
        else if (typeof annotateConfigs == 'object'){
            const depArr = this.getAnnotationDepFromObjConfig(annotation);
            annotateImportStrArr = _.union(annotateImportStrArr, depArr);
        }

        return annotateImportStrArr;
    }

    /**
     * Get Annotation Dependencies from Object Configs
     * @param {*} objConfig
     */
    getAnnotationDepFromObjConfig(objConfig) {
        if(_.isEmpty(objConfig)) return [];
        let depArr = [];
        for(const annotateKey of Object.keys(objConfig)){
            const annotateDep = this.getAnnotationDepFromJavaDef(annotateKey);
            depArr = annotateDep ? _.union(depArr, [`import ${annotateDep};`]) : depArr;
        }
        return depArr;
    }

    /**
     * Get Class Dependency from Domain Definition
     * Recursively search for the matching class
     *
     */
    getClassDependency(className) {
        const classDep = domainService.getClassDependency(className);
        return classDep
            ? classDep.replace(ConfigProperties.PACKAGE_ROOT, this.PACKAGE_ROOT)
            : undefined;
    }

    /**
     * Get attribute dependency import string array
     * @param {*} attributeArr
     */
    getAttributeImportStrArr(attributeArr) {
        if (_.isEmpty(attributeArr)) return [];
        let attributesDepArr = [];

        for (const [attrKey, attrObj] of Object.entries(attributeArr)) {
            /** Search for import dependency for attribute type */
            const attrType = attrObj.type;
            const attrInjection = attrObj.injection;

            /** Get attribute type dependency */
            const attrTypeDep = this.getTypeDependency(attrType);
            attributesDepArr = _.union(attributesDepArr, (attrTypeDep ? [`import ${attrTypeDep};`] : []));

            /** Extra dependencies for Set / List */
            if(attrType == 'Set') {
                const hashSetDep = this.getTypeDependency('HashSet');
                attributesDepArr = _.union(attributesDepArr, (hashSetDep ? [`import ${hashSetDep};`] : []));
            } else if (attrType == 'List') {
                const arrayListDep = this.getTypeDependency('ArrayList');
                attributesDepArr = _.union(attributesDepArr, (arrayListDep ? [`import ${arrayListDep};`] : []));
            }

            /** Get attribute type injection dependency */
            if(!_.isEmpty(attrInjection)){
                if(typeof attrInjection == 'string') {
                    const attrInjectDep = this.getTypeDependency(attrInjection);
                    attributesDepArr = _.union(attributesDepArr, (attrInjectDep ? [`import ${attrInjectDep};`] : []));
                }
                if(Array.isArray(attrInjection)){
                    attrInjection.forEach(inject => {
                        const attrInjectDep = this.getTypeDependency(inject);
                        attributesDepArr = _.union(attributesDepArr, (attrInjectDep ? [`import ${attrInjectDep};`] : []));
                    });
                }
            }
            /**
             * Search for import dependency for attribute annotations
             * Support both array / string / object annotation config
             */
            const attrAnnotations = attrObj.annotate;
            if (typeof attrAnnotations == 'string') {
                const annotateDep = this.getAnnotationDepFromJavaDef(attrAnnotations);
                attributesDepArr = _.union(attributesDepArr, (annotateDep ? [`import ${annotateDep};`] : []));
            }
            else if(Array.isArray(attrAnnotations)){
                attrAnnotations.forEach(annotate => {
                    if(typeof annotate == 'string'){
                        const annotateDep = this.getAnnotationDepFromJavaDef(annotate);
                        attributesDepArr = _.union(attributesDepArr, (annotateDep ? [`import ${annotateDep};`] : []));
                    }else if(typeof annotate == 'object'){
                        const depArr = this.getAnnotationDepFromObjConfig(annotate);
                        attributesDepArr = _.union(attributesDepArr, depArr);
                    }
                });
            }
            else if (typeof attrAnnotations == 'object') {
                const depArr = this.getAnnotationDepFromObjConfig(attrAnnotations);
                attributesDepArr = _.union(attributesDepArr, depArr);
            }

        }
        attributesDepArr.sort();

        return attributesDepArr;
    }

    /**
     * Get Class extends / implements dependency
     * @param {*} extend
     * @param {*} implement
     */
    getClassExtendsImplementsDepArr(properties) {
        const extend = properties.extends;
        const implement = properties.implements;
        const injection = properties.injection;

        /** Extend dependency */
        const extendDepArr = this.getExtendDepArrFromExtendConfig(extend);
        /** Implement dependency */
        const implementDep = this.getTypeDependency(implement);
        const implementDepArr = implementDep ? [implementDep] : [];

        /** injection extend dependency */
        let injectDepArr = [];
        if(!_.isEmpty(injection)){

            if(typeof injection == 'string' ) {
                const injectDep = this.getTypeDependency(injection);
                injectDepArr = injectDep ? _.union(injectDepArr, [injectDep]) : injectDepArr;
            } else if (Array.isArray(injection)) {
                injection.forEach(injectItem => {
                    if (typeof injectItem == 'string') {
                        const injectDep = this.getTypeDependency(injection);
                        injectDepArr = injectDep ? _.union(injectDepArr, [injectDep]) : injectDepArr;
                    } else if (typeof injectItem == 'object') {
                        const depArr = this.getGenericClassInjectDepArrFromObjConfig(injectItem);
                        injectDepArr = _.union(injectDepArr, depArr);
                    }
                });
            } else if (typeof injection == 'object'){
                const depArr = this.getGenericClassInjectDepArrFromObjConfig(injection);
                injectDepArr = _.union(injectDepArr, depArr);
            }
        }

        return _.union(extendDepArr, implementDepArr, injectDepArr).map(
            (s) => `import ${s};`,
        );
    }

    /**
     * Get extension dependency
     * get the first extend dependency only
     * @param {*} extendConfig
     */
    getExtendDepArrFromExtendConfig(extendConfig) {
        if(_.isEmpty(extendConfig)) return ;
        if(typeof extendConfig == 'string'){
            const dep =  this.getTypeDependency(extendConfig);
            return dep ? [dep] : [];
        }
        if(Array.isArray(extendConfig) && extendConfig.length > 0){
            const firstConfig = extendConfig[0];
            return this.getExtendDepArrFromExtendConfig(firstConfig);
        }
        if(typeof extendConfig == 'object'){
            for(const [extendClass, extendObjConfig] of Object.entries(extendConfig)){
                const injection = extendObjConfig.injection;

                const extendClassDep = this.getExtendDepArrFromExtendConfig(extendClass);
                const injectDep = this.getExtendDepArrFromExtendConfig(injection);
                return _.union(extendClassDep, injectDep);
            }
        }
    }

    /**
     * Get Injection Dependency Array from object configuration
     * get all dependencies from the config extend
     * @param {*} objConfig
     */
    getGenericClassInjectDepArrFromObjConfig(objConfig) {
        let depArr = [];
        if(_.isEmpty(objConfig)) return depArr;
        for (const injectItemConfigs of Object.values(objConfig)) {
            const injectExtend = injectItemConfigs ? injectItemConfigs.extends : undefined;
            const injectExtendDep = this.getTypeDependency(injectExtend);
            depArr = injectExtendDep ? _.union(depArr, [injectExtendDep]) : depArr;
        }
        return depArr;
    }

    /**
     * Get class additional dependencies
     * @param {*} dependencies
     */
    getClassAdditionalDepArr(dependencies) {
        if(!Array.isArray(dependencies)) return [];

        const additDepImportStrArr = [];
        dependencies.forEach(dep => {
            const additDep = this.getTypeDependency(dep);
            if(additDep) additDepImportStrArr.push(`import ${additDep};`);
        });


        return additDepImportStrArr;
    }

    /**
     * Get class annotation string array
     *
     * Set value if defined in domain.json
     * if no default value set, set default value if exists
     * @param {*} annotateConfigs
     */
    getClassAnnotationStrArr(annotateConfigs) {
        if (_.isEmpty(annotateConfigs)) return [];

        const annotateStrArr = [];

        if(typeof annotateConfigs == 'string'){
            const defaultVal = this.getAnnotateDefaultValue(annotateConfigs);
            annotateStrArr.push(
                `@${annotateConfigs}${defaultVal ? `${defaultVal}` : ''}`,
            );
        } else if (Array.isArray(annotateConfigs)) {
            annotateConfigs.forEach((annotate) => {

                /** If pure string */
                if(typeof annotate == 'string') {
                    // search for the annotate default values in java definition json
                    const defaultVal = this.getAnnotateDefaultValue(annotate);
                    annotateStrArr.push(
                        `@${annotate}${defaultVal ? `${defaultVal}` : ''}`,
                    );
                }else if (typeof annotate == 'object'){
                    /** Each object field is an annotation */
                    for(const [annotateKey, annotateValConfigs] of Object.entries(annotate)){
                        /** Get Annotation Default value if not custom annotation configs  */
                        if(_.isEmpty(annotateValConfigs)) {
                            const defaultVal = this.getAnnotateDefaultValue(annotateKey);
                            annotateStrArr.push(
                                `@${annotateKey}${defaultVal ? `${defaultVal}` : ''}`,
                            );
                            continue;
                        }

                        if(typeof annotateValConfigs == 'object'){
                            const annotateValStr = this.getAnnotationValueStrFromObjConfig(annotateValConfigs);
                            annotateStrArr.push(
                                `@${annotateKey}${annotateValStr ? `${annotateValStr}` : ''}`,
                            );
                        }else if (typeof annotateValConfigs == 'string') {
                            annotateStrArr.push(
                                `@${annotateKey}${annotateValConfigs ? `(${annotateValConfigs})` : ''}`,
                            );
                        }

                    }
                }
            });
        }


        return annotateStrArr;
    }

    /**
     * Get Java annotation default value
     * Support pure string or object config
     * @param {*} annotation
     */
    getAnnotateDefaultValue(annotation) {
        if (!annotation) return;

        const annotateDefaultValueList = this.DEF_JSON_JAVA.annotateDefaultVal;

        if (_.isEmpty(annotateDefaultValueList)) return;

        for (const [key, val] of Object.entries(annotateDefaultValueList)) {
            if (key !== annotation) continue;

            if(typeof val == 'string') return `(${val})`;
            else if(typeof val == 'object') {
                return this.getAnnotationValueStrFromObjConfig(val);
            }
        }
    }

    /**
     * Get class Description String
     * @param {*} desc
     */
    getClassDescStrArr(desc, indentSpace) {
        return !indentSpace
            ? CommentUtils.getCommentBlockArr(desc)
            : CommentUtils.getCommentBlockArr(desc).map((s) => ` ${s}`);
    }

    /**
     * Get the string for declaring the class
     * @param {*} classType
     * @param {*} className
     * @param {*} extend
     */
    getClassDeclareStr(className, properties) {
        if (!className) return;

        const classType = properties ? properties.classType : undefined;
        const extend = properties ? properties.extends : undefined;
        const implement = properties ? properties.implements : undefined;
        const injection = properties ? properties.injection : undefined;

        let classDeclareStr = '';

        classDeclareStr += 'public ';

        switch (classType) {
            case 'ABSTRACT_CLASS':
                classDeclareStr += 'abstract class ';
                break;
            case 'ENUM':
                classDeclareStr += 'enum ';
                break;
            default:
                classDeclareStr += 'class ';
                break;
        }

        /**
         * Handle Class Name and generic class
         * support multi generic type and generic type extension
         */
        classDeclareStr += `${className}`;
        const classInjectionStr = this.getInjectionStr(injection);
        classDeclareStr += `${classInjectionStr? '<' + classInjectionStr + '>' : '' }`;

        classDeclareStr += this.getClassExtendStrFromConfig(extend);
        classDeclareStr += implement ? ` implements ${implement}` : '';

        return classDeclareStr;
    }

    /**
     * Get Class Extension String from extend config
     * for class declaration
     * only support single class extension
     * @param {*} extendConfig
     */
    getClassExtendStrFromConfig(extendConfig) {
        if(_.isEmpty(extendConfig)) return '';

        if(typeof extendConfig == 'string') return ` extends ${extendConfig}`;
        else {
            return this.getClassExtendStrFromObjConfig(extendConfig);
        }
    }

    /**
     * Get class extension string from extend config of
     * object type
     * only support single extension
     * @param {*} extendObjConfig
     */
    getClassExtendStrFromObjConfig(extendObjConfig){
        if(_.isEmpty(extendObjConfig) || typeof extendObjConfig != 'object' ) return '';

        /** handle array */
        if(Array.isArray(extendObjConfig) && extendObjConfig.length > 0) {
            const firstConfig = extendObjConfig;
            return this.getClassExtendStrFromObjConfig(firstConfig);
        }

        /** normal object */
        for(const [extendClass, extendConfig] of Object.entries(extendObjConfig)){
            let extendStr = ` extends ${extendClass}`;
            const injectStr = this.getInjectionStr(extendConfig.injection);
            return extendStr + (injectStr ? `<${injectStr}>` : '');
        }
    }

    /**
     * Check if the class extends / implements Serializable
     * @param {*} properties
     */
    getSerialVersionUID(properties) {
        const extend = properties ? properties.extends : undefined;
        const implement = properties ? properties.implements : undefined;
        /** Check if implements is Serializable */
        if(implement && implement == 'Serializable') {
            return ['private static final long serialVersionUID = 1L;'];
        }

        if(_.isEmpty(extend)) return [];

        /**
         * if extend exists,
         * recursively check the extend implements Serializable
         * support extend of string, array, object
         */
        let extendClassDef = '';
        if(typeof extend == 'string' ){
            extendClassDef = domainService.getClassDefJson(extend);
        } else if (Array.isArray(extend) && extend.length > 0){
            return this.getSerialVersionUID({
                "extends" : extend[0],
                "implements" : implement
            });
        } else if (typeof extend == 'object' ){
            for(const extendClass of Object.keys(extend)){
                extendClassDef = domainService.getClassDefJson(extendClass);
                break;
            }
        }

        if(_.isEmpty(extendClassDef)) throw `No class definition found for extension: ${extend}`;

        const extClassProperties = extendClassDef.properties;
        const subExtend = extClassProperties ? extClassProperties.extends : undefined;
        const subImplement = extClassProperties ? extClassProperties.implements : undefined;
        return this.getSerialVersionUID({
            "extends": subExtend,
            "implements": subImplement}
        );

    }

    /**
     * Get the string array for declaring attributes
     * @param {*} attributes
     */
    getAttributeDeclareStrArr(attributes, classType) {
        switch (classType) {
            case "ENUM":
                return this.getAttributeDeclareStrArrForEnum(attributes);
            default:
                return this.getAttributeDeclareStrArrForClass(attributes);
        }
    }

    /**
     * Get the string array for declaring enum attributes
     * @param {*} attributes
     */
    getAttributeDeclareStrArrForEnum(attributes) {
        if(_.isEmpty(attributes)) return [];

        const attributeDeclareStrArr = [];
        if(Array.isArray(attributes)) {
            attributes.forEach(attribute => {
                if(typeof attribute == 'string'){
                    /** String support */
                    attributeDeclareStrArr.push(`${attribute},`);
                }
                else if (typeof attribute == 'object') {
                    /**
                     * Object config support
                     * Support description
                     */
                    for(const [key, attributeConfigObj] of Object.entries(attribute)){
                        const descConfig = attributeConfigObj.desc;
                        const descCommentBlockArr = CommentUtils.getCommentBlockArr(descConfig);
                        descCommentBlockArr.forEach(s => attributeDeclareStrArr.push(s));
                        attributeDeclareStrArr.push(`${key},`);
                    }
                }
            });
        } else if (typeof attributes == 'object' ) {
            for (const [attributeKey, attributeConfigs] of Object.entries(attributes) ) {
                /** Get enum description */
                const descConfig = attributeConfigs.desc;
                if(!_.isEmpty(descConfig)){
                    const descCommentBlockArr = CommentUtils.getCommentBlockArr(descConfig);
                    descCommentBlockArr.forEach(s => attributeDeclareStrArr.push(s));
                }

                attributeDeclareStrArr.push(`${attributeKey},`);
            }
        }

        if(attributeDeclareStrArr.length > 0) {
            const lastIndex = attributeDeclareStrArr.length - 1;
            attributeDeclareStrArr[lastIndex] = attributeDeclareStrArr[lastIndex].replace(',',';\n');
        }
        return attributeDeclareStrArr;
    }

    /**
     * Get the string array for declaring class attributes
     * @param {*} attributes
     */
    getAttributeDeclareStrArrForClass(attributes) {
        if(_.isEmpty(attributes)) return [];

        const attributeDeclareStrArr = [];

        for(const [key, config] of Object.entries(attributes)){
            if(_.isEmpty(config)) continue;

            const type = config.type;
            const injection = config.injection;
            const desc = config.desc;
            const annotate = config.annotate;
            const defaultVal = config.default;
            const isStatic = config.isStatic;
            const isPublic = config.isPublic;
            const isConst = config.isConst;

            /** Attribute Description */
            if(desc) CommentUtils.getCommentBlockArr(desc).forEach(s => attributeDeclareStrArr.push(s));

            /**
             * Attribute Annotations
             *
             * array: support MULTIPLE string/object annotation
             * string: pure string annotation
             * object: support MULTIPLE annotation with values
             */
            if(Array.isArray(annotate)){
                annotate.forEach(a => {
                    if(typeof a == 'string'){
                        attributeDeclareStrArr.push(`@${a}`);
                    } else if(typeof a == 'object') {
                        for(const [annotateKey, annotateValConfigs] of Object.entries(a)){
                            if(typeof annotateValConfigs == 'object' ) {
                                const annotateValStr = this.getAnnotationValueStrFromObjConfig(annotateValConfigs);
                                attributeDeclareStrArr.push(`@${annotateKey}${annotateValStr}`);
                            } else if (typeof annotateValConfigs == 'string' ) {
                                attributeDeclareStrArr.push(`@${annotateKey}${annotateValConfigs?'('+annotateValConfigs+')' : ''}`);
                            }
                        }
                    }
                });
            } else if (typeof annotate == 'object') {
                for(const [annotateKey, annotateValConfigs] of Object.entries(annotate)){
                    if(typeof annotateValConfigs == 'object' ) {
                        const annotateValStr = this.getAnnotationValueStrFromObjConfig(annotateValConfigs);
                        attributeDeclareStrArr.push(`@${annotateKey}${annotateValStr}`);
                    } else if (typeof annotateValConfigs == 'string' ) {
                        attributeDeclareStrArr.push(`@${annotateKey}${annotateValConfigs?'('+annotateValConfigs+')' : ''}`);
                    }
                }
            } else if (typeof annotate == 'string') {
                attributeDeclareStrArr.push(`@${annotate}`);
            }

            /** Declare attribute */
            let declareStr = "";

            /**
             * Handle scope of attribute
             * Supports:
             * - private (Default) / public
             * - static
             * - final (constant)
             */

            /** private / public */
            declareStr += isPublic ? 'public ' : 'private ';
            declareStr += isStatic ? 'static ' : '';
            declareStr += isConst ? 'final ' : '';

            /** handle attribute type */
            declareStr += type;

            /**
             * Handle specific attribute type
             * Add injection if exists
             */
            const injectStr = this.getInjectionStr(injection);
            const injectedStr = injectStr ? `<${injectStr}>` : '';
            declareStr += `${injectedStr} ${key}`;


            /** Handle default value */
            switch (defaultVal) {
                case 'LOCAL_DATE_TIME_NOW':
                    declareStr += ' = LocalDateTime.now();';
                    break;
                default:
                    declareStr += defaultVal ? ` = ${defaultVal};` : ';';
                    break;
            }

            attributeDeclareStrArr.push(declareStr);

            attributeDeclareStrArr.push('');

        }

        return attributeDeclareStrArr;
    }

    /**
     * Get Injection String from Config
     * @param {*} injectionConfigs
     */
    getInjectionStr(injectionConfigs){
        if(_.isEmpty(injectionConfigs)) return "";

        if(typeof injectionConfigs == 'string') return injectionConfigs;

        const getInjectStringFromObjConfig = (injectionConfig => {
            let injectStr = "";
            for(const [injectType, injectConf] of Object.entries(injectionConfig)) {
                const injectExtend = injectConf.extends;
                injectStr += `${injectType}${injectExtend ? ' extends ' + injectExtend + ',' : '' }`;
            }
            return injectStr.replace(/,$/,'');
        });

        if(Array.isArray(injectionConfigs)){
            let injectStrFull = "";
            injectionConfigs.forEach(injectionConfig => {
                if(typeof injectionConfig == 'string' ){
                    injectStrFull += `${injectionConfig},`;
                } else if (typeof injectionConfig == 'object') {
                    const injectStr =  getInjectStringFromObjConfig(injectionConfig);
                    injectStrFull += injectStr ? `${injectStr},` : '';
                }
            });
            return injectStrFull.replace(/,$/,'');
        }
        else if (typeof injectionConfigs == 'object') {
            return getInjectStringFromObjConfig(injectionConfigs);
        }


        return "";
    }

    /**
     * Get the annotation value string from an object configuration
     * @param {*} annotateValConfigs
     */
    getAnnotationValueStrFromObjConfig(annotateValConfigs) {
        if(_.isEmpty(annotateValConfigs)) return "";

        let annotateValStr = "";
        for(const [annotateValKey, annotateVal] of Object.entries(annotateValConfigs)){
            if(annotateVal == null || annotateVal == undefined) continue;

            const valType = typeof annotateVal;
            /** Special case to handle ToStringSerializer.class */
            const isImportClassVal = /.class$/.test(annotateVal);

            annotateValStr += `${annotateValKey} = ${
                valType == 'string' && !isImportClassVal
                    ? '"'+ annotateVal + '"'
                    : annotateVal
            }, `;
        }

        if(annotateValStr) {
            annotateValStr = annotateValStr.replace(/, $/, '');
            annotateValStr = `(${annotateValStr})`;
        }
        return annotateValStr;
    }

    /**
     * Generate the default methods of the attributes
     * @param {*} attributes
     */
    getAttributeDefaultMethods(className, attributes, properties){
        if(_.isEmpty(attributes)) return [];

        /** Get Default method return type */
        let returnType = className;

        /**
         * check if class generic injection exists
         */
        const classInjectionConfigs = properties ? properties.injection : undefined;
        if(!_.isEmpty(classInjectionConfigs)){

            const getInjectStrFromObj = (objConfig) => {
                if(_.isEmpty(objConfig)) return '';
                let injectStr = '';
                for (const injectType of Object.keys(objConfig)){
                    injectStr += `${injectType},`;
                }
                return injectStr ? injectStr.replace(/,$/, '') : '';
            };

            if(typeof classInjectionConfigs == 'string'){
                returnType += `<${classInjectionConfigs}>`;
            }
            else if (Array.isArray(classInjectionConfigs)){
                let injectStrFull = '';
                classInjectionConfigs.forEach(injectConfig => {
                    const injectStr = getInjectStrFromObj(injectConfig);
                    injectStrFull += injectStr ? `${injectStr},` : '';
                });
                returnType += injectStrFull ? `<${injectStrFull.replace(/,$/,'')}>` : '';

            }
            else if (typeof classInjectionConfigs == 'object') {
                const injectStr = getInjectStrFromObj(classInjectionConfigs);
                returnType += injectStr ? `<${injectStr}>` : '' ;
            }
        }


        const attributeMthStrArr = [];

        for(const [key, config] of Object.entries(attributes)){
            if(_.isEmpty(config)) continue;
            const type = config.type;
            const isConst = config.isConst;

            if(!type || isConst) continue;

            const keyFirstCap = key.charAt(0).toUpperCase() + key.substring(1);
            const injection = config.injection;
            /**
             * Assume to be a single string extracted from an array with one object
             */
            const injectStr = this.getInjectionStr(injection);
            /** injected type surrounded with brackets */
            const injectedStr = injectStr ? `<${injectStr}>` : '';;
            /** injected class with first character lower case for paramter */
            const injectStrFirstLower = injectStr.charAt(0).toLowerCase() + injectStr.substring(1);

            if(type == 'Set' || type == 'List') {

                /** Setting Getter method */
                attributeMthStrArr.push(
                    `public ${returnType} ${key}(${type}${injectedStr} ${key}) {`,
                    `${this.INDENTATION}this.${key} = ${key};`,
                    `${this.INDENTATION}return this;`,
                    `}\n`
                );

                const newClassType = type == 'Set' ? 'HashSet' : 'ArrayList';

                /** Init List / Set method */
                attributeMthStrArr.push(
                    `public ${returnType} init${keyFirstCap}() {`,
                    `${this.INDENTATION}if( this.${key} == null ){`,
                    `${this.INDENTATION.repeat(2)}this.${key} = new ${newClassType}<>();`,
                    `${this.INDENTATION}}`,
                    `${this.INDENTATION}return this;`,
                    `}\n`
                );

                /** Add method */
                attributeMthStrArr.push(
                    `public ${returnType} add${keyFirstCap}(${injectStr} ${injectStrFirstLower}) {`,
                    `${this.INDENTATION}init${keyFirstCap}();`,
                    `${this.INDENTATION}this.${key}.add(${injectStrFirstLower});`,
                    `${this.INDENTATION}return this;`,
                    `}\n`
                );

                /** Remove method */
                attributeMthStrArr.push(
                    `public ${returnType} remove${keyFirstCap}(${injectStr} ${injectStrFirstLower}) {`,
                    `${this.INDENTATION}init${keyFirstCap}();`,
                    `${this.INDENTATION}this.${key}.remove(${injectStrFirstLower});`,
                    `${this.INDENTATION}return this;`,
                    `}\n`
                );


            } else {
                attributeMthStrArr.push(
                    `public ${returnType} ${key}(${type}${injectedStr} ${key}) {`,
                    `${this.INDENTATION}this.${key} = ${key};`,
                    `${this.INDENTATION}return this;`,
                    `}\n`
                );
            }


        }
        return attributeMthStrArr;
    }
}

module.exports = new GenJavaService();
