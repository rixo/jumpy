'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const words_1 = require("./labelers/words");
const tabs_1 = require("./labelers/tabs");
const settings_1 = require("./labelers/settings");
const tree_view_1 = require("./labelers/tree-view");
const concatAll = (a, b) => a.concat(b);
exports.getLabels = (environment) => {
    const wordLabels = words_1.default(environment);
    const otherLabellers = [
        settings_1.default,
        tree_view_1.default,
        tabs_1.default,
    ];
    const otherLabels = otherLabellers
        .map(getLabels => getLabels(environment))
        .reduce(concatAll, []);
    const allLabels = [...wordLabels, ...otherLabels];
    return { wordLabels, otherLabels, allLabels };
};
//# sourceMappingURL=labelers.js.map