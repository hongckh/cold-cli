const config = require('config');
const _ = require('lodash');

const CommonUtils = require('src/utils/common.utils');

/**
 * Service for getting configuration definitions
 */
class ConfigProperties {

    constructor() {
        this.CONFIG_FILENAME = config.get('configFile');
    }

    /** Get coldConfig.json from directory */
    getConfigFileJsonFromDir(dir){
        if(_.isEmpty(dir ? dir.trim() : dir)) dir = '.';
        dir = dir.replace(/[\\/](1)$/, '');
        const configFile = `${dir}/${this.CONFIG_FILENAME}`;
        if(CommonUtils.isExistFile(configFile)){
            return CommonUtils.getJsonFromFile(configFile);
        } else {
            throw `No configuration file[${this.CONFIG_FILENAME}] found in directory: ${dir}`;
        }
    }

    /** Init the application config */
    initConfig(dir){

        this.CONFIG_JSON = this.getConfigFileJsonFromDir(dir);

        /** Get Library Version */
        this.LIB_VERSION = this.CONFIG_JSON.libVer;

        /**
         * Setup Generation target directories
         */
        this.OUTPUT_TARGET = this.CONFIG_JSON.target;
        this.OUTPUT_TARGET_DIR_BASE = this.OUTPUT_TARGET.baseDir;
        /** JAVA */
        this.OUTPUT_TARGET_DIR_JAVA = `${this.OUTPUT_TARGET_DIR_BASE}/${this.OUTPUT_TARGET.javaDir}`;
        this.OUTPUT_TARGET_DIR_JAVA_REFRESH = `${this.OUTPUT_TARGET_DIR_JAVA}/${this.OUTPUT_TARGET.javaRefreshDir}`;
        /** MONGOOSE */
        this.OUTPUT_TARGET_DIR_MONGOOSE = `${this.OUTPUT_TARGET_DIR_BASE}/${this.OUTPUT_TARGET.mongooseDir}`;
        this.OUTPUT_TARGET_DIR_MONGOOSE_REFRESH = `${this.OUTPUT_TARGET_DIR_MONGOOSE}/${this.OUTPUT_TARGET.mongooseRefreshDir}`;
        /** Javascript */
        this.OUTPUT_TARGET_DIR_JS = `${this.OUTPUT_TARGET_DIR_BASE}/${this.OUTPUT_TARGET.jsDir}`;
        this.OUTPUT_TARGET_DIR_JS_REFRESH = `${this.OUTPUT_TARGET_DIR_JS}/${this.OUTPUT_TARGET.jsRefreshDir}`;

        /**
         * Setup Definition Directories
         */
        this.DEFINITION_CONFIG = this.CONFIG_JSON.definition;
        this.DEFINITION_BASE_DIR = this.DEFINITION_CONFIG.baseDir;
        this.DEFINITION_DOMAIN_FILE = `${this.DEFINITION_BASE_DIR}/${this.DEFINITION_CONFIG.domain}`;
        this.DEFINITION_JAVA_FILE = `${this.DEFINITION_BASE_DIR}/${this.DEFINITION_CONFIG.java}`;
        this.DEFINITION_JS_FILE = `${this.DEFINITION_BASE_DIR}/${this.DEFINITION_CONFIG.javascript}`;
        this.DEFINITION_TS_FILE = `${this.DEFINITION_BASE_DIR}/${this.DEFINITION_CONFIG.typescript}`;

        /**
         * Get Definition JSON
         */
        this.DEF_JSON_DOMAIN = CommonUtils.getJsonFromFile(this.DEFINITION_DOMAIN_FILE);
        this.DEF_JSON_JAVA = CommonUtils.getJsonFromFile(this.DEFINITION_JAVA_FILE);
        this.DEF_JSON_MAVEN = this.DEF_JSON_JAVA.maven;
        this.DEF_JSON_JS = CommonUtils.getJsonFromFile(this.DEFINITION_JS_FILE);
        this.DEF_JSON_JS_DEPENDENCY_MAP = this.DEF_JSON_JS.dependencyMap;
        this.DEF_JSON_JS_PACKAGE_MONGOOSE = this.DEF_JSON_JS.packageMongoose;
        this.DEF_JSON_JS_PACKAGE_JAVASCRIPT = this.DEF_JSON_JS.packageJavascript;
        this.DEF_JSON_MONGOOSE_TYPE_MAP = this.DEF_JSON_JS.mongooseTypeMap;
        this.DEF_JSON_JAVASCRIPT_TYPE_MAP = this.DEF_JSON_JS.javascriptTypeMap;
        this.DEF_JSON_TS = CommonUtils.getJsonFromFile(this.DEFINITION_TS_FILE);
        this.DEF_JSON_TS_CONFIG = this.DEF_JSON_TS.tsconfig;

        /**
         * Setup Params
         */
        this.MAVEN_GROUP_ID = this.DEF_JSON_MAVEN.project.groupId;
        this.MAVEN_ARTIFACT_ID = this.DEF_JSON_MAVEN.project.artifactId;

        /**
         * Setup JAVA code SRC base directory
         */
        this.SRC_DIR_BASE_JAVA = `${this.OUTPUT_TARGET_DIR_JAVA}/src/main/java`;
        this.DOMAIN_ROOT_DIR_JAVA = `${this.SRC_DIR_BASE_JAVA}/${this.MAVEN_GROUP_ID.replace(/\./g,'/',)}/${this.MAVEN_ARTIFACT_ID.replace(/-/g, '')}/domain`;
        this.PACKAGE_ROOT = 'domain';
        this.PACKAGE_ROOT_JAVA = `${this.MAVEN_GROUP_ID}.${this.MAVEN_ARTIFACT_ID.replace(/-/g,'')}.domain`;

        /** Setup MONGOOSE code SRC base directory */
        this.SRC_DIR_BASE_MONGOOSE = `${this.OUTPUT_TARGET_DIR_MONGOOSE}/src`;
        this.DOMAIN_ROOT_DIR_MONGOOSE = `${this.SRC_DIR_BASE_MONGOOSE}/domain`;
        this.PACKAGE_ROOT_MONGOOSE = 'domain';

        /** Setup Javascript code SRC base directory */
        this.SRC_DIR_BASE_JS = `${this.OUTPUT_TARGET_DIR_JS}/src`;
        this.DOMAIN_ROOT_DIR_JS = `${this.SRC_DIR_BASE_JS}/domain`;
        this.PACKAGE_ROOT_JS = 'domain';

        /** Indentation */
        this.INDENTATION_MULTIPLIER = this.CONFIG_JSON.indentation ? this.CONFIG_JSON.indentation : config.get('indentation');
        this.INDENTATION = ' '.repeat(this.INDENTATION_MULTIPLIER);

        /** Comment block  */
        this.MAX_CHAR_PER_LINE = !_.isEmpty(this.CONFIG_JSON.commentBlockMaxCharPerLine) ? this.CONFIG_JSON.commentBlockMaxCharPerLine : config.get('commentBlockMaxCharPerLine');
    }

    /** Get library version */
    getLibVer() { return this.LIB_VERSION; }

}

module.exports = new ConfigProperties();