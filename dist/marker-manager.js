'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = (settings) => {
    const { theme, fontSize, allUppercase, hideMatchedChars, useEditorFontFamily, } = settings;
    // create maker layer element
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
    const addMarker = (element, x, y) => {
        if (typeof x === 'object') {
            Object.assign(element.style, x);
        }
        else {
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        }
        layer.appendChild(element);
    };
    const locators = {};
    const getCoordsInEditor = (editor, row, col) => {
        const id = editor.id;
        let locator = locators[id];
        if (!locator) {
            locator = createTextEditorLocator(editor);
            locators[id] = locator;
        }
        return locator(row, col);
    };
    const addEditorMarker = (editor, element, lineNumber, column) => {
        const coords = getCoordsInEditor(editor, lineNumber, column);
        if (coords !== null) {
            addMarker(element, coords);
        }
    };
    const render = () => {
        document.body.appendChild(layer);
    };
    const destroy = () => {
        layer.remove();
    };
    return {
        render,
        destroy,
        addMarker,
        addEditorMarker,
    };
};
//# sourceMappingURL=marker-manager.js.map