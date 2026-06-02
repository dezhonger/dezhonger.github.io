(function () {
  const DIFF_PAYLOAD_KEY = 'codeCommentRemoverDiffPayload'
  const MONACO_BASE = '/vendor/monaco'

  function safeGetSessionStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage
  }

  function saveDiffPayload(payload) {
    const storage = safeGetSessionStorage()
    if (!storage) return
    try {
      storage.setItem(DIFF_PAYLOAD_KEY, JSON.stringify(payload))
    } catch (_) {
      // ignore storage errors
    }
  }

  function consumeDiffPayload() {
    const storage = safeGetSessionStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(DIFF_PAYLOAD_KEY)
      if (!raw) return null
      storage.removeItem(DIFF_PAYLOAD_KEY)
      const payload = JSON.parse(raw)
      if (!payload || typeof payload !== 'object') return null
      return {
        original: typeof payload.original === 'string' ? payload.original : '',
        modified: typeof payload.modified === 'string' ? payload.modified : '',
      }
    } catch (_) {
      storage.removeItem(DIFF_PAYLOAD_KEY)
      return null
    }
  }

  function configureMonacoEnvironment() {
    if (window.__dzMonacoConfigured) return
    window.__dzMonacoConfigured = true
    window.MonacoEnvironment = {
      getWorkerUrl() {
        const workerSource = [
          "self.MonacoEnvironment = { baseUrl: '" + MONACO_BASE + "/' };",
          "importScripts('" + MONACO_BASE + "/vs/base/worker/workerMain.js');",
        ].join('\n')
        return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(workerSource)
      },
    }
  }

  function loadMonaco(extraModules, onReady, onError) {
    try {
      if (window.monaco && window.monaco.editor) {
        onReady(window.monaco)
        return
      }

      if (typeof window.require !== 'function') {
        throw new Error('Monaco loader is unavailable.')
      }

      configureMonacoEnvironment()
      window.require.config({ paths: { vs: MONACO_BASE + '/vs' } })

      const modules = ['vs/editor/editor.main'].concat(extraModules || [])
      const originalErrorHandler = window.requirejs && window.requirejs.onError

      if (window.requirejs) {
        window.requirejs.onError = function (error) {
          if (typeof onError === 'function') {
            onError(error)
          }
          if (typeof originalErrorHandler === 'function') {
            originalErrorHandler(error)
          }
        }
      }

      window.require(modules, function () {
        if (window.requirejs) {
          window.requirejs.onError = originalErrorHandler || null
        }
        onReady(window.monaco)
      })
    } catch (error) {
      if (typeof onError === 'function') {
        onError(error)
      }
    }
  }

  window.CodeCommentToolkit = {
    loadMonaco,
    saveDiffPayload,
    consumeDiffPayload,
  }
})()