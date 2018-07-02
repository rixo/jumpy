"use strict";
/**
 * Dev helper that reloads the regex file each time jumpy is toggled, without
 * reloading the whole Atom environment. Feedback loop FTW!
 */
Object.defineProperty(exports, "__esModule", { value: true });
// reloads regex implem without having to restart Atom
const DEBUG_REGEX = false;
const $$$ = fn => fn();
exports.getRegex = $$$(() => {
    const regexFile = 'regex-match-all-the-things.js';
    const matchAllTheThings = require(`./${regexFile}`);
    const loadRegexDebug = DEBUG_REGEX && (() => {
        try {
            const fs = require('fs');
            const code = fs.readFileSync(`${__dirname}/${regexFile}`, 'utf8');
            return eval(code);
        }
        catch (err) {
            console.error(err);
            debugger;
        }
    });
    return ({ useBuiltInRegexMatchAllTheThings, wordsPattern, }) => {
        if (useBuiltInRegexMatchAllTheThings) {
            if (DEBUG_REGEX) {
                return loadRegexDebug();
            }
            else {
                return matchAllTheThings;
            }
        }
        else {
            return { regex: wordsPattern, adjustPosition: false };
        }
    };
});
exports.default = exports.getRegex;
//# sourceMappingURL=regex-match-all-the-things-dev-loader.js.map