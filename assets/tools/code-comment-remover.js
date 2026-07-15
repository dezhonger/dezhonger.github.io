(function () {
  const toolkit = window.CodeCommentToolkit

  if (!toolkit) {
    return
  }

  const languageConfigs = {
    cpp: {
      label: 'C / C++ / Java / JS / TS',
      desc: `
        <ul>
          <li>支持 <code>//</code> 和 <code>/* ... */</code></li>
          <li>“删除由注释产生的空行”只会删真正的注释行，不会删你原来写的空行</li>
        </ul>
      `,
    },
    golang: {
      label: 'Go (golang)',
      desc: `<ul><li>同 C 风格：<code>//</code> + <code>/* ... */</code></li></ul>`,
    },
    csharp: {
      label: 'C#',
      desc: `<ul><li>同 C 风格；<code>///</code> 也当行注释看</li></ul>`,
    },
    python: {
      label: 'Python',
      desc: `<ul><li>支持 <code># ...</code> 和三引号字符串</li></ul>`,
    },
    shell: {
      label: 'Shell / Bash',
      desc: `<ul><li>支持 <code># ...</code></li></ul>`,
    },
    sql: {
      label: 'SQL / Hive / 方言 SQL',
      desc: `<ul><li>支持 <code>-- ...</code>、<code>/* ... */</code>、<code># ...</code></li></ul>`,
    },
    html: {
      label: 'HTML / XML',
      desc: `<ul><li>支持 <code>&lt;!-- ... --&gt;</code></li></ul>`,
    },
  }

  const monacoLangMap = {
    cpp: 'cpp',
    golang: 'go',
    csharp: 'csharp',
    python: 'python',
    shell: 'shell',
    sql: 'sql',
    html: 'html',
  }

  const state = {
    currentLang: 'cpp',
    copiedTimer: null,
    monaco: null,
    inputEditor: null,
    outputEditor: null,
    opts: {
      trimTrailing: true,
      removeEmpty: false,
      removeCommentLines: true,
      keepLineComment: false,
      keepBlockComment: false,
      replaceLongLong: true,
    },
  }

  const refs = {
    languageSelect: document.getElementById('language-select'),
    banner: document.getElementById('language-desc'),
    inputEditor: document.getElementById('input-editor'),
    outputEditor: document.getElementById('output-editor'),
    copyStatus: document.getElementById('copy-status'),
    errorStatus: document.getElementById('error-status'),
    btnProcess: document.getElementById('process-btn'),
    btnCopy: document.getElementById('copy-btn'),
    btnClear: document.getElementById('clear-btn'),
    keepBlockWrap: document.getElementById('keep-block-wrap'),
    replaceLongLongWrap: document.getElementById('replace-long-long-wrap'),
  }

  const checkboxKeys = [
    'trimTrailing',
    'removeEmpty',
    'removeCommentLines',
    'keepLineComment',
    'keepBlockComment',
    'replaceLongLong',
  ]

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

  function populateLanguageSelect() {
    const entries = Object.entries(languageConfigs)
    entries.forEach(function ([key, config]) {
      const option = document.createElement('option')
      option.value = key
      option.textContent = config.label
      refs.languageSelect.appendChild(option)
    })
    refs.languageSelect.value = state.currentLang
  }

  function syncOptionInputs() {
    checkboxKeys.forEach(function (key) {
      const input = document.getElementById('opt-' + key)
      if (!input) return
      input.checked = !!state.opts[key]
    })
  }

  function showKeepBlock() {
    return ['cpp', 'golang', 'csharp', 'html', 'sql'].includes(state.currentLang)
  }

  function showReplaceLongLong() {
    return state.currentLang === 'cpp'
  }

  function renderLanguageUi() {
    const config = languageConfigs[state.currentLang]
    refs.banner.innerHTML = config ? config.desc : ''
    refs.keepBlockWrap.hidden = !showKeepBlock()
    refs.replaceLongLongWrap.hidden = !showReplaceLongLong()
  }

  function setEditorLanguages() {
    if (!state.monaco || !state.inputEditor || !state.outputEditor) return
    const monacoLang = monacoLangMap[state.currentLang] || 'plaintext'
    const inputModel = state.inputEditor.getModel()
    const outputModel = state.outputEditor.getModel()
    if (inputModel) {
      state.monaco.editor.setModelLanguage(inputModel, monacoLang)
    }
    if (outputModel) {
      state.monaco.editor.setModelLanguage(outputModel, monacoLang)
    }
  }

  function readInput() {
    return state.inputEditor ? state.inputEditor.getValue() : ''
  }

  function readOutput() {
    return state.outputEditor ? state.outputEditor.getValue() : ''
  }

  function writeOutput(text) {
    if (state.outputEditor) {
      state.outputEditor.setValue(text)
    }
  }

  function clearEditors() {
    if (state.inputEditor) {
      state.inputEditor.setValue('')
    }
    if (state.outputEditor) {
      state.outputEditor.setValue('')
    }
  }

  function doProcess() {
    clearTransientStatus()
    const src = readInput()
    const opt = state.opts
    let out = ''
    if (['cpp', 'golang', 'csharp'].includes(state.currentLang)) {
      out = stripCppLikeByLine(src, opt)
    } else if (state.currentLang === 'python') {
      out = stripPythonByLine(src, opt)
    } else if (state.currentLang === 'shell') {
      out = stripShellByLine(src, opt)
    } else if (state.currentLang === 'sql') {
      out = stripSqlByLine(src, opt)
    } else if (state.currentLang === 'html') {
      out = stripHtmlByLine(src, opt)
    } else {
      out = src
    }
    if (state.currentLang === 'cpp' && opt.replaceLongLong) {
      out = replaceCppLongLongTypes(out)
    }
    writeOutput(out)
  }

  function clearText() {
    clearEditors()
    if (state.copiedTimer) {
      window.clearTimeout(state.copiedTimer)
      state.copiedTimer = null
    }
    clearTransientStatus()
  }

  function openDiffPreview() {
    const original = readInput()
    const modified = readOutput()
    const payloadKey = toolkit.saveDiffPayload({ original, modified })
    const diffUrlObj = new URL('/diff/', window.location.origin)
    if (payloadKey) {
      diffUrlObj.searchParams.set(toolkit.diffPayloadQueryKey || 'payload', payloadKey)
    }
    const diffUrl = diffUrlObj.href
    window.open(diffUrl, '_blank')
  }

  function copyResult() {
    const text = readOutput()
    if (!text) return
    navigator.clipboard
      .writeText(text)
      .then(function () {
        setStatus('success', '复制成功')
        if (state.copiedTimer) {
          window.clearTimeout(state.copiedTimer)
        }
        state.copiedTimer = window.setTimeout(function () {
          setStatus('success', '')
        }, 2000)
        openDiffPreview()
      })
      .catch(function () {
        setStatus('error', '复制失败，请手动复制')
      })
  }

  function bindEvents() {
    refs.languageSelect.addEventListener('change', function (event) {
      state.currentLang = event.target.value
      renderLanguageUi()
      setEditorLanguages()
    })

    checkboxKeys.forEach(function (key) {
      const input = document.getElementById('opt-' + key)
      if (!input) return
      input.addEventListener('change', function (event) {
        state.opts[key] = !!event.target.checked
      })
    })

    refs.btnProcess.addEventListener('click', doProcess)
    refs.btnCopy.addEventListener('click', copyResult)
    refs.btnClear.addEventListener('click', clearText)
  }

  function initEditors(monaco) {
    state.monaco = monaco
    const monacoLang = monacoLangMap[state.currentLang] || 'plaintext'

    state.inputEditor = monaco.editor.create(refs.inputEditor, {
      value: '',
      language: monacoLang,
      automaticLayout: true,
      lineNumbers: 'on',
      wordWrap: 'on',
      minimap: { enabled: false },
      fontSize: 14,
      theme: 'vs',
    })

    state.outputEditor = monaco.editor.create(refs.outputEditor, {
      value: '',
      language: monacoLang,
      automaticLayout: true,
      lineNumbers: 'on',
      wordWrap: 'on',
      minimap: { enabled: false },
      fontSize: 14,
      theme: 'vs',
      readOnly: true,
    })
  }

  function initMonaco() {
    toolkit.loadMonaco(
      [],
      function (monaco) {
        initEditors(monaco)
      },
      function () {
        setStatus('error', 'Monaco 加载失败，请刷新页面后重试')
      },
    )
  }

  function replaceCppLongLongTypes(src) {
    const checkUsingAlias = /^\s*using\b.*=/
    return src
      .split('\n')
      .map(function (line) {
        if (checkUsingAlias.test(line)) {
          return line
        }
        return line
          .replace(/\bunsigned\s+long\s+long\b/g, 'ULL')
          .replace(/\blong\s+long\b/g, 'LL')
      })
      .join('\n')
  }

  function stripCppLikeByLine(src, opt) {
    const lines = src.replace(/\r\n/g, '\n').split('\n')
    const out = []
    let inBlock = false

    for (const raw of lines) {
      if (!inBlock && raw.trim() === '') {
        if (!opt.removeEmpty) out.push('')
        continue
      }

      let line = raw
      let isCommentLine = false
      let res = ''
      let i = 0
      let inStr = false
      let inChar = false

      if (inBlock) {
        const endIdx = line.indexOf('*/')
        if (endIdx === -1) {
          isCommentLine = true
          line = ''
        } else {
          line = line.slice(endIdx + 2)
          inBlock = false
          if (line.trim() === '') {
            isCommentLine = true
            line = ''
          }
        }
      }

      if (line !== '') {
        while (i < line.length) {
          const ch = line[i]
          const two = line.slice(i, i + 2)
          if (inStr) {
            res += ch
            if (ch === '\\') {
              res += line[i + 1] || ''
              i += 2
              continue
            }
            if (ch === inStr) {
              inStr = false
            }
            i++
            continue
          }
          if (inChar) {
            res += ch
            if (ch === '\\') {
              res += line[i + 1] || ''
              i += 2
              continue
            }
            if (ch === "'") {
              inChar = false
            }
            i++
            continue
          }

          if (two === '/*') {
            const endIdx = line.indexOf('*/', i + 2)
            if (endIdx === -1) {
              if (res.trim() === '') isCommentLine = true
              inBlock = true
              break
            }
            const beforeEmpty = res.trim() === ''
            line = res + line.slice(endIdx + 2)
            i = res.length
            if (beforeEmpty && line.trim() === '') {
              isCommentLine = true
            }
            continue
          }

          if (two === '//') {
            if (res.trim() === '' && opt.keepLineComment) {
              res = raw
              isCommentLine = false
            } else if (res.trim() === '') {
              isCommentLine = true
              res = ''
            }
            break
          }

          if (ch === '"' || ch === '`') {
            inStr = ch
            res += ch
            i++
            continue
          }
          if (ch === "'") {
            inChar = true
            res += ch
            i++
            continue
          }

          res += ch
          i++
        }
        line = res
      }

      if (opt.trimTrailing) {
        line = line.replace(/[ \t]+$/g, '')
      }

      const isEmpty = line.trim() === ''
      if (opt.removeCommentLines && isEmpty && isCommentLine) {
        continue
      }
      if (opt.removeEmpty && isEmpty) {
        continue
      }
      out.push(line)
    }

    return out.join('\n')
  }

  function stripPythonByLine(src, opt) {
    const lines = src.replace(/\r\n/g, '\n').split('\n')
    const out = []
    let inTriple = false
    let tripleType = ''

    for (const raw of lines) {
      if (!inTriple && raw.trim() === '') {
        if (!opt.removeEmpty) out.push('')
        continue
      }

      let line = raw
      let isCommentLine = false

      if (inTriple) {
        out.push(line)
        if (line.includes(tripleType)) {
          inTriple = false
          tripleType = ''
        }
        continue
      }

      let res = ''
      let inSingle = false
      let inDouble = false
      let esc = false

      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        const three = line.slice(i, i + 3)

        if (esc) {
          res += ch
          esc = false
          continue
        }
        if (ch === '\\') {
          res += ch
          esc = true
          continue
        }

        if (!inSingle && !inDouble && (three === "'''" || three === '"""')) {
          res += three
          inTriple = true
          tripleType = three
          i += 2
          continue
        }

        if (!inDouble && ch === "'") {
          inSingle = !inSingle
          res += ch
          continue
        }
        if (!inSingle && ch === '"') {
          inDouble = !inDouble
          res += ch
          continue
        }

        if (!inSingle && !inDouble && ch === '#') {
          if (res.trim() === '' && opt.keepLineComment) {
            res = raw
            isCommentLine = false
          } else if (res.trim() === '') {
            isCommentLine = true
            res = ''
          }
          break
        }

        res += ch
      }

      line = res

      if (opt.trimTrailing) {
        line = line.replace(/[ \t]+$/g, '')
      }

      const isEmpty = line.trim() === ''
      if (opt.removeCommentLines && isEmpty && isCommentLine) {
        continue
      }
      if (opt.removeEmpty && isEmpty) {
        continue
      }

      out.push(line)
    }

    return out.join('\n')
  }

  function stripShellByLine(src, opt) {
    const lines = src.replace(/\r\n/g, '\n').split('\n')
    const out = []

    for (const raw of lines) {
      if (raw.trim() === '') {
        if (!opt.removeEmpty) out.push('')
        continue
      }

      let line = raw
      let res = ''
      let inSingle = false
      let inDouble = false
      let esc = false
      let isCommentLine = false

      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (esc) {
          res += ch
          esc = false
          continue
        }
        if (ch === '\\') {
          res += ch
          esc = true
          continue
        }
        if (!inDouble && ch === "'") {
          inSingle = !inSingle
          res += ch
          continue
        }
        if (!inSingle && ch === '"') {
          inDouble = !inDouble
          res += ch
          continue
        }
        if (!inSingle && !inDouble && ch === '#') {
          if (res.trim() === '' && opt.keepLineComment) {
            res = raw
            isCommentLine = false
          } else if (res.trim() === '') {
            isCommentLine = true
            res = ''
          }
          break
        }
        res += ch
      }

      line = res
      if (opt.trimTrailing) {
        line = line.replace(/[ \t]+$/g, '')
      }

      const isEmpty = line.trim() === ''
      if (opt.removeCommentLines && isEmpty && isCommentLine) {
        continue
      }
      if (opt.removeEmpty && isEmpty) {
        continue
      }
      out.push(line)
    }

    return out.join('\n')
  }

  function stripHtmlByLine(src, opt) {
    let s = src
    if (!opt.keepBlockComment) {
      s = s.replace(/<!--[\s\S]*?-->/g, '')
    }
    const lines = s.split('\n')
    const out = []
    for (let line of lines) {
      if (opt.trimTrailing) {
        line = line.replace(/[ \t]+$/g, '')
      }
      const isEmpty = line.trim() === ''
      if ((opt.removeEmpty || opt.removeCommentLines) && isEmpty) continue
      out.push(line)
    }
    return out.join('\n')
  }

  function stripSqlByLine(src, opt) {
    const lines = src.replace(/\r\n/g, '\n').split('\n')
    const out = []
    let inBlock = false

    for (let raw of lines) {
      if (!inBlock && raw.trim() === '') {
        if (!opt.removeEmpty) out.push('')
        continue
      }

      let line = raw
      let isCommentLine = false

      if (inBlock) {
        const endIdx = line.indexOf('*/')
        if (endIdx === -1) {
          isCommentLine = true
          line = ''
        } else {
          line = line.slice(endIdx + 2)
          inBlock = false
          if (line.trim() === '') {
            isCommentLine = true
            line = ''
          }
        }
      }

      if (line !== '') {
        let res = ''
        let i = 0
        while (i < line.length) {
          const ch = line[i]
          const two = line.slice(i, i + 2)

          if (two === '/*') {
            const end = line.indexOf('*/', i + 2)
            if (end === -1) {
              if (res.trim() === '') isCommentLine = true
              inBlock = true
              break
            }
            const beforeEmpty = res.trim() === ''
            line = res + line.slice(end + 2)
            i = res.length
            if (beforeEmpty && line.trim() === '') {
              isCommentLine = true
            }
            continue
          }

          if (two === '--') {
            if (res.trim() === '' && opt.keepLineComment) {
              res = raw
              isCommentLine = false
            } else if (res.trim() === '') {
              isCommentLine = true
              res = ''
            }
            break
          }

          if (ch === '#') {
            if (res.trim() === '' && opt.keepLineComment) {
              res = raw
              isCommentLine = false
            } else if (res.trim() === '') {
              isCommentLine = true
              res = ''
            }
            break
          }

          res += ch
          i++
        }
        line = res
      }

      if (opt.trimTrailing) {
        line = line.replace(/[ \t]+$/g, '')
      }

      const isEmpty = line.trim() === ''
      if (opt.removeCommentLines && isEmpty && isCommentLine) {
        continue
      }
      if (opt.removeEmpty && isEmpty) {
        continue
      }
      out.push(line)
    }

    return out.join('\n')
  }

  populateLanguageSelect()
  syncOptionInputs()
  renderLanguageUi()
  bindEvents()
  initMonaco()
})()