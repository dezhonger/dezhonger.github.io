(function () {
  const DIFF_PAYLOAD_KEY = 'codeCommentRemoverDiffPayload'
  const DIFF_PAYLOAD_STORAGE_PREFIX = 'codeCommentRemoverDiffPayload:'
  const DIFF_PAYLOAD_QUERY_KEY = 'payload'
  const MONACO_BASE = '/vendor/monaco'

  function safeGetSessionStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage
  }

  function saveDiffPayload(payload) {
    const storage = safeGetSessionStorage()
    const key = DIFF_PAYLOAD_STORAGE_PREFIX + Date.now() + ':' + Math.random().toString(36).slice(2)
    if (!storage) return
    try {
      storage.setItem(DIFF_PAYLOAD_KEY, JSON.stringify(payload))
    } catch (_) {
      // ignore storage errors
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(payload))
      }
    } catch (_) {
      // ignore storage errors
    }

    return key
  }

  function parsePayload(raw) {
    if (!raw) return null
    try {
      const payload = JSON.parse(raw)
      if (!payload || typeof payload !== 'object') return null
      return {
        original: typeof payload.original === 'string' ? payload.original : '',
        modified: typeof payload.modified === 'string' ? payload.modified : '',
      }
    } catch (_) {
      return null
    }
  }

  function consumePayloadByQuery() {
    if (typeof window === 'undefined') return null
    const url = new URL(window.location.href)
    const payloadKey = url.searchParams.get(DIFF_PAYLOAD_QUERY_KEY)
    if (!payloadKey) return null

    let payload = null
    try {
      if (window.localStorage) {
        const raw = window.localStorage.getItem(payloadKey)
        payload = parsePayload(raw)
        window.localStorage.removeItem(payloadKey)
      }
    } catch (_) {
      // ignore storage errors
    }

    // Clean up query param once consumed.
    try {
      url.searchParams.delete(DIFF_PAYLOAD_QUERY_KEY)
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    } catch (_) {
      // ignore history errors
    }

    return payload
  }

  function consumeDiffPayload() {
    const payloadFromQuery = consumePayloadByQuery()
    if (payloadFromQuery) {
      return payloadFromQuery
    }

    const storage = safeGetSessionStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(DIFF_PAYLOAD_KEY)
      if (!raw) return null
      storage.removeItem(DIFF_PAYLOAD_KEY)
      return parsePayload(raw)
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
    diffPayloadQueryKey: DIFF_PAYLOAD_QUERY_KEY,
    loadMonaco,
    saveDiffPayload,
    consumeDiffPayload,
  }
})()