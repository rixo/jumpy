'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let TreeView = null;
try {
    TreeView = window.require('tree-view/lib/tree-view');
}
catch (err) {
    // disable tree view support (maybe some warning?)
}
// wrap closure (for eye candies)
const $$$ = fn => fn();
class TreeViewLabel {
    drawLabel() {
        const { keyLabel, targetEl, env: { labels: { createLabel }, }, } = this;
        this.element = createLabel(keyLabel);
        const rect = targetEl.getBoundingClientRect();
        this.labelPosition = {
            x: rect.left,
            y: rect.top,
        };
    }
    jump({ ctrlKey = false } = {}) {
        const { treeView, treeViewEntry: entry, env: { settings, settings: { treeViewKeepFocus }, } } = this;
        if (!entry) {
            throw new Error('Invalid label: missing "entry" property');
        }
        treeView.selectEntry(entry);
        const autoSelect = parseAutoSelect(settings, ctrlKey);
        if (autoSelect) {
            const promise = treeView.openSelectedEntry();
            if (treeViewKeepFocus) {
                if (promise && promise.then) {
                    promise.then(() => {
                        treeView.focus();
                    });
                }
                else {
                    treeView.focus();
                }
            }
        }
        else {
            treeView.focus();
        }
    }
}
const parseAutoSelect = (settings, ctrlKey) => {
    const { treeViewAutoSelect, treeViewCtrlKey } = settings;
    if (ctrlKey && treeViewCtrlKey) {
        return !treeViewAutoSelect;
    }
    else {
        return treeViewAutoSelect;
    }
};
const labeler = $$$(() => {
    const isTreeView = pane => pane instanceof TreeView;
    const isVisiblePane = (pane) => pane.isVisible();
    const withPaneView = pane => {
        const view = atom.views.getView(pane);
        return { pane, view };
    };
    const hasView = ({ view }) => !!view;
    const createViewLabels = $$$(() => {
        // is visible, even partially
        const isVisibleIn = view => {
            const viewRect = view.getBoundingClientRect();
            return targetEl => {
                const { top: pTop, bottom: pBottom, left: pLeft, right: pRight } = viewRect;
                const targetRect = targetEl.getBoundingClientRect();
                const { top, bottom, left, right } = targetRect;
                return left <= pRight
                    && right >= pLeft
                    && top <= pBottom
                    && bottom >= pTop;
            };
        };
        const createLabel = (env, pane) => targetEl => {
            const label = new TreeViewLabel();
            label.env = env;
            label.targetEl = targetEl;
            label.treeViewEntry = targetEl.closest('.entry');
            label.treeView = pane;
            return label;
        };
        return env => ({ pane, view }) => {
            const targets = view.querySelectorAll('[data-path]');
            const viewLabels = Array.from(targets)
                .filter(isVisibleIn(view))
                .map(createLabel(env, pane));
            return viewLabels;
        };
    });
    const concatAll = (a, b) => a.concat(b);
    return (env) => {
        if (!TreeView) {
            return [];
        }
        const panes = atom.workspace.getPaneItems()
            .filter(isTreeView)
            .filter(isVisiblePane);
        const labels = panes
            .map(withPaneView)
            .filter(hasView)
            .map(createViewLabels(env))
            .reduce(concatAll, []);
        return labels;
    };
});
exports.default = labeler;
//# sourceMappingURL=tree-view.js.map