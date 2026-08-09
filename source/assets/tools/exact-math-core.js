(function (root) {
  'use strict'

  function absBigInt(value) {
    return value < 0n ? -value : value
  }

  function gcdBigInt(a, b) {
    a = absBigInt(a)
    b = absBigInt(b)
    while (b !== 0n) {
      const next = a % b
      a = b
      b = next
    }
    return a
  }

  function lcmBigInt(a, b) {
    if (a === 0n || b === 0n) return 0n
    return absBigInt((a / gcdBigInt(a, b)) * b)
  }

  function extendedGcd(a, b) {
    let oldR = a
    let r = b
    let oldS = 1n
    let s = 0n
    let oldT = 0n
    let t = 1n
    while (r !== 0n) {
      const q = oldR / r
      ;[oldR, r] = [r, oldR - q * r]
      ;[oldS, s] = [s, oldS - q * s]
      ;[oldT, t] = [t, oldT - q * t]
    }
    if (oldR < 0n) return { gcd: -oldR, x: -oldS, y: -oldT }
    return { gcd: oldR, x: oldS, y: oldT }
  }

  function powBigInt(base, exponent) {
    let result = 1n
    let current = base
    let power = BigInt(exponent)
    while (power > 0n) {
      if (power & 1n) result *= current
      current *= current
      power >>= 1n
    }
    return result
  }

  function integerNthRoot(value, degree) {
    if (value < 0n) throw new Error('暂不支持负数的偶次根')
    if (value < 2n) return value
    const k = BigInt(degree)
    let low = 1n
    let high = 2n
    while (powBigInt(high, k) <= value) high <<= 1n
    while (low + 1n < high) {
      const middle = (low + high) >> 1n
      if (powBigInt(middle, k) <= value) low = middle
      else high = middle
    }
    return low
  }

  function isPerfectNthPower(value, degree) {
    if (value < 0n && degree % 2 === 0) return null
    const sign = value < 0n ? -1n : 1n
    const rootValue = integerNthRoot(absBigInt(value), degree)
    return powBigInt(rootValue, BigInt(degree)) === absBigInt(value) ? sign * rootValue : null
  }

  class Rational {
    constructor(numerator, denominator) {
      let num = BigInt(numerator)
      let den = denominator === undefined ? 1n : BigInt(denominator)
      if (den === 0n) throw new Error('分母不能为 0')
      if (den < 0n) {
        num = -num
        den = -den
      }
      const divisor = gcdBigInt(num, den)
      this.n = num / divisor
      this.d = den / divisor
    }

    static parse(raw) {
      const value = String(raw).trim().replace(/−/g, '-')
      if (!value) throw new Error('存在空的数值')
      if (value.includes('/')) {
        const pieces = value.split('/')
        if (pieces.length !== 2 || !/^[+-]?\d+$/.test(pieces[0].trim()) || !/^\d+$/.test(pieces[1].trim())) {
          throw new Error(`无法识别有理数“${value}”，分数请写成 p/q`)
        }
        return new Rational(BigInt(pieces[0].trim()), BigInt(pieces[1].trim()))
      }
      const decimal = value.match(/^([+-]?)(\d+)(?:\.(\d+))?$/)
      if (!decimal) throw new Error(`无法识别有理数“${value}”`)
      const sign = decimal[1] === '-' ? -1n : 1n
      const integerPart = decimal[2]
      const fractionalPart = decimal[3] || ''
      const denominator = powBigInt(10n, BigInt(fractionalPart.length))
      const numerator = BigInt(integerPart + fractionalPart) * sign
      return new Rational(numerator, denominator)
    }

    add(other) {
      const value = Rational.from(other)
      return new Rational(this.n * value.d + value.n * this.d, this.d * value.d)
    }

    sub(other) {
      const value = Rational.from(other)
      return new Rational(this.n * value.d - value.n * this.d, this.d * value.d)
    }

    mul(other) {
      const value = Rational.from(other)
      return new Rational(this.n * value.n, this.d * value.d)
    }

    div(other) {
      const value = Rational.from(other)
      if (value.n === 0n) throw new Error('不能除以 0')
      return new Rational(this.n * value.d, this.d * value.n)
    }

    neg() {
      return new Rational(-this.n, this.d)
    }

    inv() {
      if (this.n === 0n) throw new Error('0 没有倒数')
      return new Rational(this.d, this.n)
    }

    pow(exponent) {
      const power = Number(exponent)
      if (!Number.isInteger(power)) throw new Error('有理数幂只支持整数指数')
      if (power < 0) return this.inv().pow(-power)
      return new Rational(powBigInt(this.n, BigInt(power)), powBigInt(this.d, BigInt(power)))
    }

    compare(other) {
      const value = Rational.from(other)
      const difference = this.n * value.d - value.n * this.d
      return difference < 0n ? -1 : difference > 0n ? 1 : 0
    }

    equals(other) {
      return this.compare(other) === 0
    }

    isZero() {
      return this.n === 0n
    }

    isOne() {
      return this.n === this.d
    }

    isInteger() {
      return this.d === 1n
    }

    toString() {
      return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`
    }

    toLatex() {
      if (this.d === 1n) return String(this.n)
      const sign = this.n < 0n ? '-' : ''
      return `${sign}\\frac{${absBigInt(this.n)}}{${this.d}}`
    }

    static from(value) {
      return value instanceof Rational ? value : new Rational(value)
    }
  }

  const ZERO = new Rational(0n)
  const ONE = new Rational(1n)

  function parseInteger(raw, options) {
    const settings = Object.assign({ allowNegative: true, maxDigits: 140 }, options || {})
    const value = String(raw).trim().replace(/[,，_\s]/g, '').replace(/−/g, '-')
    if (!/^[+-]?\d+$/.test(value)) throw new Error('请输入十进制整数')
    const unsigned = value.replace(/^[+-]/, '').replace(/^0+(?=\d)/, '')
    if (unsigned.length > settings.maxDigits) throw new Error(`最多支持 ${settings.maxDigits} 位十进制整数`)
    const result = BigInt(value)
    if (!settings.allowNegative && result < 0n) throw new Error('请输入非负整数')
    return result
  }

  function normalizeIntegerCoefficients(coefficients) {
    const values = coefficients.map(Rational.from)
    let commonDenominator = 1n
    values.forEach(value => {
      commonDenominator = lcmBigInt(commonDenominator, value.d)
    })
    let integers = values.map(value => value.n * (commonDenominator / value.d))
    let divisor = 0n
    integers.forEach(value => {
      divisor = gcdBigInt(divisor, value)
    })
    if (divisor !== 0n) integers = integers.map(value => value / divisor)
    const firstNonZero = integers.find(value => value !== 0n)
    if (firstNonZero !== undefined && firstNonZero < 0n) integers = integers.map(value => -value)
    return integers
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function parseMatrix(raw, options) {
    const settings = Object.assign({ maxRows: 12, maxColumns: 12 }, options || {})
    const rows = String(raw)
      .trim()
      .split(/\n|;/)
      .map(row => row.trim())
      .filter(Boolean)
      .map(row => row.split(/[\s,，]+/).filter(Boolean).map(Rational.parse))
    if (!rows.length) throw new Error('请输入矩阵')
    const columns = rows[0].length
    if (!columns || rows.some(row => row.length !== columns)) throw new Error('矩阵每一行的列数必须一致')
    if (rows.length > settings.maxRows || columns > settings.maxColumns) {
      throw new Error(`矩阵最多支持 ${settings.maxRows} 行、${settings.maxColumns} 列`)
    }
    return rows
  }

  function matrixToLatex(matrix) {
    if (!matrix.length || !matrix[0].length) return '\\begin{bmatrix}\\end{bmatrix}'
    return `\\begin{bmatrix}${matrix.map(row => row.map(value => Rational.from(value).toLatex()).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`
  }

  function vectorListToLatex(vectors) {
    if (!vectors.length) return '\\{0\\}'
    return `\\operatorname{span}\\left\\{${vectors.map(vector => matrixToLatex(vector.map(value => [value]))).join(',\;')}\\right\\}`
  }

  function polynomialToLatex(coefficients, variable) {
    const symbol = variable || 'x'
    const degree = coefficients.length - 1
    const terms = []
    coefficients.forEach((rawCoefficient, index) => {
      const coefficient = Rational.from(rawCoefficient)
      if (coefficient.isZero()) return
      const power = degree - index
      const negative = coefficient.n < 0n
      const magnitude = new Rational(absBigInt(coefficient.n), coefficient.d)
      let coefficientText = magnitude.toLatex()
      if (power > 0 && magnitude.isOne()) coefficientText = ''
      let term = coefficientText
      if (power === 1) term += symbol
      else if (power > 1) term += `${symbol}^{${power}}`
      if (!terms.length) terms.push(`${negative ? '-' : ''}${term}`)
      else terms.push(`${negative ? '-' : '+'}${term}`)
    })
    return terms.length ? terms.join('') : '0'
  }

  function setStatus(element, message, kind) {
    if (!element) return
    element.textContent = message || ''
    element.classList.remove('success', 'error', 'working')
    if (kind) element.classList.add(kind)
    element.hidden = !message
  }

  function appendResult(container, title, latex, note) {
    const section = document.createElement('section')
    section.className = 'math-result-card'
    const heading = document.createElement('h3')
    heading.textContent = title
    section.appendChild(heading)
    if (latex) {
      const output = document.createElement('div')
      output.className = 'math-display mathjax-process'
      output.textContent = `\\[${latex}\\]`
      section.appendChild(output)
    }
    if (note) {
      const paragraph = document.createElement('p')
      paragraph.className = 'math-result-note'
      paragraph.textContent = note
      section.appendChild(paragraph)
    }
    container.appendChild(section)
    return section
  }

  function typeset(elements) {
    if (root.MathJax && typeof root.MathJax.typesetPromise === 'function') {
      return root.MathJax.typesetPromise(elements || undefined).catch(() => undefined)
    }
    return Promise.resolve()
  }

  const api = {
    Rational,
    ZERO,
    ONE,
    absBigInt,
    gcdBigInt,
    lcmBigInt,
    extendedGcd,
    powBigInt,
    integerNthRoot,
    isPerfectNthPower,
    parseInteger,
    normalizeIntegerCoefficients,
    escapeHtml,
    parseMatrix,
    matrixToLatex,
    vectorListToLatex,
    polynomialToLatex,
    setStatus,
    appendResult,
    typeset,
  }

  root.ExactMath = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
