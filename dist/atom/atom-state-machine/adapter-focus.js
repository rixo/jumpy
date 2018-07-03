'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    focus: () => {
        const workspaceEl = atom.views.getView(atom.workspace);
        workspaceEl.classList.add('jumpy-jump-mode');
    },
    blur: () => {
        const workspaceEl = atom.views.getView(atom.workspace);
        workspaceEl.classList.remove('jumpy-jump-mode');
    },
});
//# sourceMappingURL=adapter-focus.js.map