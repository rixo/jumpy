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
exports.createTextEditorLocators = () => {
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
//# sourceMappingURL=editor-coords.js.map