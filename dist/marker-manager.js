'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    // create maker layer element
    const layer = document.createElement('div');
    layer.classList.add('jumpy-layer');
    layer.classList.add('jumpy-layer-absolute');
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
    const cache = {};
    const getCoordsInEditor = (editor, row, col) => {
        const id = editor.id;
        if (!cache[id]) {
            const editorEl = atom.views.getView(editor);
            const charWidth = editorEl.getBaseCharacterWidth();
            cache[id] = {
                linesTop: {},
                lineRects: {},
                charWidth,
            };
        }
        const { charWidth, lineRects } = cache[id];
        if (lineRects[row] === undefined) {
            const editorEl = atom.views.getView(editor);
            const lineEl = editorEl.querySelector(`.line[data-screen-row="${row}"]`);
            lineRects[row] = lineEl
                ? lineEl.getBoundingClientRect()
                : null;
        }
        if (lineRects[row] === null) {
            return null;
        }
        return {
            left: lineRects[row].left + col * charWidth + 'px',
            top: lineRects[row].top + 'px',
        };
    };
    const addEditorMarker = (editor, element, lineNumber, column) => {
        const coords = getCoordsInEditor(editor, lineNumber, column);
        if (coords === null) {
            return;
        }
        addMarker(element, coords);
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