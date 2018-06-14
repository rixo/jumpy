'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const viewHelpers_1 = require("../viewHelpers");
const atom_1 = require("atom");
function getVisibleColumnRange(editorView) {
    const charWidth = editorView.getDefaultCharacterWidth();
    // FYI: asserts:
    // numberOfVisibleColumns = editorView.getWidth() / charWidth
    const minColumn = (editorView.getScrollLeft() / charWidth) - 1;
    const maxColumn = editorView.getScrollRight() / charWidth;
    return [
        minColumn,
        maxColumn
    ];
}
// Taken from jQuery: https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}
// const isMajRe = /[A-Z]/
const majStart = 'A'.charCodeAt(0);
const majEnd = 'Z'.charCodeAt(0);
const isMaj = k => {
    const charCode = k.charCodeAt(0);
    return charCode >= majStart && charCode <= majEnd;
};
const createLabelElement = (textEditor, column, keyLabel, settings) => {
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
        span.style.width = `${Math.max(5, textEditor.defaultCharWidth - 1)}px`;
        if (isMaj(k)) {
            span.classList.add('uppercase');
        }
        labelElement.appendChild(span);
    }
    labelElement.style.left = `${textEditor.defaultCharWidth * column}px`;
    return labelElement;
};
const selectVisualMode = (editor, destination) => {
    const cursorPosition = editor.getCursorScreenPosition();
    const { row: cursorRow, column: cursorCol } = cursorPosition;
    const { row: targetRow, column: targetCol } = destination;
    const isJumpBefore = cursorRow > targetRow
        || cursorRow === targetRow && cursorCol > targetCol;
    const selection = editor.getLastSelection();
    if (!selection) {
        return;
    }
    const { start, end } = selection.getBufferRange();
    if (isJumpBefore) {
        if (selection.getText().length === 1) {
            editor.setSelectedScreenRange([destination, end], { reversed: true });
        }
        else if (selection.isReversed()) {
            editor.setSelectedScreenRange([destination, end], { reversed: true });
        }
        else {
            start.column++;
            editor.setSelectedScreenRange([destination, start], { reversed: true });
        }
    }
    else {
        if (selection.isReversed()) {
            end.column--;
            destination.column++;
            editor.setSelectedScreenRange([end, destination], { reversed: false });
        }
        else {
            destination.column++;
            editor.selectToScreenPosition(destination);
        }
    }
};
class WordLabel {
    destroy() {
        // this.marker.destroy();
    }
    drawLabel(addMarker) {
        const { textEditor, lineNumber, column, keyLabel } = this;
        const labelElement = createLabelElement(textEditor, column, keyLabel, this.settings);
        addMarker(textEditor, labelElement, lineNumber, column);
        this.element = labelElement;
        return this;
    }
    animateBeacon(input) {
        const position = input;
        const range = new atom_1.Range(position, position);
        const marker = this.textEditor.markScreenRange(range, { invalidate: 'never' });
        const beacon = document.createElement('span');
        beacon.classList.add('beacon'); // For styling and tests
        this.textEditor.decorateMarker(marker, {
            item: beacon,
            type: 'overlay'
        });
        setTimeout(function () {
            marker.destroy();
        }, 150);
    }
    jump() {
        const currentEditor = this.textEditor;
        const editorView = atom.views.getView(currentEditor);
        // TODO: pretty sure this can't be useful...anymore
        // I think it had somethign to do with the observers etc.
        // Prevent other editors from jumping cursors as well
        // TODO: make a test for this if return
        if (currentEditor.id !== this.textEditor.id) {
            return;
        }
        const pane = atom.workspace.paneForItem(currentEditor);
        pane.activate();
        // isVisualMode is for vim-mode or vim-mode-plus:
        const isVisualMode = editorView.classList.contains('visual-mode');
        // isSelected is for regular selection in atom or in insert-mode in vim
        const isSelected = (currentEditor.getSelections().length === 1 &&
            currentEditor.getSelectedText() !== '');
        const position = new atom_1.Point(this.lineNumber, this.column);
        if (isVisualMode) {
            selectVisualMode(currentEditor, position);
        }
        else if (isSelected) {
            currentEditor.selectToScreenPosition(position);
        }
        else {
            currentEditor.setCursorScreenPosition(position);
        }
        if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
            this.animateBeacon(position);
        }
    }
}
const labeler = function (env) {
    const labels = [];
    env.settings.wordsPattern.lastIndex = 0; // reset the RegExp for subsequent calls.
    for (const textEditor of atom.workspace.getTextEditors()) {
        const editorView = atom.views.getView(textEditor);
        // 'jumpy-jump-mode is for keymaps and utilized by tests
        viewHelpers_1.addJumpModeClasses(editorView);
        // current labels for current textEditor in loop.
        if (!env.keys.length) {
            continue;
        }
        const [minColumn, maxColumn] = getVisibleColumnRange(editorView);
        const rows = textEditor.getVisibleRowRange();
        if (!rows || !isVisible(editorView)) {
            continue;
        }
        const [firstVisibleRow, lastVisibleRow] = rows;
        // TODO: Right now there are issues with lastVisbleRow
        for (const lineNumber of _.range(firstVisibleRow, lastVisibleRow) /*excludes end value*/) {
            const lineContents = textEditor.lineTextForScreenRow(lineNumber);
            if (textEditor.isFoldedAtScreenRow(lineNumber)) {
                if (!env.keys.length) {
                    continue; // try continue?
                }
                const keyLabel = env.keys.shift();
                const label = new WordLabel();
                label.settings = env.settings;
                label.textEditor = textEditor;
                label.keyLabel = keyLabel;
                label.lineNumber = lineNumber;
                label.column = 0;
                labels.push(label);
            }
            else {
                let word;
                while ((word = env.settings.wordsPattern.exec(lineContents)) != null && env.keys.length) {
                    const keyLabel = env.keys.shift();
                    const column = word.index;
                    // Do not do anything... markers etc.
                    // if the columns are out of bounds...
                    if (column > minColumn && column < maxColumn) {
                        const label = new WordLabel();
                        label.settings = env.settings;
                        label.textEditor = textEditor;
                        label.keyLabel = keyLabel;
                        label.lineNumber = lineNumber;
                        label.column = column;
                        labels.push(label);
                    }
                    // prevent infinite loop with, for example /^$/.test('')
                    if (lineContents.length === 0) {
                        break;
                    }
                }
            }
        } // end: each line
    } // end: for each textEditor
    return labels;
};
exports.default = labeler;
//# sourceMappingURL=words.js.map