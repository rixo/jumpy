'use babel'

import {
  LabelEnvironment,
  Label,
  LabelPosition,
  Labeler,
} from '../../label-interface'

// wrap closure (for eye candies)
const $$$ = fn => fn()

const getRight = rect =>
  (document.body.getBoundingClientRect().right - rect.right) + 'px'

class HtmlViewLabel implements Label {
  keyLabel: string
  labelPosition: LabelPosition
  // this.element is required for adding hot/irrelevant classes
  element: HTMLElement
  env: LabelEnvironment
  targetEl: HTMLElement
  attachEl: HTMLElement
  targetSelectorOptions: string
  settingsView: any

  // no need to cleanup: our elements will be cleaned out
  // when the parent layer is removed
  destroy() {}

  drawLabel(): void {
    const {
      keyLabel,
      targetEl,
      targetSelectorOptions: selOpts,
      env: {
        settings,
        labels: {createLabel},
      },
    } = this
    this.element = createLabel(keyLabel, settings)
    const rect = targetEl.getBoundingClientRect()
    const pos: {top?, left?, bottom?, right?} = {}
    if (selOpts) {
      switch (selOpts) {
        case 'right':
          pos.top = rect.top + 'px'
          pos.right = getRight(rect)
          break
        default:
          throw new Error('Unsupported selector option: ' + selOpts)
      }
    } else {
      pos.top = rect.top + 'px'
      pos.left = rect.left + 'px'
    }
    this.labelPosition = pos
  }

  jump() {
    const isEditor = el => !!el.closest('atom-text-editor')
    const jump = () => {
      const {targetEl: el} = this
      if (isEditor(el)) {
        el.click()
        el.focus()
      } else if (el.click) {
        el.click()
      } else if (el.focus) {
        el.focus()
      }
    }
    // give some time to the beacon to avoid having it lost to lag
    // due to changing setting "page"
    if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
      setTimeout(jump, 150)
    } else {
      jump()
    }
  }
}

export default ({viewClassFiles}) => {
  const ViewClasses = []
  try {
    viewClassFiles
      .map(source => (<any> window).require(source))
      .forEach(Class => ViewClasses.push(Class))
  } catch (err) {
    // disable settings view support (maybe some warning?)
  }

  const labeler: Labeler = $$$(() => {

    const isTrackedView = item => ViewClasses.some(View => item instanceof View)

    const withPaneView = (pane): {pane, view: HTMLElement} => {
      const view = atom.views.getView(pane)
      return {pane, view}
    }

    const isVisibleElement: any = element => {
      if (!element) return false
      if (element.style.display === 'none') return false
      if (element === document.body) return true
      return isVisibleElement(element.parentElement)
    }

    const isVisibleView: any = ({view}) => isVisibleElement(view)

    const createViewLabels = $$$(() => {
      // is visible, even partially
      const isInViewVisibleRect = view => {
        const viewRect = view.getBoundingClientRect()
        return targetEl => {
          const {top: pTop, bottom: pBottom, left: pLeft, right: pRight} = viewRect
          const targetRect = targetEl.getBoundingClientRect()
          const {top, bottom, left, right} = targetRect
          const height = top - bottom
          // left & right partially visible components are OK
          return left < pRight
            && right > pLeft
            // but we don't want to overlap too much vertically, especially
            // in the top because we don't want to overlap too much on tab
            // bars => so we (arbitrarilly) accept targets 90% visible in the
            // top, and 75% visible in the bottom
            && top + .1 * height >= pTop
            && bottom - .25 * height <= pBottom
        }
      }

      const createLabel = (env, paneItem, selectorOptions) => targetEl => {
        const label = new HtmlViewLabel()
        label.env = env
        label.targetEl = targetEl
        label.targetSelectorOptions = selectorOptions
        label.settingsView = paneItem
        return label
      }

      return env => ({pane, view}) => {
        const createSelectorLabels = selectorSpec => {
          const [selector, align] = selectorSpec.split('$')
          const visibleEls = Array.from(view.querySelectorAll(selector))
            .filter(isVisibleElement)
            .filter(isInViewVisibleRect(view))
          return visibleEls
            .map(createLabel(env, pane, align))
        }
        const viewLabels = env.settings.htmlTargetSelectors
          .map(createSelectorLabels)
          .reduce(concatAll, [])
        return viewLabels
      }
    })

    const concatAll = (a, b) => a.concat(b)

    return (env:LabelEnvironment): Array<HtmlViewLabel> => {
      if (!ViewClasses) {
        return []
      }
      const getItem = pane => pane.getItem()
      const panes = [
        ...atom.workspace.getPaneItems(),
        ...atom.workspace.getBottomPanels().map(getItem),
      ]
        .filter(isTrackedView)
        .map(withPaneView)
        .filter(isVisibleView)
      const labels: Array<HtmlViewLabel> = panes
        .map(createViewLabels(env))
        .reduce(concatAll, [])
      return labels
    }
  })

  return labeler
}
