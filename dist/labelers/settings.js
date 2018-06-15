'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
let SettingsView = null;
try {
    SettingsView = window.require('settings-view/lib/settings-view');
}
catch (err) {
    // disable settings view support (maybe some warning?)
}
// wrap closure (for eye candies)
const $$$ = fn => fn();
class SettingsViewLabel {
    // no need to cleanup: our elements will be cleaned out
    // when the parent layer is removed
    destroy() { }
    drawLabel(addMarker) {
        const { keyLabel, settings, targetEl, targetSelectorOptions: selOpts } = this;
        this.element = util_1.createLabelElement(keyLabel, settings);
        const rect = targetEl.getBoundingClientRect();
        const pos = {};
        if (selOpts) {
            switch (selOpts) {
                case 'right':
                    pos.top = rect.top + 'px';
                    // TODO it should be possible to do that cleanly with
                    //      CSS right property
                    pos.left = (rect.right - 16) + 'px';
                    break;
                default:
                    throw new Error('Unsupported selector option: ' + selOpts);
            }
        }
        else {
            pos.top = rect.top + 'px';
            pos.left = rect.left + 'px';
        }
        addMarker(null, this.element, pos);
        return this;
    }
    // Animation not supported for now. Not high priority, what I
    // really want is fast and reactive, not necessarily pimps.
    animateBeacon() { }
    jump() {
        const { targetEl: el } = this;
        if (el.focus)
            el.focus();
        if (el.click)
            el.click();
    }
}
const labeler = $$$(() => {
    const isSettingsView = item => item instanceof SettingsView;
    const withPaneView = (pane) => {
        const view = atom.views.getView(pane);
        return { pane, view };
    };
    const isVisibleElement = element => {
        if (!element)
            return false;
        if (element.style.display === 'none')
            return false;
        if (element === document.body)
            return true;
        return isVisibleElement(element.parentElement);
    };
    const isVisibleView = ({ view }) => isVisibleElement(view);
    const createViewLabels = $$$(() => {
        // is visible, even partially
        const isInViewVisibleRect = view => {
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
        const createLabel = (env, paneItem, selectorOptions) => targetEl => {
            const label = new SettingsViewLabel();
            label.keyLabel = env.keys.shift();
            label.settings = env.settings;
            label.targetEl = targetEl;
            label.targetSelectorOptions = selectorOptions;
            label.settingsView = paneItem;
            return label;
        };
        return env => ({ pane, view }) => {
            const createSelectorLabels = selectorSpec => {
                const [selector, align] = selectorSpec.split('$');
                return Array.from(view.querySelectorAll(selector))
                    .filter(isVisibleElement)
                    .filter(isInViewVisibleRect(view))
                    .map(createLabel(env, pane, align));
            };
            const viewLabels = env.settings.settingsTargetSelectors
                .map(createSelectorLabels)
                .reduce(concatAll, []);
            return viewLabels;
        };
    });
    const concatAll = (a, b) => a.concat(b);
    return (env) => {
        if (!SettingsView) {
            return [];
        }
        const panes = atom.workspace.getPaneItems()
            .filter(isSettingsView)
            .map(withPaneView)
            .filter(isVisibleView);
        const labels = panes
            .map(createViewLabels(env))
            .reduce(concatAll, []);
        return labels;
    };
});
exports.default = labeler;
//# sourceMappingURL=settings.js.map