path = require 'path'
{Views} = require 'atom'
Jumpy = require '../lib/jumpy'

NUM_ALPHA_TEST_WORDS = 26 * 3
NUM_ENGLISH_TEXT = 8 - 2 #For a's that are only 1 character.  *'s don't count.
NUM_COLLAPSIBLE_WORDS = 19
NUM_CAMEL_WORDS = 3
NUM_TOTAL_WORDS =
    NUM_ALPHA_TEST_WORDS +
    NUM_ENGLISH_TEXT +
    NUM_COLLAPSIBLE_WORDS +
    NUM_CAMEL_WORDS

NUM_CAMEL_SPECIFIC_MATCHES = 4 + 5 + 3

describe "Jumpy with non default settings on", ->
    [editorView, editor, jumpyPromise] = []

    beforeEach ->
        atom.views.getView(atom.workspace)
        atom.project.setPaths([path.join(__dirname, 'fixtures')])
        atom.config.set 'jumpy.highContrast', true
        atom.config.set 'jumpy.fontSize', .50
        atom.config.set 'jumpy.useHomingBeaconEffectOnJumps', false
        atom.config.set 'jumpy.matchPattern', '([\\w]){2,}' # old Jumpy default

        waitsForPromise ->
            atom.workspace.open 'test_text.md'

        runs ->
            atom.workspaceView.attachToDom()
            editorView = atom.workspaceView.getActiveView()
            editor = editorView.getEditor()
            jumpyPromise = atom.packages.activatePackage 'jumpy'
            editorView.trigger 'jumpy:toggle'

        waitsForPromise ->
            jumpyPromise

    describe "when the jumpy:toggle event is triggered", ->
        it "draws correctly colored labels", ->
            expect(editorView.find('.jumpy.label')[0].classList
                .contains 'high-contrast').toBe true
        it "draws labels of the right font size", ->
            expect(editorView.find('.jumpy.label')[0]
                .style.fontSize).toBe '50%'

    describe "when the jumpy:toggle event is triggered
        and a jump is performed", ->
        it "contains no beacon", ->
            editor.setCursorBufferPosition [1,1]
            expect(editorView.find('.cursors .cursor')[0].classList
                .contains 'beacon').toBe false
            editorView.trigger 'jumpy:a'
            editorView.trigger 'jumpy:c'
            expect(editorView.find('.cursors .cursor')[0].classList
                .contains 'beacon').toBe false

    describe "when a custom match (jumpy default) is used", ->
        it "draws correct labels", ->
            expect(editorView.find('.jumpy.labels')).toExist()
            labels = editorView.find('.jumpy.label')
            expect(labels.length)
                .toBe NUM_TOTAL_WORDS
            expect(labels[0].innerHTML).toBe 'aa'
            expect(labels[1].innerHTML).toBe 'ab'
            expect(labels[82].innerHTML).toBe 'de'
            expect(labels[83].innerHTML).toBe 'df'

    describe "when a custom match is used (camel case)", ->
        it "draws correct labels and jumps appropriately", ->
            editorView.trigger 'jumpy:clear'
            atom.config.set 'jumpy.matchPattern', '([A-Z]+([0-9a-z])*)|[a-z0-9]{2,}'
            editorView.trigger 'jumpy:toggle'
            expect(editorView.find('.jumpy.labels')).toExist()
            labels = editorView.find('.jumpy.label')
            expect(labels.length)
                .toBe NUM_TOTAL_WORDS + NUM_CAMEL_SPECIFIC_MATCHES
            # BASE CASE WORDS:
            expect(labels[0].innerHTML).toBe 'aa'
            expect(labels[1].innerHTML).toBe 'ab'
            expect(labels[82].innerHTML).toBe 'de'
            expect(labels[83].innerHTML).toBe 'df'

            #CAMELS:
            editorView.trigger 'jumpy:e'
            editorView.trigger 'jumpy:a'
            cursorPosition = editor.getCursorBufferPosition()
            expect(cursorPosition.row).toBe 30
            expect(cursorPosition.column).toBe 4

            #UNDERSCORES:
            editorView.trigger 'jumpy:toggle'
            editorView.trigger 'jumpy:e'
            editorView.trigger 'jumpy:l'
            cursorPosition = editor.getCursorBufferPosition()
            expect(cursorPosition.row).toBe 32
            expect(cursorPosition.column).toBe 5
