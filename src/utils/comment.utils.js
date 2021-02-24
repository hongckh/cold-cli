const config = require('config');
const _ = require('lodash');

const MAX_CHAR_PER_LINE = config.get('commentBlockMaxCharPerLine');

class CommentUtils {
    /**
     * Get comment block
     * Support string / array
     * @param {*} str
     */
    static getCommentBlockArr(comment) {
        if(Array.isArray(comment)) return this.getCommentBlockArrFromStrArr(comment);
        if(typeof comment == 'string') return this.getCommentBlockArrFromStr(comment);
        return [];
    }

    /**
     * Get comment block a single line of string
     * @param {*} str
     */
    static getCommentBlockArrFromStr(str) {
        if (!str) return [];

        if (str.length <= MAX_CHAR_PER_LINE) return [`/** ${str} */`];

        const splitRegex = new RegExp(`.{1,${MAX_CHAR_PER_LINE}}`, 'g');
        const splittedStrArr = str.match(splitRegex);
        if(!Array.isArray(splittedStrArr)) return [];
        const splittedStrCommentArr = [];
        splittedStrArr.forEach((s, index) => {
            const maxIndex = splittedStrArr.length - 1;
            if (index < maxIndex) {
                const nextStr = splittedStrArr[index+1];
                splittedStrCommentArr.push((
                    s.charAt(s.length - 1) !== ' '
                    && /[a-zA-Z]/.test(nextStr.charAt(0)))
                        ? ` * ${(s + '-').trim()}`
                        : ` * ${s.trim()}`);
            } else {
                splittedStrCommentArr.push(` * ${s.trim()}`);
            }
        });
        return _.concat(['/**'], splittedStrCommentArr, [' */']);
    }

    /**
     * Get comment block from an array of string
     * @param {*} strArr
     */
    static getCommentBlockArrFromStrArr(strArr) {
        if(!Array.isArray(strArr)) return [];

        const commentBlockStrArr = [];

        strArr.forEach(str => {
            if(str.length <= MAX_CHAR_PER_LINE ) {
                commentBlockStrArr.push(` * ${str}`);
                return;
            }

            const splitRegex = new RegExp(`.{1,${MAX_CHAR_PER_LINE}}`, 'g');
            const splittedStrArr = str.match(splitRegex);
            if(!Array.isArray(splittedStrArr)) return;

            splittedStrArr.forEach((s, index) => {
                const maxIndex = splittedStrArr.length - 1;
                if (index < maxIndex) {
                    const nextStr = splittedStrArr[index+1];
                    commentBlockStrArr.push((
                        s.charAt(s.length - 1) !== ' '
                        && /[a-zA-Z]/.test(nextStr.charAt(0)))
                            ? ` * ${(s + '-').trim()}`
                            : ` * ${s.trim()}`);
                } else {
                    commentBlockStrArr.push(` * ${s.trim()}`);
                }
            });
        });

        return commentBlockStrArr.length > 0
            ? _.concat(['/**'], commentBlockStrArr, [' */'])
            : [ '/** */' ];

    }


}

module.exports = CommentUtils;
