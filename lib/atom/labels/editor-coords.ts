'use babel'

import {TextEditor} from 'atom'

type TextEditorLocator = (row: number, col: number) => {
  left: string,
  top: string,
} | null

export type getCoordsInEditor = (
  editor: TextEditor,
  row: number,
  col: number,
) => {
  top: string,
  left: string,
} | null

const createTextEditorLocator = (editor: TextEditor): TextEditorLocator => {
  const editorEl = atom.views.getView(editor)
  const charWidth = editorEl.getBaseCharacterWidth()
  const lineRects: {[index: number]: {top: number, left: number}|null} = {}
  return (row: number, col: number) => {
    let lineRect = lineRects[row]
    if (lineRect === undefined) {
      const lineEl = editorEl.querySelector(
        `.line[data-screen-row="${row}"]`
      )
      lineRect = lineEl
        ? lineEl.getBoundingClientRect()
        : null
      lineRects[row] = lineRect
    }
    if (lineRect === null) {
      return null
    }
    const {top, left} = lineRect
    return {
      left: left + col * charWidth + 'px',
      top: top + 'px',
    }
  }
}

export const createTextEditorLocators = () => {
  const locators = {}
  return (editor: TextEditor, row: number, col: number) => {
    const id = editor.id
    let locator: TextEditorLocator = locators[id]
    if (!locator) {
      locator = createTextEditorLocator(editor)
      locators[id] = locator
    }
    return locator(row, col)
  }
}
