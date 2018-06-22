'use babel'

import {TextEditor} from 'atom'
import createLabel from './label-manager/create-label'
import animateBeacon from './label-manager/animate-beacon'

type addLabel = (
  labelElement: HTMLElement,
  xOrCssPositionObject: number | {
    top?: string,
    left?: string,
    bottom?: string,
    right?: string,
  },
  y?: number,
) => void

type addEditorLabel = (
  editor: TextEditor,
  labelElement: HTMLElement,
  // row:col, 0-based
  row: number,
  col: number,
) => void

export interface LabelManager {
  createLabel: (keyLabel: string, settings) => HTMLElement
  animateBeacon: (labelElement: HTMLElement, delay?: boolean|number) => void
  addLabel: addLabel
  addEditorLabel: addEditorLabel
  render: () => void
  destroy: () => void
}

type TextEditorLocator = (row: number, col: number) => ({
  left: string,
  top: string,
}) | null

const $$$ = fn => fn()

const createLayerElement = (settings) => {
  const {
    theme,
    fontSize,
    allUppercase,
    hideMatchedChars,
    useEditorFontFamily,
  } = settings
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
  return layer
}

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

const createTextEditorLocatorMap = () => {
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

const createAddLabel = (layer: HTMLElement): addLabel => (
  element: HTMLElement,
  x: number | Object,
  y?: number,
) => {
  if (typeof x === 'object') {
    Object.assign(element.style, x)
  } else {
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  }
  layer.appendChild(element)
}

const createAddEditorLabel = (addLabel: addLabel): addEditorLabel => {
  const getCoordsInEditor = createTextEditorLocatorMap()
  return (
    editor: TextEditor,
    element: HTMLElement,
    lineNumber: number,
    column: number,
  ) => {
    const coords = getCoordsInEditor(editor, lineNumber, column)
    if (coords !== null) {
      addLabel(element, coords)
    }
  }
}

export default (settings): LabelManager => {
  const layer = createLayerElement(settings)
  const addLabel = createAddLabel(layer)
  const addEditorLabel = createAddEditorLabel(addLabel)
  const render = () => document.body.appendChild(layer)
  const destroy = () => layer.remove()
  return {
    createLabel,
    animateBeacon,
    addLabel,
    addEditorLabel,
    render,
    destroy,
  }
}
