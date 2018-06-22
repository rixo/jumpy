'use babel';

import * as _ from 'lodash';
import { LabelEnvironment, Label, Labeler } from '../label-interface';
import { addJumpModeClasses } from '../viewHelpers';
import { Point, Range, TextEditor as TextEditorBase } from 'atom';

// reloads regex implem without having to restart Atom
const DEBUG_REGEX = false

interface TextEditor extends TextEditorBase {
  // accessing the private member directly because it is used in the
  // performance critical loop of displaying labels, and we don't
  // want to jumb through hoops to get the value from editor each time
  defaultCharWidth: number
  getVisibleRowRange(): [number, number]
}

const $$$ = fn => fn()

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

const selectLineWise = (editor: TextEditor, destination: Point) => {
  const selection = editor.getLastSelection()
  if (!selection) {
    return
  }
  const {start, end} = selection.getBufferRange()
  const isSingleLine = start.row === end.row - 1 && end.column === 0
  const origin = isSingleLine || !selection.isReversed() ? start : end
  const reversed = destination.row < origin.row
  if (reversed) {
    const range: [[number, number], [number, number]] =
      [[destination.row, 0], [origin.row, 0]]
    if (origin === start) {
      range[1][0]++
    }
    selection.setBufferRange(range, <any> {
      autoscroll: false,
      preserveFolds: true,
      reversed,
    })
  } else {
    const range: [Point, [number, number]] = [origin, [destination.row + 1, 0]]
    if (origin === end) {
      range[0] = Object.assign(origin.copy(), {
        row: origin.row - 1,
      })
    }
    selection.setBufferRange(range, <any> {
      autoscroll: false,
      preserveFolds: true,
      reversed,
    })
  }

  return fixColumn().catch(err => console.error(
    'Failed to fix vim-mode-plus linewise cursor', err
  ))

  // Well... This surely could be done more cleanly, but I
  // didn't find how vim-mode-plus manages to put the cursor
  // in the middle of the active selection (as opposed to one
  // of its end), without destroying said selection.
  //
  // What I've discovered however is that cursor position
  // reported by atom during visual linewise mode is not
  // correct, so vim surely uses some kind of curosr of its
  // own.
  //
  // FIXME Get help from vim-mode-plus, maybe?
  function fixColumn() {
    const editorEl = atom.views.getView(editor)
    const promises = []
    const dispatch = cmd => {
      const p = atom.commands.dispatch(editorEl, cmd)
      promises.push(p)
    }
    dispatch('vim-mode-plus:move-to-beginning-of-line')
    for (const char of String(destination.column + 1)) {
      dispatch(`vim-mode-plus:set-count-${char}`)
    }
    dispatch('vim-mode-plus:move-to-column')
    return Promise.all(promises)
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
          labels: {createLabel, addEditorLabel},
        }
      } = this;
      const labelElement = createLabel(keyLabel, settings)
      labelElement.classList.add('jumpy-label-editor') // For styling and tests
      addEditorLabel(textEditor, labelElement, lineNumber, column)
      this.element = labelElement;
      return this;
    }

    animateBeacon() {
        const position = new Point(this.lineNumber, this.column);
        const range = new Range(position, position);
        const marker = this.textEditor.markScreenRange(range, { invalidate: 'never' });
        const beacon = document.createElement('span');
        beacon.classList.add('jumpy-beacon'); // For styling and tests
        beacon.classList.add('jumpy-beacon-editor'); // For styling and tests
        const tx = this.textEditor.defaultCharWidth / 2;
        const ty = -this.textEditor.getLineHeightInPixels() / 2;
        beacon.style.transform = `translate(${tx}px, ${ty}px)`;
        this.textEditor.decorateMarker(marker, {
            item: beacon,
            type: 'overlay'
        });
        setTimeout(() => marker.destroy(), 150);
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

        const pane = atom.workspace.paneForItem(currentEditor);
        pane.activate();

        // isVisualMode is for vim-mode or vim-mode-plus:
        const isVisualMode = editorView.classList.contains('visual-mode');
        const position = new Point(this.lineNumber, this.column);
        if (isVisualMode) {
            const isLineWise = editorView.classList.contains('linewise');
            if (isLineWise) {
              selectLineWise(currentEditor, position)
                .catch(err => {
                  console.error('Failed to select linewise', err)
                })
            } else {
              selectVisualMode(currentEditor, position)
            }
        } else {
          // isSelected is for regular selection in atom or in insert-mode in vim
          const isSelected = currentEditor.getSelections().length === 1
            && currentEditor.getSelectedText() !== '';
          if (isSelected) {
            currentEditor.selectToScreenPosition(position);
          } else {
            currentEditor.setCursorScreenPosition(position);
          }
        }
    }
}

