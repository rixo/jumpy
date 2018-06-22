'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_label_1 = require("./label-manager/create-label");
const animate_beacon_1 = require("./label-manager/animate-beacon");
const $$$ = fn => fn();
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
const createTextEditorLocator = (editor) => {
    const editorEl = atom.views.getView(editor);
    const charWidth = editorEl.getBaseCharacterWidth();
    const lineRects = {};
    return (row, col) => {
        let lineRect = lineRects[row];
        if (lineRect === undefined) {
            const lineEl = editorEl.querySelector(`.line[data-screen-row="${row}"]`);
            lineRect = lineEl
                ? lineEl.getBoundingClientRect()
                : null;
            lineRects[row] = lineRect;
        }
        if (lineRect === null) {
            return null;
        }
        const { top, left } = lineRect;
        return {
            left: left + col * charWidth + 'px',
            top: top + 'px',
        };
    };
};
const createTextEditorLocatorMap = () => {
    const locators = {};
    return (editor, row, col) => {
        const id = editor.id;
        let locator = locators[id];
        if (!locator) {
            locator = createTextEditorLocator(editor);
            locators[id] = locator;
        }
        return locator(row, col);
    };
};
const createAddLabel = (layer) => (element, x, y) => {
    if (typeof x === 'object') {
        Object.assign(element.style, x);
    }
    else {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }
    layer.appendChild(element);
};
const createAddEditorLabel = (addLabel) => {
    const getCoordsInEditor = createTextEditorLocatorMap();
    return (editor, element, lineNumber, column) => {
        const coords = getCoordsInEditor(editor, lineNumber, column);
        if (coords !== null) {
            addLabel(element, coords);
        }
    };
};
exports.default = (settings) => {
    const layer = createLayerElement(settings);
    const addLabel = createAddLabel(layer);
    const addEditorLabel = createAddEditorLabel(addLabel);
    const render = () => document.body.appendChild(layer);
    const destroy = () => layer.remove();
    return {
        createLabel: create_label_1.default,
        animateBeacon: animate_beacon_1.default,
        addLabel,
        addEditorLabel,
        render,
        destroy,
    };
};
//# sourceMappingURL=label-manager.js.map