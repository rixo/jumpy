'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
// settings tab needs special CSS selectors
let SettingsView;
try {
    SettingsView = window.require('settings-view/lib/settings-view');
}
catch (err) {
    // disable settings view support
    // TODO maybe some warning?
}
class TabLabel {
    constructor() {
        this.animateBeacon = {
            // tab switching tends to lag quite a bit and hide animation
            delay: 60,
            cssClass: 'tab-beacon',
        };
    }
    drawLabel() {
        const { keyLabel, targetEl, env: { labels: { createLabel, addLabel }, }, } = this;
        this.element = createLabel(keyLabel);
        this.element.classList.add('tab-label');
        const rect = targetEl.getBoundingClientRect();
        this.labelPosition = {
            x: rect.left,
            y: rect.top,
        };
        addLabel(this);
    }
    jump() {
        const pane = atom.workspace.paneForItem(this.paneItem);
        pane.activate();
        pane.activateItem(this.paneItem);
    }
}
const getPaneItemSelector = paneItem => {
    if (SettingsView && paneItem instanceof SettingsView) {
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