'use babel';

import { LabelEnvironment, Label, Labeler } from '../label-interface';
import { TextEditor, Pane } from 'atom';

let SettingsView
try {
  SettingsView = (<any> window).require('settings-view/lib/settings-view')
} catch (err) {
  // disable settings view support (maybe some warning?)
}

class TabLabel implements Label {
    // TODO: check I need these defined again?
    keyLabel: string | undefined;
    paneItem: object;
    element: HTMLElement | null;
    settings: any;
    selector: string;

    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }

    // TODO:rixo use addMarker
    drawLabel(): Label {
        const tabsPane:Pane = atom.workspace.paneForItem(this.paneItem);
        const tabsPaneElement:HTMLElement = atom.views.getView(tabsPane);
        const foundTab:HTMLElement | null = <HTMLElement>tabsPaneElement
          .querySelector(this.selector);

        if (!foundTab) {
            return this;
        }

        const labelElement:HTMLElement = document.createElement('div');
        if (this.keyLabel) {
            labelElement.textContent = this.keyLabel;
        }
        labelElement.style.position = 'fixed';
        labelElement.classList.add('jumpy-label'); // For styling and tests
        labelElement.classList.add('tab-label');
        labelElement.style.fontSize = this.settings.fontSize;

        if (this.settings.highContrast) {
           labelElement.classList.add('high-contrast');
        }

        this.element = labelElement;
        foundTab.appendChild(labelElement);

        return this;
    }

    // /!\ TODO this is UNMAINTAINED for now
    animateBeacon() {
        // TODO: abstract function to find tab!
        const tabsPane:Pane = atom.workspace.paneForItem(this.paneItem);
        const tabsPaneElement:HTMLElement = atom.views.getView(tabsPane);
        const foundTab:HTMLElement | null = <HTMLElement>tabsPaneElement
            .querySelector(this.selector);

        if (foundTab) {
            const beacon = document.createElement('span');
            beacon.style.position = 'relative';
            beacon.style.zIndex = '4';
            beacon.classList.add('beacon'); // For styling and tests
            beacon.classList.add('tab-beacon');

            foundTab.appendChild(beacon);
            setTimeout(function() {
                beacon.remove();
            }, 150);
        }
    }

    jump() {
        const pane = atom.workspace.paneForItem(this.paneItem);
        pane.activate();
        pane.activateItem(this.paneItem);
        if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
            this.animateBeacon();
        }
    }
}

const getPaneItemSelector = paneItem => {
  if (paneItem instanceof SettingsView) {
      return '[data-type="SettingsView"]'
  } else if (paneItem instanceof TextEditor) {
      return `[data-path="${paneItem.getPath()}"]`
  } else {
    return null
  }
}

const labeler: Labeler = function(env:LabelEnvironment):Array<TabLabel> {
    const labels:Array<TabLabel> = [];
    for (const paneItem of atom.workspace.getPaneItems()) {
        const selector = getPaneItemSelector(paneItem)
        if (selector === null) {
          continue
        }
        const label = new TabLabel();
        label.selector = getPaneItemSelector(paneItem)
        label.paneItem = paneItem
        label.settings = env.settings;
        labels.push(label);
    }
    return labels;
}

export default labeler;
