'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const isMajRe = /[A-Z]/
const majStart = 'A'.charCodeAt(0);
const majEnd = 'Z'.charCodeAt(0);
exports.isMaj = k => {
    const charCode = k.charCodeAt(0);
    return charCode >= majStart && charCode <= majEnd;
};
exports.createLabelElement = (keyLabel, settings) => {
    const labelElement = document.createElement('div');
    labelElement.style.fontSize = settings.fontSize;
    labelElement.classList.add('jumpy-label'); // For styling and tests
    if (settings.highContrast) {
        labelElement.classList.add('high-contrast');
    }
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
    // labelElement.style.left = `${textEditor.defaultCharWidth * column}px`
    return labelElement;
};
//# sourceMappingURL=util.js.map