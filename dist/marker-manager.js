'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// less precise is way faster... remain to see if it can be
// buggy in some cases
// TODO config maybe?
const USE_PRECISE_LOCATOR = false;
const createTextEditorLocatorDom = (editor) => {
    const editorEl = atom.views.getView(editor);
    const charWidth = editorEl.getBaseCharacterWidth();
    // const lineRects: {[index: number]: ClientRect|null} = {}
    const lineRects = {};
    return (row, col) => {
        if (lineRects[row] === undefined) {
            const lineEl = editorEl.querySelector(`.line[data-screen-row="${row}"]`);
            lineRects[row] = lineEl
                ? lineEl.getBoundingClientRect()
                : null;
        }
        const lineRect = lineRects[row];
        if (lineRect === null) {
            return null;
        }
        return {
            left: lineRect.left + col * charWidth + 'px',
            top: lineRect.top + 'px',
        };
    };
};
const createTextEditorLocatorLineHeight = (editor) => {
    const editorEl = atom.views.getView(editor);
    // This one is prefered because it is "documented" (it appears
    // in atom's d.ts)
    const charWidth = editorEl.getBaseCharacterWidth();
    // const charWidth = editor.getDefaultCharWidth()
    const linesEl = editorEl.querySelector('.lines');
    if (!linesEl) {
        throw new Error('Failed to find lines element (atom internals changed?)');
    }
    const linesRect = linesEl.getBoundingClientRect();
    const { left: linesLeft, top: linesTop } = linesRect;
    const lineHeight = editor.getLineHeightInPixels();
    return (row, col) => {
        return {
            left: linesLeft + col * charWidth + 'px',
            top: linesTop + row * lineHeight + 'px',
        };
    };
};
const createTextEditorLocator = USE_PRECISE_LOCATOR
    ? createTextEditorLocatorDom
    : createTextEditorLocatorLineHeight;
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
            locator[id] = locator;
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