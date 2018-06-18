'use babel';

import * as _ from 'lodash';
import { LabelEnvironment, Label, Labeler } from '../label-interface';
import { addJumpModeClasses } from '../viewHelpers';
import { Point, Range, TextEditor as TextEditorBase } from 'atom';

interface TextEditor extends TextEditorBase {
  // accessing the private member directly because it is used in the
  // performance critical loop of displaying labels, and we don't
  // want to jumb through hoops to get the value from editor each time
  defaultCharWidth: number
  getVisibleRowRange(): [number, number]
}

function getVisibleColumnRange (editorView: any): Array<number> {
    const charWidth = editorView.getDefaultCharacterWidth()
    // FYI: asserts:
    // numberOfVisibleColumns = editorView.getWidth() / charWidth
    const minColumn = (editorView.getScrollLeft() / charWidth) - 1
    const maxColumn = editorView.getScrollRight() / charWidth

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
const majStart = 'A'.charCodeAt(0)
const majEnd = 'Z'.charCodeAt(0)
const isMaj = k => {
  const charCode = k.charCodeAt(0)
  return charCode >= majStart && charCode <= majEnd
}

const createLabelElement = (
  textEditor: TextEditor,
  keyLabel: string,
  settings: any,
) => {
  const labelElement = document.createElement('div');
  labelElement.style.fontSize = settings.fontSize;
  labelElement.classList.add('jumpy-label'); // For styling and tests
  if (settings.highContrast) {
     labelElement.classList.add('high-contrast');
  }
  for (const k of keyLabel) {
    const span = document.createElement('span')
    span.textContent = k
    span.classList.add('jumpy-key')
    // TODO:rixo clean marker with
    span.style.width = `${Math.max(5, textEditor.defaultCharWidth - 1)}px`
    if (isMaj(k)) {
      span.classList.add('uppercase')
    }
    labelElement.appendChild(span)
  }
  return labelElement
}

const selectVisualMode = (editor: TextEditor, destination: Point) => {
  const cursorPosition = editor.getCursorScreenPosition()
  const {row: cursorRow, column: cursorCol} = cursorPosition
  const {row: targetRow, column: targetCol} = destination
  const isJumpBefore = cursorRow > targetRow
    || cursorRow === targetRow && cursorCol > targetCol
  const selection = editor.getLastSelection()
  if (!selection) {
    return
  }
  const {start, end} = selection.getBufferRange()
  if (isJumpBefore) {
    if (selection.getText().length === 1) {
      editor.setSelectedScreenRange([destination, end], {reversed: true})
    } else if (selection.isReversed()) {
      editor.setSelectedScreenRange([destination, end], {reversed: true})
    } else {
      start.column++
      editor.setSelectedScreenRange([destination, start], {reversed: true})
    }
  } else {
    if (selection.isReversed()) {
      end.column--
      destination.column++
      editor.setSelectedScreenRange([end, destination], {reversed: false})
    } else {
      destination.column++
      editor.selectToScreenPosition(destination)
    }
  }
}

class WordLabel implements Label {
    // TODO: check I need these defined again?
    keyLabel: string | undefined;
    textEditor: TextEditor | null;
    element: HTMLElement | null;
    env: LabelEnvironment;

    // WordLabel specific:
    lineNumber: number;
    column: number;
    marker: any;

    destroy() {}

    drawLabel(): Label {
      const {
        textEditor,
        lineNumber,
        column,
        keyLabel,
        env: {
          settings,
          markers: {addEditorMarker},
        }
      } = this;
      const labelElement = createLabelElement(textEditor, keyLabel, settings)
      addEditorMarker(textEditor, labelElement, lineNumber, column)
      this.element = labelElement;
      return this;
    }

    animateBeacon(input: any) {
        const position = input;
        const range = new Range(position, position);
        const marker = this.textEditor.markScreenRange(range, { invalidate: 'never' });
        const beacon = document.createElement('span');
        beacon.classList.add('beacon'); // For styling and tests
        this.textEditor.decorateMarker(marker,
            {
                item: beacon,
                type: 'overlay'
            });
        setTimeout(function() {
            marker.destroy();
        } , 150);
    }

    jump() {
        const currentEditor = this.textEditor;
        const editorView = atom.views.getView(currentEditor);

        // Interop with cursor-history
        // cursor-history watches mouse events & dispatched commands.
        // However, our actual command (jumpy:toggle) does not actually
        // move the cursor; and cursor-history does not see the actual
        // jump, that is neither a command nor a mouse event...So, we
        // dispatch a bogus command just before moving cursor for interop.
        atom.commands.dispatch(editorView, 'jumpy:jump')

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
        const position = new Point(this.lineNumber, this.column);
        if (isVisualMode) {
            selectVisualMode(currentEditor, position)
        } else if (isSelected) {
            currentEditor.selectToScreenPosition(position);
        } else {
            currentEditor.setCursorScreenPosition(position);
        }

        if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
            this.animateBeacon(position);
        }
    }
}

const labeler: Labeler = function(env:LabelEnvironment):Array<WordLabel> {
    const labels:Array<WordLabel> = [];
    env.settings.wordsPattern.lastIndex = 0; // reset the RegExp for subsequent calls.
    for (const textEditor of <Array<TextEditor>>atom.workspace.getTextEditors()) {
        const editorView = atom.views.getView(textEditor);

        // 'jumpy-jump-mode is for keymaps and utilized by tests
        addJumpModeClasses(editorView);

        // current labels for current textEditor in loop.
        if (!env.keys.length) {
            continue;
        }

        const [ minColumn, maxColumn ] = getVisibleColumnRange(editorView);
        const rows = textEditor.getVisibleRowRange();

        if (!rows || !isVisible(editorView)) {
            continue;
        }

        const [ firstVisibleRow, lastVisibleRow ] = rows;
        // TODO: Right now there are issues with lastVisbleRow
        for (const lineNumber of _.range(firstVisibleRow, lastVisibleRow) /*excludes end value*/) {
            if (textEditor.isFoldedAtScreenRow(lineNumber)) {
                if (!env.keys.length) {
                    continue; // try continue?
                }

                const keyLabel = env.keys.shift();

                const label = new WordLabel();
                label.env = env;
                label.textEditor = textEditor;
                label.keyLabel = keyLabel;
                label.lineNumber = lineNumber;
                label.column = 0;
                labels.push(label);
            } else {
                const lineContents = textEditor.lineTextForScreenRow(lineNumber);
                let word: any;
                while ((word = env.settings.wordsPattern.exec(lineContents)) != null && env.keys.length) {
                    const keyLabel = env.keys.shift()

                    const column = word.index;
                    // Do not do anything... markers etc.
                    // if the columns are out of bounds...
                    if (column > minColumn && column < maxColumn) {
                        const label = new WordLabel();
                        label.env = env;
                        label.textEditor = textEditor;
                        label.keyLabel = keyLabel;
                        label.lineNumber = lineNumber;
                        label.column = column;
                        labels.push(label);
                    }
                    // prevent infinite loop with, for example /^$/.test('')
                    if (lineContents.length === 0) {
                      break
                    }
                }
            }
        } // end: each line
    } // end: for each textEditor

    return labels;
}

export default labeler;
