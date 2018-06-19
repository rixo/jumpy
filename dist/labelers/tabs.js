'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
let SettingsView;
try {
    SettingsView = window.require('settings-view/lib/settings-view');
}
catch (err) {
    // disable settings view support (maybe some warning?)
}
class TabLabel {
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
    // TODO:rixo use addMarker
    drawLabel() {
        const tabsPane = atom.workspace.paneForItem(this.paneItem);
        const tabsPaneElement = atom.views.getView(tabsPane);
        const foundTab = tabsPaneElement
            .querySelector(this.selector);
        if (!foundTab) {
            return this;
        }
        const labelElement = document.createElement('div');
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
        const tabsPane = atom.workspace.paneForItem(this.paneItem);
        const tabsPaneElement = atom.views.getView(tabsPane);
        const foundTab = tabsPaneElement
            .querySelector(this.selector);
        if (foundTab) {
            const beacon = document.createElement('span');
            beacon.style.position = 'relative';
            beacon.style.zIndex = '4';
            beacon.classList.add('beacon'); // For styling and tests
            beacon.classList.add('tab-beacon');
            foundTab.appendChild(beacon);
            setTimeout(function () {
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
        return '[data-type="SettingsView"]';
    }
    else if (paneItem instanceof atom_1.TextEditor) {
        return `[data-path="${paneItem.getPath()}"]`;
    }
    else {
        return null;
    }
};
const labeler = function (env) {
    const labels = [];
    for (const paneItem of atom.workspace.getPaneItems()) {
        const selector = getPaneItemSelector(paneItem);
        if (selector === null) {
            continue;
        }
        const label = new TabLabel();
        label.selector = getPaneItemSelector(paneItem);
        label.paneItem = paneItem;
        label.settings = env.settings;
        labels.push(label);
    }
    return labels;
};
exports.default = labeler;
//# sourceMappingURL=tabs.js.map