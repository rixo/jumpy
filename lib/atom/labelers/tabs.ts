'use babel';

import {Label, LabelPosition} from '../labels/label'
import {Labeler, LabelEnvironment} from '../labelers'
import {TextEditor, Pane} from 'atom'

// settings tab needs special CSS selectors
// FIXME Project Find Results (ctrl-shift-f) tab needs special selector too
let SettingsView
try {
  SettingsView = (<any> window).require('settings-view/lib/settings-view')
} catch (err) {
  // disable settings view support
  // TODO maybe some warning?
}

class TabLabel implements Label {
    // TODO: check I need these defined again?
    env: LabelEnvironment
    keyLabel: string | undefined
    labelPosition: LabelPosition
    targetEl: HTMLElement
    paneItem: object
    element: HTMLElement | null
    selector: string
    animateBeacon: {delay: number, cssClass: string}

    constructor() {
      this.animateBeacon = {
        // tab switching tends to lag quite a bit and hide animation
        delay: 60,
        cssClass: 'tab-beacon',
      }
    }

    drawLabel() {
        const {
            keyLabel,
            targetEl,
            env: {
                labels: {createLabel, addLabel},
            },
        } = this
        this.element = createLabel(keyLabel)
        this.element.classList.add('tab-label')
        const rect = targetEl.getBoundingClientRect()
        this.labelPosition = {
          x: rect.left,
          y: rect.top,
        }
        addLabel(this)
    }

    jump() {
        const pane = atom.workspace.paneForItem(this.paneItem)
        pane.activate()
        pane.activateItem(this.paneItem)
    }
}

const getPaneItemSelector = paneItem => {
  if (SettingsView && paneItem instanceof SettingsView) {
      return '[data-type="SettingsView"] .title'
  } else if (paneItem instanceof TextEditor) {
      return `[data-path="${paneItem.getPath()}"]`
  } else {
    return null
  }
}

const labeler: Labeler = function(env:LabelEnvironment):Array<TabLabel> {
    const labels:Array<TabLabel> = [];
    for (const paneItem of atom.workspace.getPaneItems()) {
        const selector = getPaneItemSelector(paneItem);
        if (selector === null) {
          continue;
        }
        const tabsPane:Pane = atom.workspace.paneForItem(paneItem);
        const tabsPaneElement:HTMLElement = atom.views.getView(tabsPane);
        const foundTab:HTMLElement | null = <HTMLElement>tabsPaneElement
          .querySelector(selector);
        if (!foundTab) {
          continue;
        }
        const label = new TabLabel();
        label.env = env;
        label.paneItem = paneItem;
        label.targetEl = foundTab;
        labels.push(label);
    }
    return labels;
}

export default labeler;
