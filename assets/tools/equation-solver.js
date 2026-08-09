(function (root) {
  'use strict'

  const M = root.ExactMath || (typeof require === 'function' ? require('./exact-math-core.js') : null)
  if (!M) throw new Error('ExactMath 未加载')
  const {
    Rational,
    absBigInt,
    gcdBigInt,
    integerNthRoot,
    normalizeIntegerCoefficients,
    polynomialToLatex,
    appendResult,
    setStatus,
    typeset,
  } = M

  function simplifySquareRoot(value) {
    let inside = absBigInt(BigInt(value))
    if (inside === 0n) return { outside: 0n, inside: 1n }
    let outside = 1n
    for (let factor = 2n; factor <= 10000n && factor * factor <= inside; factor += factor === 2n ? 1n : 2n) {
      const square = factor * factor
      while (inside % square === 0n) {
        inside /= square
        outside *= factor
      }
    }
    const remainingRoot = integerNthRoot(inside, 2)
    if (remainingRoot * remainingRoot === inside) {
      outside *= remainingRoot
      inside = 1n
    }
    return { outside, inside }
  }

  function radicalTerm(value, imaginary) {
    const simplified = simplifySquareRoot(value)
    const coefficient = simplified.outside === 1n ? '' : String(simplified.outside)
    const radical = simplified.inside === 1n ? coefficient || '1' : `${coefficient}\\sqrt{${simplified.inside}}`
    return imaginary ? `i${radical === '1' ? '' : radical}` : radical
  }

  function quadraticExact(rawCoefficients, variable) {
    const values = rawCoefficients.map(Rational.from)
    const symbol = variable || 'x'
    if (values[0].isZero()) {
      if (values[1].isZero()) {
        if (values[2].isZero()) return { kind: 'identity', equation: '0=0', rootsLatex: '\\mathbb{C}', note: '恒等式，任意复数都是解。' }
        return { kind: 'contradiction', equation: `${values[2].toLatex()}=0`, rootsLatex: '\\varnothing', note: '矛盾方程，无解。' }
      }
      const rootValue = values[2].neg().div(values[1])
      return {
        kind: 'linear',
        equation: `${polynomialToLatex(values, symbol)}=0`,
        rootsLatex: `${symbol}=${rootValue.toLatex()}`,
        roots: [rootValue],
        note: '最高次项为 0，已按一次方程求解。',
      }
    }
    const coefficients = normalizeIntegerCoefficients(values)
    const [a, b, c] = coefficients
    const discriminant = b * b - 4n * a * c
    const denominator = 2n * a
    const equation = `${polynomialToLatex(coefficients.map(value => new Rational(value)), symbol)}=0`
    if (discriminant >= 0n) {
      const exactRoot = integerNthRoot(discriminant, 2)
      if (exactRoot * exactRoot === discriminant) {
        const left = new Rational(-b + exactRoot, denominator)
        const right = new Rational(-b - exactRoot, denominator)
        return {
          kind: 'quadratic', equation, discriminant, roots: [left, right],
          rootsLatex: left.equals(right)
            ? `${symbol}=${left.toLatex()}`
            : `${symbol}_1=${left.toLatex()},\\qquad ${symbol}_2=${right.toLatex()}`,
          note: discriminant === 0n ? '判别式为 0，存在二重根。' : '判别式为完全平方数，两个根均为有理数。',
        }
      }
      const radical = radicalTerm(discriminant, false)
      return {
        kind: 'quadratic', equation, discriminant,
        rootsLatex: `${symbol}_{1,2}=\\frac{${-b}\\pm ${radical}}{${denominator}}`,
        note: '结果保留为精确根式，没有转换为浮点近似。',
      }
    }
    const positiveDiscriminant = -discriminant
    const exactRoot = integerNthRoot(positiveDiscriminant, 2)
    if (exactRoot * exactRoot === positiveDiscriminant) {
      const real = new Rational(-b, denominator)
      const imaginary = new Rational(exactRoot, denominator)
      return {
        kind: 'quadratic', equation, discriminant,
        rootsLatex: `${symbol}_{1,2}=${real.toLatex()}\\pm ${imaginary.toLatex()}i`,
        note: '判别式小于 0，得到一对共轭复根。',
      }
    }
    return {
      kind: 'quadratic', equation, discriminant,
      rootsLatex: `${symbol}_{1,2}=\\frac{${-b}\\pm ${radicalTerm(positiveDiscriminant, true)}}{${denominator}}`,
      note: '判别式小于 0，结果保留为精确共轭根式。',
    }
  }

  function evaluateIntegerPolynomial(coefficients, numerator, denominator) {
    const degree = coefficients.length - 1
    return coefficients.reduce((sum, coefficient, index) => (
      sum + coefficient * numerator ** BigInt(degree - index) * denominator ** BigInt(index)
    ), 0n)
  }

  function divisorsLimited(value) {
    const absolute = absBigInt(value)
    if (absolute === 0n || absolute > 5000000n) return []
    const number = Number(absolute)
    const result = []
    for (let divisor = 1; divisor * divisor <= number; divisor += 1) {
      if (number % divisor !== 0) continue
      result.push(BigInt(divisor))
      if (divisor * divisor !== number) result.push(BigInt(number / divisor))
    }
    return result.sort((left, right) => Number(left - right))
  }

  function findRationalRoot(coefficients) {
    const leading = coefficients[0]
    const constant = coefficients[coefficients.length - 1]
    if (constant === 0n) return new Rational(0n)
    const checked = new Set()
    const candidates = []
    for (let integer = -20n; integer <= 20n; integer += 1n) candidates.push(new Rational(integer))
    const numerators = divisorsLimited(constant)
    const denominators = divisorsLimited(leading)
    for (const numerator of numerators) {
      for (const denominator of denominators) {
        candidates.push(new Rational(numerator, denominator), new Rational(-numerator, denominator))
      }
    }
    for (const candidate of candidates) {
      const key = candidate.toString()
      if (checked.has(key)) continue
      checked.add(key)
      if (evaluateIntegerPolynomial(coefficients, candidate.n, candidate.d) === 0n) return candidate
    }
    return null
  }

  function syntheticDivide(coefficients, rootValue) {
    const values = coefficients.map(Rational.from)
    const quotient = [values[0]]
    for (let index = 1; index < values.length - 1; index += 1) {
      quotient.push(values[index].add(quotient[quotient.length - 1].mul(rootValue)))
    }
    const remainder = values[values.length - 1].add(quotient[quotient.length - 1].mul(rootValue))
    return { quotient, remainder }
  }

  function cubicExact(rawCoefficients, variable) {
    const values = rawCoefficients.map(Rational.from)
    const symbol = variable || 'x'
    if (values[0].isZero()) {
      const reduced = quadraticExact(values.slice(1), symbol)
      reduced.note = `三次项系数为 0，已降为二次方程。${reduced.note || ''}`
      return reduced
    }
    const coefficients = normalizeIntegerCoefficients(values)
    const [a, b, c, d] = coefficients
    const equation = `${polynomialToLatex(coefficients.map(value => new Rational(value)), symbol)}=0`
    const discriminant = 18n * a * b * c * d - 4n * b ** 3n * d + b * b * c * c - 4n * a * c ** 3n - 27n * a * a * d * d
    const delta0 = b * b - 3n * a * c
    const delta1 = 2n * b ** 3n - 9n * a * b * c + 27n * a * a * d
    if (delta0 === 0n && delta1 === 0n) {
      const rootValue = new Rational(-b, 3n * a)
      return {
        kind: 'cubic', equation, discriminant, delta0, delta1,
        rootsLatex: `${symbol}_1=${symbol}_2=${symbol}_3=${rootValue.toLatex()}`,
        note: '三个根完全重合。',
      }
    }

    if (b === 0n && c === 0n) {
      const ratio = new Rational(-d, a)
      const numeratorRoot = integerNthRoot(absBigInt(ratio.n), 3)
      const denominatorRoot = integerNthRoot(ratio.d, 3)
      let base
      if (numeratorRoot ** 3n === absBigInt(ratio.n) && denominatorRoot ** 3n === ratio.d) {
        base = new Rational(ratio.n < 0n ? -numeratorRoot : numeratorRoot, denominatorRoot).toLatex()
      } else {
        base = `\\sqrt[3]{${ratio.toLatex()}}`
      }
      return {
        kind: 'cubic', equation, discriminant, delta0, delta1,
        rootsLatex: `${symbol}_k=${base}\\,\\zeta_k,\\qquad \\zeta_k=e^{2\\pi i k/3},\\quad k=0,1,2`,
        note: '这是纯三次方程，三个复根由一个精确立方根和三次单位根给出。',
      }
    }

    const rationalRoot = findRationalRoot(coefficients)
    if (rationalRoot) {
      const qa = new Rational(a)
      const qb = new Rational(b).add(qa.mul(rationalRoot))
      const qc = new Rational(c).add(qb.mul(rationalRoot))
      const quadratic = quadraticExact([qa, qb, qc], symbol)
      let remainingRoots = quadratic.rootsLatex
      if (quadratic.roots && quadratic.roots.length === 2) {
        remainingRoots = quadratic.roots[0].equals(quadratic.roots[1])
          ? `${symbol}_2=${symbol}_3=${quadratic.roots[0].toLatex()}`
          : `${symbol}_2=${quadratic.roots[0].toLatex()},\\qquad ${symbol}_3=${quadratic.roots[1].toLatex()}`
      } else {
        remainingRoots = remainingRoots
          .replace(`${symbol}_{1,2}`, `${symbol}_{2,3}`)
          .replace(`${symbol}_1`, `${symbol}_2`)
          .replace(`${symbol}_2`, `${symbol}_3`)
      }
      return {
        kind: 'cubic', equation, discriminant, delta0, delta1, rationalRoot, quadratic,
        rootsLatex: `${symbol}_1=${rationalRoot.toLatex()},\\qquad ${remainingRoots}`,
        factorLatex: `\\left(${symbol}-\\left(${rationalRoot.toLatex()}\\right)\\right)\\left(${polynomialToLatex([qa, qb, qc], symbol)}\\right)=0`,
        note: `检测到有理根，先精确因式分解，再求剩余二次因子的根。${quadratic.note || ''}`,
      }
    }

    const radicand = delta1 * delta1 - 4n * delta0 ** 3n
    const radicalSign = delta1 < 0n ? '-' : '+'
    const cSymbol = `C=\\sqrt[3]{\\frac{${delta1}${radicalSign}\\sqrt{${radicand}}}{2}}`
    const rootFormula = `${symbol}_k=-\\frac{1}{${3n * a}}\\left(${b}+\\zeta_k C+\\frac{${delta0}}{\\zeta_k C}\\right),\\quad k=0,1,2`
    let note
    if (discriminant > 0n) note = '判别式大于 0，有三个互不相同的实根。Cardano 形式中的中间复数会在最终结果中相消。'
    else if (discriminant < 0n) note = '判别式小于 0，有一个实根和一对共轭复根。'
    else note = '判别式为 0，方程存在重根。'
    return {
      kind: 'cubic', equation, discriminant, delta0, delta1,
      rootsLatex: `${cSymbol},\\qquad \\zeta_k=e^{2\\pi i k/3},\\qquad ${rootFormula}`,
      note: `${note} 结果保留为精确 Cardano 根式；这里已选择不使 C 为 0 的平方根分支。`,
    }
  }

  function perfectSquareRational(value) {
    const rational = Rational.from(value)
    if (rational.n < 0n) return null
    const numeratorRoot = integerNthRoot(rational.n, 2)
    const denominatorRoot = integerNthRoot(rational.d, 2)
    if (numeratorRoot * numeratorRoot !== rational.n || denominatorRoot * denominatorRoot !== rational.d) return null
    return new Rational(numeratorRoot, denominatorRoot)
  }

  function quarticExact(rawCoefficients, variable) {
    const values = rawCoefficients.map(Rational.from)
    const symbol = variable || 'x'
    if (values[0].isZero()) {
      const reduced = cubicExact(values.slice(1), symbol)
      reduced.note = `四次项系数为 0，已降为三次方程。${reduced.note || ''}`
      return reduced
    }

    const coefficients = normalizeIntegerCoefficients(values)
    const [a, b, c, d, e] = coefficients
    const rationalCoefficients = coefficients.map(value => new Rational(value))
    const equation = `${polynomialToLatex(rationalCoefficients, symbol)}=0`
    const rationalRoot = findRationalRoot(coefficients)
    if (rationalRoot) {
      const division = syntheticDivide(rationalCoefficients, rationalRoot)
      const cubic = cubicExact(division.quotient, 't')
      return {
        kind: 'quartic', equation, rationalRoot, cubic,
        factorLatex: `\\left(${symbol}-\\left(${rationalRoot.toLatex()}\\right)\\right)\\left(${polynomialToLatex(division.quotient, symbol)}\\right)=0`,
        rootsLatex: `${symbol}_1=${rationalRoot.toLatex()},\\qquad (${symbol}_2,${symbol}_3,${symbol}_4)=(t_1,t_2,t_3),\\qquad ${cubic.rootsLatex}`,
        note: `检测到有理根，先做精确综合除法，再求三次因子的全部根。${cubic.note || ''}`,
      }
    }

    const A = new Rational(a)
    const B = new Rational(b)
    const C = new Rational(c)
    const D = new Rational(d)
    const E = new Rational(e)
    const shift = B.neg().div(A.mul(4n))
    const alpha = C.div(A).sub(B.pow(2).mul(3n).div(A.pow(2).mul(8n)))
    const beta = B.pow(3).div(A.pow(3).mul(8n))
      .sub(B.mul(C).div(A.pow(2).mul(2n)))
      .add(D.div(A))
    const gamma = B.pow(4).mul(-3n).div(A.pow(4).mul(256n))
      .add(B.pow(2).mul(C).div(A.pow(3).mul(16n)))
      .sub(B.mul(D).div(A.pow(2).mul(4n)))
      .add(E.div(A))
    const invariantsLatex = `\\alpha=${alpha.toLatex()},\\qquad \\beta=${beta.toLatex()},\\qquad \\gamma=${gamma.toLatex()},\\qquad z=${symbol}-\\left(${shift.toLatex()}\\right)`

    if (beta.isZero()) {
      const zEquation = quadraticExact([new Rational(1n), alpha, gamma], 'u')
      const shiftedRoot = shift.isZero() ? '' : `${shift.toLatex()}+`
      let rootsLatex
      if (zEquation.roots && zEquation.roots.length === 2) {
        rootsLatex = `${symbol}_{1,2}=${shiftedRoot}\\pm\\sqrt{${zEquation.roots[0].toLatex()}},\\qquad ${symbol}_{3,4}=${shiftedRoot}\\pm\\sqrt{${zEquation.roots[1].toLatex()}}`
      } else {
        rootsLatex = `${zEquation.rootsLatex},\\qquad ${symbol}=${shiftedRoot}\\pm\\sqrt{u_i},\\quad i=1,2`
      }
      return {
        kind: 'quartic', equation, alpha, beta, gamma, invariantsLatex,
        rootsLatex,
        auxiliaryLatex: `u^2+(${alpha.toLatex()})u+(${gamma.toLatex()})=0`,
        note: '平移后奇次项为 0，方程已化为双二次方程并精确求解。',
      }
    }

    const P = alpha.pow(2).neg().div(12n).sub(gamma)
    const Q = alpha.pow(3).neg().div(108n).add(alpha.mul(gamma).div(3n)).sub(beta.pow(2).div(8n))
    const radicand = Q.pow(2).div(4n).add(P.pow(3).div(27n))
    const radicalSign = Q.compare(0n) > 0 ? '-' : '+'
    const rBase = Q.neg().div(2n)
    const exactRadical = perfectSquareRational(radicand)
    let rValue = null
    if (exactRadical) rValue = radicalSign === '+' ? rBase.add(exactRadical) : rBase.sub(exactRadical)

    let yLatex
    let uLatex
    if (rValue && rValue.isZero()) {
      uLatex = `U=0`
      yLatex = `y=-\\frac{5}{6}\\alpha-\\sqrt[3]{Q}`
    } else {
      uLatex = `U=\\sqrt[3]{${rBase.toLatex()}${radicalSign}\\sqrt{${radicand.toLatex()}}}`
      yLatex = `y=-\\frac{5}{6}\\alpha+U-\\frac{P}{3U}`
    }
    const wLatex = `W=\\sqrt{\\alpha+2y}`
    const shiftedRoot = shift.isZero() ? '' : `${shift.toLatex()}+`
    const rootsLatex = [
      `${symbol}_{1,2}=${shiftedRoot}\\frac{1}{2}\\left(W\\pm\\sqrt{-\\left(3\\alpha+2y+\\frac{2\\beta}{W}\\right)}\\right)`,
      `${symbol}_{3,4}=${shiftedRoot}\\frac{1}{2}\\left(-W\\pm\\sqrt{-\\left(3\\alpha+2y-\\frac{2\\beta}{W}\\right)}\\right)`,
    ].join(',\\qquad ')
    return {
      kind: 'quartic', equation, alpha, beta, gamma, P, Q, invariantsLatex,
      auxiliaryLatex: `P=${P.toLatex()},\\qquad Q=${Q.toLatex()},\\qquad ${uLatex},\\qquad ${yLatex},\\qquad ${wLatex}`,
      rootsLatex,
      note: '一般四次方程使用 Ferrari 公式求解；所有中间量保持为有理数与根式。立方根取与公式一致且使 W 非零的分支。',
    }
  }

  const api = { simplifySquareRoot, quadraticExact, cubicExact, quarticExact, findRationalRoot, syntheticDivide }
  root.ExactEquation = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api

  if (typeof document === 'undefined') return
  const solveButton = document.getElementById('equation-solve-btn')
  if (!solveButton) return

  const modeInputs = Array.from(document.querySelectorAll('input[name="equation-degree"]'))
  const quadraticFields = document.getElementById('quadratic-fields')
  const cubicFields = document.getElementById('cubic-fields')
  const quarticFields = document.getElementById('quartic-fields')
  const output = document.getElementById('equation-output')
  const status = document.getElementById('equation-status')

  function currentMode() {
    return modeInputs.find(input => input.checked).value
  }

  function updateMode() {
    const mode = currentMode()
    quadraticFields.hidden = mode !== '2'
    cubicFields.hidden = mode !== '3'
    quarticFields.hidden = mode !== '4'
    output.innerHTML = ''
    setStatus(status, '', '')
  }

  modeInputs.forEach(input => input.addEventListener('change', updateMode))

  solveButton.addEventListener('click', () => {
    output.innerHTML = ''
    setStatus(status, '', '')
    try {
      const mode = currentMode()
      const prefix = mode === '2' ? 'q' : mode === '3' ? 'c' : 'f'
      const count = Number(mode) + 1
      const coefficients = Array.from({ length: count }, (_, index) => Rational.parse(document.getElementById(`${prefix}-${index}`).value))
      const result = mode === '2' ? quadraticExact(coefficients) : mode === '3' ? cubicExact(coefficients) : quarticExact(coefficients)
      appendResult(output, '标准化方程', result.equation)
      if (result.discriminant !== undefined) appendResult(output, '判别式', `\\Delta=${result.discriminant}`)
      if (result.factorLatex) appendResult(output, '精确因式分解', result.factorLatex)
      appendResult(output, '精确解', result.rootsLatex, result.note)
      if (mode === '3' && result.delta0 !== undefined) {
        appendResult(output, 'Cardano 不变量', `\\Delta_0=${result.delta0},\\qquad \\Delta_1=${result.delta1}`)
      }
      if (mode === '4' && result.invariantsLatex) appendResult(output, 'Ferrari 降次参数', result.invariantsLatex)
      if (mode === '4' && result.auxiliaryLatex) appendResult(output, '辅助方程与中间量', result.auxiliaryLatex)
      setStatus(status, '计算完成；结果未转换为浮点小数。', 'success')
      typeset([output])
    } catch (error) {
      setStatus(status, error.message, 'error')
    }
  })

  document.getElementById('equation-example-btn').addEventListener('click', () => {
    if (currentMode() === '2') {
      ;['1', '-3', '1'].forEach((value, index) => { document.getElementById(`q-${index}`).value = value })
    } else if (currentMode() === '3') {
      ;['1', '-6', '11', '-6'].forEach((value, index) => { document.getElementById(`c-${index}`).value = value })
    } else {
      ;['1', '0', '-10', '0', '9'].forEach((value, index) => { document.getElementById(`f-${index}`).value = value })
    }
  })

  updateMode()
})(typeof window !== 'undefined' ? window : globalThis)
