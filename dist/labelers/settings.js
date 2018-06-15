'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const labeler = function (env) {
    const SettingsView = window.require('settings-view/lib/settings-view');
    const labels = [];
    const panes = atom.workspace.getPaneItems()
        .filter(pane => pane instanceof SettingsView);
    console.log(panes);
    // for (const textEditor of atom.workspace.getPaneItems()) {
    //     if (!(textEditor instanceof TextEditor) || !textEditor.buffer) {
    //         continue;
    //     }
    //
    //     const keyLabel:string | undefined = env.keys.shift();
    //
    //     const label = new TabLabel();
    //     label.settings = env.settings;
    //     label.keyLabel = keyLabel;
    //     label.textEditor = textEditor;
    //     labels.push(label);
    // }
    return labels;
};
exports.default = labeler;
//# sourceMappingURL=settings.js.map