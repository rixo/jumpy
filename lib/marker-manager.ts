'use babel'

import {TextEditor} from 'atom'

export interface MarkerManager {
  addMarker: (
    element: HTMLElement,
    x: number | Object,
    y?: number,
  ) => void
  addEditorMarker: (
    editor: TextEditor,
    element: HTMLElement,
    row: number,
    col: number,
  ) => void,
  render: () => void,
  destroy: () => void,
}

type TextEditorLocator = (row: number, col: number) => ({
  left: string,
  top: string,
}) | null

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

export default (settings): MarkerManager => {
  const {
    theme,
    fontSize,
    allUppercase,
    hideMatchedChars,
    useEditorFontFamily,
  } = settings
  // create maker layer element
  const layer = document.createElement('div')
  const {classList, style} = layer
  classList.add('jumpy-layer')
  classList.add(`jumpy-theme-${theme}`)
  if (allUppercase) {
    classList.add('jumpy-all-uppercase')
  }
  if (hideMatchedChars) {
    classList.add('jumpy-hide-matched-chars')
  }
  if (useEditorFontFamily) {
    style.fontFamily = atom.config.get('editor.fontFamily')
  }
  style.fontSize = fontSize;

  const addMarker = (element: HTMLElement, x: number | Object, y?: number) => {
    if (typeof x === 'object') {
      Object.assign(element.style, x)
    } else {
      element.style.left = `${x}px`
      element.style.top = `${y}px`
    }
    layer.appendChild(element)
  }

  const locators = {}
  const getCoordsInEditor = (editor: TextEditor, row: number, col: number) => {
    const id = editor.id
    let locator: TextEditorLocator = locators[id]
    if (!locator) {
      locator = createTextEditorLocator(editor)
      locators[id] = locator
    }
    return locator(row, col)
  }
  const addEditorMarker = (
    editor: TextEditor,
    element: HTMLElement,
    lineNumber: number,
    column: number,
  ) => {
    const coords = getCoordsInEditor(editor, lineNumber, column)
    if (coords !== null) {
      addMarker(element, coords)
    }
  }

  const render = () => {
    document.body.appendChild(layer)
  }

  const destroy = () => {
    layer.remove()
  }

  return {
    render,
    destroy,
    addMarker,
    addEditorMarker,
  }
}