const getRegex = $$$(() => {
  interface Matcher {
    regex: RegExp
    adjustPosition: ((match: RegExpExecArray, label: WordLabel) => {}) | false
  }
  const regexFile = 'words-regex-match-all-the-things.js'
  const matchAllTheThings = require(`./${regexFile}`)
  const loadRegexDebug: () => Matcher = <any> DEBUG_REGEX && (() => {
    try {
      const fs = require('fs')
      const code = fs.readFileSync(`${__dirname}/${regexFile}`, 'utf8')
      return eval(code)
    } catch (err) {
      console.error(err)
      debugger
    }
  })
  return ({
    useBuiltInRegexMatchAllTheThings,
    wordsPattern,
  }: {
    useBuiltInRegexMatchAllTheThings: boolean,
    wordsPattern: RegExp,
  }): Matcher => {
    if (useBuiltInRegexMatchAllTheThings) {
      if (DEBUG_REGEX) {
        return loadRegexDebug()
      } else {
        return matchAllTheThings
      }
    } else {
      return {regex: wordsPattern, adjustPosition: false}
    }
  }
})

const labeler: Labeler = function(env:LabelEnvironment):Array<WordLabel> {
    const labels:Array<WordLabel> = [];
    const {regex, adjustPosition} = getRegex(env.settings);
    // reset the RegExp for subsequent calls.
    regex.lastIndex = 0;
    for (const textEditor of <Array<TextEditor>>atom.workspace.getTextEditors()) {
        const editorView = atom.views.getView(textEditor);

        // 'jumpy-jump-mode is for keymaps and utilized by tests
        addJumpModeClasses(editorView);

        const [ minColumn, maxColumn ] = getVisibleColumnRange(editorView);
        const rows = textEditor.getVisibleRowRange();

        if (!rows || !isVisible(editorView)) {
            continue;
        }

        const [ firstVisibleRow, lastVisibleRow ] = rows;
        // TODO: Right now there are issues with lastVisbleRow
        // rixo: what issues?
        for (const lineNumber of _.range(firstVisibleRow, lastVisibleRow) /*excludes end value*/) {
            if (textEditor.isFoldedAtScreenRow(lineNumber)) {
                const label = new WordLabel();
                label.env = env;
                label.textEditor = textEditor;
                label.lineNumber = lineNumber;
                label.column = 0;
                labels.push(label);
            } else {
                const lineContents = textEditor.lineTextForScreenRow(lineNumber);
                let word: any;
                while ((word = regex.exec(lineContents)) != null) {
                    const column = word.index;
                    // Do not do anything... markers etc.
                    // if the columns are out of bounds...
                    if (column > minColumn && column < maxColumn) {
                        const label = new WordLabel();
                        label.env = env;
                        label.textEditor = textEditor;
                        label.lineNumber = lineNumber;
                        label.column = column;
                        // support for corner cases that cannot be handled by
                        // regex alone
                        if (adjustPosition) {
                            labels.push(
                              ...adjustPosition(word, label)
                            )
                        } else {
                            labels.push(label);
                        }
                    }
                    // prevent infinite loop with, for example /^$/.test('')
                    if (lineContents.length === 0 || word[0].length === 0) {
                      break
                    }
                }
            }
        } // end: each line
    } // end: for each textEditor

    return labels;
}

export default labeler;
