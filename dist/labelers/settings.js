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
    drawLabel() {
        const { keyLabel, targetEl, targetSelectorOptions: selOpts, env: { settings, markers: { addMarker }, }, } = this;
        this.element = util_1.createLabelElement(keyLabel, settings);
        const rect = targetEl.getBoundingClientRect();
        const pos = {};
        if (selOpts) {
            switch (selOpts) {
                case 'right':
                    pos.top = rect.top + 'px';
                    pos.right =
                        (document.body.getBoundingClientRect().right - rect.right) + 'px';
                    // // TODO it should be possible to do that cleanly with
                    // //      CSS right property
                    // pos.left = (rect.right - 16) + 'px'
                    break;
                default:
                    throw new Error('Unsupported selector option: ' + selOpts);
            }
        }
        else {
            pos.top = rect.top + 'px';
            pos.left = rect.left + 'px';
        }
        addMarker(this.element, pos);
        return this;
    }
    jump() {
        const jump = () => {
            const { targetEl: el } = this;
            if (el.focus)
                el.focus();
            if (el.click)
                el.click();
        };
        // give some time to the beacon to avoid having it lost to lag
        // due to changing setting "page"
        if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
            setTimeout(jump, 150);
        }
        else {
            jump();
        }
    }
    animateBeacon() {
        util_1.animateBeacon(this.targetEl);
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
                const height = top - bottom;
                // left & right partially visible components are OK
                return left < pRight
                    && right > pLeft
                    // but we don't want to overlap too much vertically, especially
                    // in the top because we don't want to overlap too much on tab
                    // bars => so we (arbitrarilly) accept targets 90% visible in the
                    // top, and 75% visible in the bottom
                    && top + .1 * height >= pTop
                    && bottom - .25 * height <= pBottom;
            };
        };
        const createLabel = (env, paneItem, selectorOptions) => targetEl => {
            const label = new SettingsViewLabel();
            label.env = env;
            label.targetEl = targetEl;
            label.targetSelectorOptions = selectorOptions;
            label.settingsView = paneItem;
            return label;
        };
        return env => ({ pane, view }) => {
            const createSelectorLabels = selectorSpec => {
                const [selector, align] = selectorSpec.split('$');
                const visibleEls = Array.from(view.querySelectorAll(selector))
                    .filter(isVisibleElement)
                    .filter(isInViewVisibleRect(view));
                return visibleEls
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