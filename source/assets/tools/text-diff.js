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
    state.originalModel = monaco.editor.createModel('', 'plaintext')
    state.modifiedModel = monaco.editor.createModel('', 'plaintext')

    state.diffEditor = monaco.editor.createDiffEditor(refs.diffEditor, {
      automaticLayout: true,
      readOnly: false,
      wordWrap: 'on',
      originalEditable: true,
      minimap: { enabled: false },
      theme: 'vs',
    })

    state.diffEditor.setModel({
      original: state.originalModel,
      modified: state.modifiedModel,
    })

    applySessionPayload()
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
  }

  toolkit.loadMonaco([], initDiffEditor, function () {
    setStatus('error', 'Monaco 加载失败，请刷新页面后重试')
  })
  bindEvents()
})()