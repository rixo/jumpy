'use babel';

import { LabelEnvironment, Label, Labeler } from '../../label-interface';
import { TextEditor, Pane } from 'atom';

let SettingsView
try {
  SettingsView = (<any> window).require('settings-view/lib/settings-view')
} catch (err) {
  // disable settings view support (maybe some warning?)
}

class TabLabel implements Label {
    // TODO: check I need these defined again?
    env: LabelEnvironment
    keyLabel: string | undefined;
    targetEl: HTMLElement;
    paneItem: object;
    element: HTMLElement | null;
    settings: any;
    selector: string;

    destroy() {}

    drawLabel(): Label {
        const {
            keyLabel,
            targetEl,
            env: {
                settings,
                labels: {createLabel, addLabel},
            },
        } = this
        this.element = createLabel(keyLabel, settings)
        this.element.classList.add('tab-label')
        const rect = targetEl.getBoundingClientRect()
        addLabel(this.element, rect.left, rect.top)
        return this
    }

    jump() {
        const pane = atom.workspace.paneForItem(this.paneItem);
        pane.activate();
        pane.activateItem(this.paneItem);
    }

    animateBeacon() {
      this.env.labels.animateBeacon(this.element, 0)
    }
}

const getPaneItemSelector = paneItem => {
  if (paneItem instanceof SettingsView) {
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
