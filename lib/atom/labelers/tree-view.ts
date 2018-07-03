'use babel'

import {
  Label,
  Labeler,
  LabelPosition,
  LabelEnvironment,
} from '../adapter-labels/label'

let TreeView = null
try {
  TreeView = (<any> window).require('tree-view/lib/tree-view')
} catch (err) {
  // disable tree view support (maybe some warning?)
}

// wrap closure (for eye candies)
const $$$ = fn => fn()

interface TreeView {
  isVisible(): boolean
}

class TreeViewLabel implements Label {
  keyLabel: string
  labelPosition: LabelPosition
  textEditor: null
  element: HTMLElement
  env: LabelEnvironment
  targetEl: HTMLElement
  treeView: any // TreeView
  treeViewEntry: any

  drawLabel() {
    const {
      keyLabel,
      targetEl,
      env: {
        labels: {createLabel},
      },
    } = this
    this.element = createLabel(keyLabel)
    const rect = targetEl.getBoundingClientRect()
    this.labelPosition = {
      x: rect.left,
      y: rect.top,
    }
  }

  jump() {
    const {
      treeView,
      treeViewEntry: entry,
      env: {
        settings: {treeViewAutoSelect},
      }
    } = this
    if (!entry) {
      throw new Error('Invalid label: missing "entry" property')
    }
    treeView.selectEntry(entry)
    if (treeViewAutoSelect) {
      treeView.openSelectedEntry()
    } else {
      treeView.focus()
    }
  }
}

const labeler: Labeler = $$$(() => {

  const isTreeView = pane => pane instanceof TreeView

  const isVisiblePane = (pane: TreeView) => pane.isVisible()

  const withPaneView = pane => {
    const view = atom.views.getView(pane)
    return {pane, view}
  }

  const hasView = ({view}) => !!view

  const createViewLabels = $$$(() => {
    // is visible, even partially
    const isVisibleIn = view => {
      const viewRect = view.getBoundingClientRect()
      return targetEl => {
        const {top: pTop, bottom: pBottom, left: pLeft, right: pRight} = viewRect
        const targetRect = targetEl.getBoundingClientRect()
        const {top, bottom, left, right} = targetRect
        return left <= pRight
          && right >= pLeft
          && top <= pBottom
          && bottom >= pTop
      }
    }

    const createLabel = (env, pane) => targetEl => {
      const label = new TreeViewLabel()
      label.env = env
      label.targetEl = targetEl
      label.treeViewEntry = targetEl.closest('.entry')
      label.treeView = pane
      return label
    }

    return env => ({pane, view}) => {
      const targets = view.querySelectorAll('[data-path]')
      const viewLabels = Array.from(targets)
        .filter(isVisibleIn(view))
        .map(createLabel(env, pane))
      return viewLabels
    }
  })

  const concatAll = (a, b) => a.concat(b)

  return (env:LabelEnvironment): Array<TreeViewLabel> => {
    if (!TreeView) {
      return []
    }

    const panes = <Array<TreeView>> atom.workspace.getPaneItems()
      .filter(isTreeView)
      .filter(isVisiblePane)

    const labels: Array<TreeViewLabel> = panes
      .map(withPaneView)
      .filter(hasView)
      .map(createViewLabels(env))
      .reduce(concatAll, [])

    return labels
  }
})

export default labeler
