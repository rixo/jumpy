'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const util_1 = require("./util");
let SettingsView;
try {
    SettingsView = window.require('settings-view/lib/settings-view');
}
catch (err) {
    // disable settings view support (maybe some warning?)
}
class TabLabel {
    destroy() { }
    drawLabel() {
        const { keyLabel, targetEl, env: { settings, markers: { addMarker }, }, } = this;
        this.element = util_1.createLabelElement(keyLabel, settings);
        this.element.classList.add('tab-label');
        const rect = targetEl.getBoundingClientRect();
        addMarker(this.element, rect.left, rect.top);
        return this;
    }
    jump() {
        const pane = atom.workspace.paneForItem(this.paneItem);
        pane.activate();
        pane.activateItem(this.paneItem);
    }
    animateBeacon() {
        util_1.animateBeacon(this.element, 0);
    }
}
const getPaneItemSelector = paneItem => {
    if (paneItem instanceof SettingsView) {
        return '[data-type="SettingsView"] .title';
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
        const tabsPane = atom.workspace.paneForItem(paneItem);
        const tabsPaneElement = atom.views.getView(tabsPane);
        const foundTab = tabsPaneElement
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
};
exports.default = labeler;
//# sourceMappingURL=tabs.js.map