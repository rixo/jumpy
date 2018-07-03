'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_css_position_1 = require("./parse-css-position");
const animateBeacon = (label) => {
    let options;
    if (label.animateBeacon) {
        if (typeof label.animateBeacon === 'function') {
            const handler = label.animateBeacon;
            handler.call(label);
        }
        {
            options = label.animateBeacon;
        }
    }
    const { delay, cssClass } = options || {};
    const beacon = document.createElement('div');
    const { style, classList } = beacon;
    classList.add('jumpy-beacon');
    Object.assign(style, parse_css_position_1.default(label.labelPosition));
    if (cssClass) {
        classList.add(cssClass);
    }
    const display = () => {
        document.body.appendChild(beacon);
        setTimeout(() => beacon.remove(), 150);
    };
    if (delay === false) {
        display();
    }
    else {
        setTimeout(display, delay);
    }
};
exports.default = animateBeacon;
//# sourceMappingURL=animate-beacon.js.map