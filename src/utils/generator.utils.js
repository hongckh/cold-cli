const fs = require('fs');

class GeneratorUtils {

    /** Get File Stream */
    static getFileStream(fileName, packageName, srcDirBase , ext) {
        if(!fileName || !packageName) throw `Invalid fileName[${fileName}] / packageName[${packageName}] for class file creation`;

        const classDir = `${srcDirBase}/${packageName.replace(/\./g,'/')}`;
        fs.mkdirSync(classDir, { recursive: true });

        const file = `${classDir}/${fileName}${ext}`;

        // console.log(`packageName: ${packageName} || classDir: ${classDir} || file: ${classDir}/${fileName}${ext}`);
        return fs.createWriteStream(file);
    }
}

module.exports = GeneratorUtils;