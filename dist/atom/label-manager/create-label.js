'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import {Config} from '../../config'
const majStart = 'A'.charCodeAt(0);
const majEnd = 'Z'.charCodeAt(0);
exports.isMaj = k => {
    const charCode = k.charCodeAt(0);
    return charCode >= majStart && charCode <= majEnd;
};
exports.default = (keyLabel) => {
    const labelElement = document.createElement('div');
    labelElement.classList.add('jumpy-label'); // For styling and tests
    for (const k of keyLabel) {
        const span = document.createElement('span');
        span.textContent = k;
        span.classList.add('jumpy-key');
        // span.style.width = `${Math.max(5, textEditor.defaultCharWidth - 1)}px`
        if (exports.isMaj(k)) {
            span.classList.add('uppercase');
        }
        labelElement.appendChild(span);
    }
    return labelElement;
};
//# sourceMappingURL=create-label.js.map