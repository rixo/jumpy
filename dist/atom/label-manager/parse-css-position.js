'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const px = num => `${num}px`;
const parseCssPosition = (arg) => {
    const { x, y } = arg, cssPosition = tslib_1.__rest(arg, ["x", "y"]);
    if (typeof x !== 'undefined') {
        return { left: px(x), top: px(y) };
    }
    else {
        return cssPosition;
    }
};
exports.default = parseCssPosition;
//# sourceMappingURL=parse-css-position.js.map