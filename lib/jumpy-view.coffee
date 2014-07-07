{View} = require 'atom'
{$} = require 'atom'
_ = require 'lodash'

characters = (String.fromCharCode(a) for a in ['a'.charCodeAt()..'z'.charCodeAt()])
keys = []
for c1 in characters
  for c2 in characters
      keys.push c1 + c2

module.exports =
class JumpyView extends View
  @content: ->
    @div ''

  initialize: (serializeState) ->
    @pixels = @getAllPixelLocations()
    atom.workspaceView.command "jumpy:toggle", => @toggle()
    atom.workspaceView.command "jumpy:clear", => @clear()
    that = this
    for c in characters
      atom.workspaceView.command "jumpy:#{c}", (c) -> that.getKey(c)

  getKey: (character) ->
      character = character.type.charAt(character.type.length - 1)
      if not @firstChar
          @firstChar = character
      else if not @secondChar
          @secondChar = character

      if @secondChar
          @jump() # Jump first.  Currently need the placement of the labels.
          @clearJumpMode()

  clearKeys: ->
      @firstChar = null
      @secondChar = null

  clearJumpMode: ->
      @clearKeys()
      $('#status-bar-jumpy').html("")
      atom.workspaceView.find('.jumpy').remove()
      atom.workspaceView.eachEditorView (e) -> e.removeClass 'jumpy-specificity-1 jumpy-specificity-2 jumpy-jump-mode'
      @detach()

  jump: ->
      location = @findLocation()
      if location == null
          console.log "Jumpy canceled jump.  No location found."
          return
      editor = atom.workspace.getActivePaneItem()
      editor.setCursorBufferPosition(location)
      console.log "Jumpy jumped to: #{@firstChar}#{@secondChar} at (#{location})"

  findLocation: ->
      nearestMultiple = (val, base) ->
          Math.round(val / base) * base

      labelElement = atom.workspaceView.find(".jumpy.#{@firstChar}#{@secondChar}").get(0)
      return null unless labelElement

      labelLocation = labelElement.getBoundingClientRect()
      cursor = $('.editor .scroll-view .overlayer .cursor').get(0)
      nearestCursor =
          left: nearestMultiple(labelLocation.left, cursor.clientWidth)
          top: nearestMultiple(labelLocation.bottom - labelLocation.height, cursor.clientHeight)

      lines = atom.workspaceView.find('.lines')
      offsetTop = lines.get(0).offsetTop
      offsetLeft = $('.scroll-view').scrollLeft()
      scrollViewOffset = $('.editor .scroll-view').offset()
      for line, lineIndex in @pixels
          line = _.compact line
          for char, charIndex in line
              isAtLeft = (nearestCursor.left ==
                  nearestMultiple(char.left + scrollViewOffset.left - offsetLeft, cursor.clientWidth))
              isAtTop = (nearestCursor.top ==
                  nearestMultiple(char.top + scrollViewOffset.top + offsetTop, cursor.clientHeight))

              if isAtLeft && isAtTop
                  return [lineIndex, charIndex]

      return null

  getAllPixelLocations: ->
      pixels = []
      for line, lineIndex in atom.workspace.getActivePaneItem().buffer.lines
          pixels.push([])
          for char, charIndex in line
              pixelPosition = atom.workspaceView.getActiveView().pixelPositionForBufferPosition([lineIndex, charIndex])
              pixels[lineIndex][charIndex] = pixelPosition unless pixelPosition.left == 0 && pixelPosition.top == 0

      return pixels

  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    console.log 'Jumpy: "destroy" called. Detaching.'
    @clearJumpMode()
    @detach()

  toggle: ->
    $('#status-bar-jumpy').html("Jumpy: Jump Mode!")
    atom.workspaceView.eachEditorView (e) -> e.addClass 'jumpy-specificity-1 jumpy-specificity-2 jumpy-jump-mode'

    relevantClasses = ['variable', 'keyword', 'method', 'string.quoted']
    atom.workspaceView.find((".line .source .#{c}" for c in relevantClasses).join()).prepend('<div class="jumpy label"></div>')

    nextKeys = _.clone keys

    for label in atom.workspaceView.find(".jumpy.label")
        key = nextKeys.shift()
        $(label)
            .html(key)
            .addClass(key)

  clear: ->
      @clearJumpMode()
