'use babel';
// import JumpyView from './jumpy-view';
module.exports = {
    jumpyView: null,
    config: {
        fontSize: {
            description: 'The font size of jumpy labels.',
            type: 'number',
            default: .75,
            minimum: 0,
            maximum: 1
        },
        highContrast: {
            description: 'This will display a high contrast label, \
            usually green.  It is dynamic per theme.',
            type: 'boolean',
            default: false
        },
        useHomingBeaconEffectOnJumps: {
            description: 'This will animate a short lived homing beacon upon \
            jump.',
            type: 'boolean',
            default: true
        },
        matchPattern: {
            description: 'Jumpy will create labels based on this pattern.',
            type: 'string',
            default: '([A-Z]+([0-9a-z])*)|[a-z0-9]{2,}'
        },
        customKeys: {
            description: 'Jumpy will use these characters in the specifed order to create labels (comma separated)',
            type: 'array',
            default: []
        }
    },
    activate(state) {
        // lazy load implementation
        const JumpyView = require('./jumpy-view').default;
        this.jumpyView = new JumpyView(state.jumpyViewState);
    },
    deactivate() {
        if (this.jumpyView) {
            this.jumpyView.destroy();
        }
        this.jumpyView = null;
    },
    serialize() {
        return {
            jumpyViewState: this.jumpyView.serialize()
        };
    },
    consumeToolbar(toolbar) {
        // TODO use status bar API
        this.statusBar = toolbar;
    },
    consumeVimModePlus(vim) {
        // lazy load optional vim-mode-plus integation
        const { setup } = require('./vim');
        setup(this, vim);
    }
};
//# sourceMappingURL=jumpy.js.map