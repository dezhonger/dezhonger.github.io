(function () {
  const toolkit = window.CodeCommentToolkit

  if (!toolkit) {
    return
  }

  const refs = {
    diffEditor: document.getElementById('diff-editor'),
    btnExample: document.getElementById('example-btn'),
    btnSwap: document.getElementById('swap-btn'),
    btnClear: document.getElementById('clear-btn'),
    btnCopy: document.getElementById('copy-btn'),
    copyStatus: document.getElementById('copy-status'),
    errorStatus: document.getElementById('error-status'),
  }

  const state = {
    monaco: null,
    diffEditor: null,
    originalModel: null,
    modifiedModel: null,
    timer: null,
    visibilityCheckTimer: null,
  }

  function setStatus(kind, message) {
    const target = kind === 'success' ? refs.copyStatus : refs.errorStatus
    const other = kind === 'success' ? refs.errorStatus : refs.copyStatus
    other.hidden = true
    other.textContent = ''
    target.hidden = !message
    target.textContent = message || ''
  }

  function clearTransientStatus() {
    setStatus('success', '')
    setStatus('error', '')
  }

  function initDiffEditor(monaco) {
    state.monaco = monaco
    if (typeof monaco.editor.defineTheme === 'function') {
      monaco.editor.defineTheme('tool-light-diff', {
        base: 'vs',
        inherit: true,
        rules: [{ token: '', foreground: '111111' }],
        colors: {
          'editor.foreground': '#111111',
          'editor.background': '#ffffff',
          'diffEditor.insertedTextBackground': '#e6ffed',
          'diffEditor.removedTextBackground': '#ffeef0',
        },
      })
    }
    state.originalModel = monaco.editor.createModel('', 'plaintext')
    state.modifiedModel = monaco.editor.createModel('', 'plaintext')

    state.diffEditor = monaco.editor.createDiffEditor(refs.diffEditor, {
      automaticLayout: true,
      readOnly: false,
      wordWrap: 'on',
      originalEditable: true,
      minimap: { enabled: false },
      theme: 'tool-light-diff',
    })

    state.diffEditor.setModel({
      original: state.originalModel,
      modified: state.modifiedModel,
    })
    enforceEditableState()
    bindEditorFocusRouting()

    applySessionPayload()
    ensureEditorLayout()
    window.setTimeout(ensureEditorLayout, 80)
    window.setTimeout(ensureEditorLayout, 260)
    window.setTimeout(ensureEditorLayout, 800)
    scheduleVisibilityCheck()
  }

  function forceEditorWritable(editor) {
    if (!editor || typeof editor.updateOptions !== 'function') return
    editor.updateOptions({
      readOnly: false,
      domReadOnly: false,
      cursorBlinking: 'blink',
    })
  }

  function enforceEditableState() {
    if (!state.monaco) return

    // Primary instance created by this page.
    if (state.diffEditor && typeof state.diffEditor.updateOptions === 'function') {
      state.diffEditor.updateOptions({
        readOnly: false,
        originalEditable: true,
      })
      forceEditorWritable(state.diffEditor.getOriginalEditor && state.diffEditor.getOriginalEditor())
      forceEditorWritable(state.diffEditor.getModifiedEditor && state.diffEditor.getModifiedEditor())
    }

    // Fallback: enforce on all diff editors in case browser restored stale editor state.
    const allDiffEditors =
      state.monaco.editor && typeof state.monaco.editor.getDiffEditors === 'function'
        ? state.monaco.editor.getDiffEditors()
        : []

    allDiffEditors.forEach(function (diffEditor) {
      if (!diffEditor || typeof diffEditor.updateOptions !== 'function') return
      diffEditor.updateOptions({
        readOnly: false,
        originalEditable: true,
      })
      forceEditorWritable(diffEditor.getOriginalEditor && diffEditor.getOriginalEditor())
      forceEditorWritable(diffEditor.getModifiedEditor && diffEditor.getModifiedEditor())
    })

  }

  function bindEditorFocusRouting() {
    if (!state.diffEditor || !refs.diffEditor) return
    const originalEditor =
      typeof state.diffEditor.getOriginalEditor === 'function'
        ? state.diffEditor.getOriginalEditor()
        : null
    const modifiedEditor =
      typeof state.diffEditor.getModifiedEditor === 'function'
        ? state.diffEditor.getModifiedEditor()
        : null

    refs.diffEditor.addEventListener('mousedown', function (event) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.original-in-monaco-diff-editor') && originalEditor && typeof originalEditor.focus === 'function') {
        originalEditor.focus()
      } else if (
        target.closest('.modified-in-monaco-diff-editor') &&
        modifiedEditor &&
        typeof modifiedEditor.focus === 'function'
      ) {
        modifiedEditor.focus()
      }
    })
  }

  function ensureEditorLayout() {
    if (!state.diffEditor || !refs.diffEditor) return
    const rect = refs.diffEditor.getBoundingClientRect()
    const width = Math.max(320, Math.floor(rect.width || refs.diffEditor.clientWidth || 0))
    const height = Math.max(360, Math.floor(rect.height || refs.diffEditor.clientHeight || 0))
    if (!width || !height) return
    state.diffEditor.layout({ width: width, height: height })
  }

  function shouldEnableVisibilityFallback() {
    const token = refs.diffEditor.querySelector('.monaco-editor .view-line span')
    if (!token) return false
    const style = window.getComputedStyle(token)
    if (style.display === 'none' || style.visibility === 'hidden') return true
    if (Number(style.opacity || '1') < 0.2) return true
    const fill = style.webkitTextFillColor || ''
    if (fill === 'transparent' || fill === 'rgba(0, 0, 0, 0)') return true
    if (style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)') return true
    if (style.mixBlendMode && style.mixBlendMode !== 'normal') return true
    return false
  }

  function applyVisibilityFallbackIfNeeded() {
    if (!refs.diffEditor) return
    if (shouldEnableVisibilityFallback()) {
      refs.diffEditor.classList.add('monaco-visibility-fallback')
      setStatus('error', '检测到浏览器渲染冲突，已启用可见性兼容模式')
      return
    }
    refs.diffEditor.classList.remove('monaco-visibility-fallback')
  }

  function scheduleVisibilityCheck() {
    if (state.visibilityCheckTimer) {
      window.clearTimeout(state.visibilityCheckTimer)
    }
    state.visibilityCheckTimer = window.setTimeout(function () {
      enforceEditableState()
      ensureEditorLayout()
      applyVisibilityFallbackIfNeeded()
    }, 120)
  }

  function fillExample() {
    if (!state.originalModel || !state.modifiedModel) return
    const left = [
      '解答算法题:',
      'Input',
      '第一行包含一个整数 n。',
      '第二行包含 n 个整数 a[i]。',
      '',
      '输出所有数的和。',
    ].join('\n')

    const right = [
      '解答算法题:',
      'Input',
      '第一行包含一个整数 n (1 ≤ n ≤ 2e5)。',
      '第二行包含 n 个整数 a[i]。',
      '',
      '请输出所有数的和（使用 64 位整数类型）。',
    ].join('\n')

    state.originalModel.setValue(left)
    state.modifiedModel.setValue(right)
  }

  function swapText() {
    if (!state.originalModel || !state.modifiedModel) return
    const left = state.originalModel.getValue()
    const right = state.modifiedModel.getValue()
    state.originalModel.setValue(right)
    state.modifiedModel.setValue(left)
  }

  function clearAll() {
    if (!state.originalModel || !state.modifiedModel) return
    state.originalModel.setValue('')
    state.modifiedModel.setValue('')
    clearTransientStatus()
  }

  function applySessionPayload() {
    if (!state.originalModel || !state.modifiedModel) return
    const payload = toolkit.consumeDiffPayload()
    if (!payload) return
    state.originalModel.setValue(payload.original || '')
    state.modifiedModel.setValue(payload.modified || '')
    scheduleVisibilityCheck()
  }

  function copyModified() {
    if (!state.modifiedModel) return
    const text = state.modifiedModel.getValue()
    if (!text) return
    navigator.clipboard
      .writeText(text)
      .then(function () {
        setStatus('success', '已复制右侧文本')
        if (state.timer) {
          window.clearTimeout(state.timer)
        }
        state.timer = window.setTimeout(function () {
          setStatus('success', '')
        }, 2000)
      })
      .catch(function () {
        setStatus('error', '复制失败，请手动复制')
      })
  }

  function bindEvents() {
    refs.btnExample.addEventListener('click', fillExample)
    refs.btnSwap.addEventListener('click', swapText)
    refs.btnClear.addEventListener('click', clearAll)
    refs.btnCopy.addEventListener('click', copyModified)
    window.addEventListener('resize', scheduleVisibilityCheck)
    window.addEventListener('load', scheduleVisibilityCheck)
    window.addEventListener('pageshow', scheduleVisibilityCheck)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        scheduleVisibilityCheck()
      }
    })
  }

  toolkit.loadMonaco([], initDiffEditor, function () {
    setStatus('error', 'Monaco 加载失败，请刷新页面后重试')
  })
  bindEvents()
})()