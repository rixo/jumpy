'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_css_position_1 = require("./parse-css-position");
exports.createLabelLayer = (settings) => {
    const element = createLayerElement(settings);
    const addLabel = createAddLabel(element);
    const render = () => document.body.appendChild(element);
    const destroy = () => element.remove();
    return {
        get element() { return element; },
        addLabel,
        render,
        destroy,
    };
};
const createLayerElement = (settings) => {
    const { theme, fontSize, allUppercase, hideMatchedChars, useEditorFontFamily, } = settings;
    const layer = document.createElement('div');
    const { classList, style } = layer;
    classList.add('jumpy-layer');
    classList.add(`jumpy-theme-${theme}`);
    if (allUppercase) {
        classList.add('jumpy-all-uppercase');
    }
    if (hideMatchedChars) {
        classList.add('jumpy-hide-matched-chars');
    }
    if (useEditorFontFamily) {
        style.fontFamily = atom.config.get('editor.fontFamily');
    }
    style.fontSize = fontSize;
    return layer;
};
const createAddLabel = (layerElement) => (label) => {
    const { labelPosition, element } = label;
    const cssPosition = parse_css_position_1.default(labelPosition);
    Object.assign(element.style, cssPosition);
    layerElement.appendChild(element);
};
//# sourceMappingURL=label-layer.js.map