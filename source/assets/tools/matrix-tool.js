(function (root) {
  'use strict'

  const M = root.ExactMath || (typeof require === 'function' ? require('./exact-math-core.js') : null)
  const X = root.ExactMatrix || (typeof require === 'function' ? require('./exact-matrix.js') : null)
  const E = root.ExactEquation || (typeof require === 'function' ? require('./equation-solver.js') : null)
  if (!M || !X || !E) throw new Error('精确矩阵依赖未加载')
  const {
    Rational,
    ZERO,
    ONE,
    parseMatrix,
    matrixToLatex,
    vectorListToLatex,
    polynomialToLatex,
    appendResult,
    setStatus,
    typeset,
  } = M

  function symbolicMatrixToLatex(matrix) {
    return `\\begin{bmatrix}${matrix.map(row => row.join(' & ')).join(' \\\\ ')}\\end{bmatrix}`
  }

  function polynomialTrim(polynomial) {
    const result = polynomial.slice()
    while (result.length > 1 && result[result.length - 1].isZero()) result.pop()
    return result
  }

  function polynomialAdd(left, right) {
    const size = Math.max(left.length, right.length)
    const result = Array.from({ length: size }, (_, index) => (left[index] || ZERO).add(right[index] || ZERO))
    return polynomialTrim(result)
  }

  function polynomialNeg(polynomial) {
    return polynomial.map(value => value.neg())
  }

  function polynomialSub(left, right) {
    return polynomialAdd(left, polynomialNeg(right))
  }

  function polynomialMul(left, right) {
    const result = Array.from({ length: left.length + right.length - 1 }, () => ZERO)
    left.forEach((leftValue, leftIndex) => {
      right.forEach((rightValue, rightIndex) => {
        result[leftIndex + rightIndex] = result[leftIndex + rightIndex].add(leftValue.mul(rightValue))
      })
    })
    return polynomialTrim(result)
  }

  function polynomialLatexAscending(polynomial, variable) {
    return polynomialToLatex(polynomial.slice().reverse(), variable || '\\lambda')
  }

  function rowEntryPolynomial(matrix, row, column) {
    return row === column ? [matrix[row][column], new Rational(-1n)] : [matrix[row][column]]
  }

  function crossProductPolynomial(matrix, firstRow, secondRow) {
    const first = [0, 1, 2].map(column => rowEntryPolynomial(matrix, firstRow, column))
    const second = [0, 1, 2].map(column => rowEntryPolynomial(matrix, secondRow, column))
    return [
      polynomialSub(polynomialMul(first[1], second[2]), polynomialMul(first[2], second[1])),
      polynomialSub(polynomialMul(first[2], second[0]), polynomialMul(first[0], second[2])),
      polynomialSub(polynomialMul(first[0], second[1]), polynomialMul(first[1], second[0])),
    ]
  }

  function isZeroPolynomial(polynomial) {
    return polynomial.every(value => value.isZero())
  }

  function rationalEigenvalues(matrix, equationResult) {
    const values = []
    if (equationResult.roots) {
      equationResult.roots.forEach(value => {
        if (!values.some(existing => existing.equals(value))) values.push(value)
      })
    }
    if (equationResult.rationalRoot && !values.some(existing => existing.equals(equationResult.rationalRoot))) {
      values.push(equationResult.rationalRoot)
    }
    if (equationResult.quadratic && equationResult.quadratic.roots) {
      equationResult.quadratic.roots.forEach(value => {
        if (!values.some(existing => existing.equals(value))) values.push(value)
      })
    }
    return values.map(value => {
      const shifted = matrix.map((row, rowIndex) => row.map((entry, columnIndex) => (
        rowIndex === columnIndex ? entry.sub(value) : entry
      )))
      return { value, basis: X.nullSpace(shifted) }
    })
  }

  function eigenAnalysis(matrix) {
    const size = matrix.length
    const coefficients = X.characteristicPolynomial(matrix)
    const characteristic = polynomialToLatex(coefficients, '\\lambda')
    const result = {
      characteristic,
      equation: null,
      vectorFamily: null,
      vectorNote: null,
      rationalSpaces: [],
    }
    if (size === 1) {
      const value = matrix[0][0]
      result.equation = { rootsLatex: `\\lambda=${value.toLatex()}`, roots: [value] }
      result.rationalSpaces = [{ value, basis: [[ONE]] }]
      return result
    }
    if (size === 2) {
      result.equation = E.quadraticExact(coefficients, '\\lambda')
      const a = matrix[0][0]
      const b = matrix[0][1]
      const c = matrix[1][0]
      const d = matrix[1][1]
      if (!b.isZero()) result.vectorFamily = symbolicMatrixToLatex([[b.toLatex()], [`\\lambda-${a.toLatex()}`]])
      else if (!c.isZero()) result.vectorFamily = symbolicMatrixToLatex([[`\\lambda-${d.toLatex()}`], [c.toLatex()]])
      else result.vectorFamily = `\\ker(A-\\lambda I)`
      result.vectorNote = '对每个特征值代入 v(λ)；若得到零向量，则直接取 ker(A−λI) 的非零向量。'
      result.rationalSpaces = rationalEigenvalues(matrix, result.equation)
      return result
    }
    if (size === 3) {
      result.equation = E.cubicExact(coefficients, '\\lambda')
      const pairs = [[0, 1], [0, 2], [1, 2]]
      let chosen = null
      for (const pair of pairs) {
        const cross = crossProductPolynomial(matrix, pair[0], pair[1])
        if (cross.some(polynomial => !isZeroPolynomial(polynomial))) {
          chosen = { pair, cross }
          break
        }
      }
      if (chosen) {
        result.vectorFamily = symbolicMatrixToLatex(chosen.cross.map(polynomial => [polynomialLatexAscending(polynomial)]))
        result.vectorNote = `这是 A−λI 的第 ${chosen.pair[0] + 1}、${chosen.pair[1] + 1} 行叉积。对特征值 λ 代入后若恰为零，改取另外两行的叉积或直接求 ker(A−λI)。`
      }
      result.rationalSpaces = rationalEigenvalues(matrix, result.equation)
      return result
    }
    result.equation = { rootsLatex: `\\{\\lambda:\\ ${characteristic}=0\\}` }
    result.vectorFamily = '\\ker(A-\\lambda I)'
    result.vectorNote = '次数大于 4 的一般多项式不存在统一根式公式；以特征多项式的根定义特征值是精确表示，不是数值近似。'
    return result
  }

  function qrLatex(matrix) {
    const decomposition = X.orthogonalColumns(matrix)
    const rows = decomposition.orthogonal.length
    const columns = decomposition.orthogonal[0].length
    const Q = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
      const value = decomposition.orthogonal[row][column]
      if (value.isZero()) return '0'
      return `\\frac{${value.toLatex()}}{\\sqrt{${decomposition.norms[column].toLatex()}}}`
    }))
    const R = Array.from({ length: columns }, (_, row) => Array.from({ length: columns }, (_, column) => {
      if (column < row) return '0'
      const value = decomposition.upper[row][column]
      if (value.isZero()) return '0'
      if (value.isOne()) return `\\sqrt{${decomposition.norms[row].toLatex()}}`
      return `${value.toLatex()}\\sqrt{${decomposition.norms[row].toLatex()}}`
    }))
    return {
      Q: symbolicMatrixToLatex(Q),
      R: symbolicMatrixToLatex(R),
      orthogonal: decomposition.orthogonal,
      upper: decomposition.upper,
      norms: decomposition.norms,
    }
  }

  const api = { eigenAnalysis, qrLatex, symbolicMatrixToLatex }
  root.ExactMatrixTool = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api

  if (typeof document === 'undefined') return

  const input = document.getElementById('matrix-input')
  const output = document.getElementById('matrix-output')
  const status = document.getElementById('matrix-status')
  const decompositionSelect = document.getElementById('matrix-decomposition')

  function clearResult() {
    output.innerHTML = ''
    setStatus(status, '', '')
  }

  function readMatrix() {
    return parseMatrix(input.value, { maxRows: 10, maxColumns: 10 })
  }

  document.getElementById('matrix-analyze-btn').addEventListener('click', () => {
    clearResult()
    try {
      const matrix = readMatrix()
      const rows = matrix.length
      const columns = matrix[0].length
      const reduced = X.rref(matrix)
      appendResult(output, '基本信息', `A\\in\\mathbb{Q}^{${rows}\\times ${columns}},\\qquad \\operatorname{rank}(A)=${reduced.rank}`)
      appendResult(output, '转置', `A^{\\mathsf T}=${matrixToLatex(X.transpose(matrix))}`)
      appendResult(output, '行最简形（RREF）', `\\operatorname{rref}(A)=${matrixToLatex(reduced.matrix)}`, `主元列（从 1 开始）：${reduced.pivotColumns.map(index => index + 1).join(', ') || '无'}`)
      appendResult(output, '零空间', `\\ker(A)=${vectorListToLatex(X.nullSpace(matrix))}`)
      appendResult(output, '列空间', `\\operatorname{Col}(A)=${vectorListToLatex(X.columnSpace(matrix))}`)
      if (rows === columns) {
        const determinantValue = X.determinant(matrix)
        appendResult(output, '行列式与迹', `\\det(A)=${determinantValue.toLatex()},\\qquad \\operatorname{tr}(A)=${X.trace(matrix).toLatex()}`)
        if (!determinantValue.isZero()) appendResult(output, '逆矩阵', `A^{-1}=${matrixToLatex(X.inverse(matrix))}`)
        else appendResult(output, '逆矩阵', 'A^{-1}\\text{ 不存在}', '行列式为 0，矩阵奇异。')
        const eigen = eigenAnalysis(matrix)
        appendResult(output, '特征多项式', `\\chi_A(\\lambda)=\\det(\\lambda I-A)=${eigen.characteristic}`)
        appendResult(output, '特征值', eigen.equation.rootsLatex, eigen.equation.note)
        if (eigen.vectorFamily) appendResult(output, '特征向量', `v(\\lambda)=${eigen.vectorFamily}`, eigen.vectorNote)
        eigen.rationalSpaces.forEach(space => {
          appendResult(output, `特征空间 λ = ${space.value.toString()}`, `E_{${space.value.toLatex()}}=${vectorListToLatex(space.basis)}`)
        })
      }
      setStatus(status, '分析完成；所有消元与多项式系数均为精确有理数。', 'success')
      typeset([output])
    } catch (error) {
      setStatus(status, error.message, 'error')
    }
  })

  document.getElementById('matrix-decompose-btn').addEventListener('click', () => {
    clearResult()
    try {
      const matrix = readMatrix()
      const mode = decompositionSelect.value
      if (mode === 'plu') {
        const result = X.plu(matrix)
        appendResult(output, 'PLU 分解', `PA=LU`)
        appendResult(output, '置换矩阵 P', `P=${matrixToLatex(result.P)}`)
        appendResult(output, '下三角矩阵 L', `L=${matrixToLatex(result.L)}`)
        appendResult(output, '上三角矩阵 U', `U=${matrixToLatex(result.U)}`)
      } else if (mode === 'ldu') {
        const result = X.ldu(matrix)
        appendResult(output, 'LDU 分解', `PA=LDU`)
        appendResult(output, 'P 与 L', `P=${matrixToLatex(result.P)},\\qquad L=${matrixToLatex(result.L)}`)
        appendResult(output, 'D 与单位上三角矩阵 U', `D=${matrixToLatex(result.D)},\\qquad U=${matrixToLatex(result.U)}`)
      } else if (mode === 'ldlt') {
        const result = X.ldlt(matrix)
        appendResult(output, 'LDLᵀ 分解', `A=LDL^{\\mathsf T}`)
        appendResult(output, 'L 与 D', `L=${matrixToLatex(result.L)},\\qquad D=${matrixToLatex(result.D)}`)
        appendResult(output, 'Lᵀ', `L^{\\mathsf T}=${matrixToLatex(result.LT)}`)
      } else if (mode === 'qr') {
        const result = qrLatex(matrix)
        appendResult(output, '精确 QR 分解', `A=QR`)
        appendResult(output, '正交矩阵 Q', `Q=${result.Q}`)
        appendResult(output, '上三角矩阵 R', `R=${result.R}`, '平方根保留为符号表达式，因此 QᵀQ=I 与 A=QR 都是精确等式。')
      } else if (mode === 'svd') {
        const ata = X.multiply(X.transpose(matrix), matrix)
        const coefficients = X.characteristicPolynomial(ata)
        appendResult(output, 'SVD 的精确定义', `A=U\\Sigma V^{\\mathsf T}`)
        appendResult(output, 'Gram 矩阵', `A^{\\mathsf T}A=${matrixToLatex(ata)}`)
        appendResult(output, '奇异值', `\\sigma_i=\\sqrt{\\mu_i},\\qquad ${polynomialToLatex(coefficients, '\\mu')}=0`, 'μᵢ 是 AᵀA 的非负特征值；V 的列为对应特征向量，非零奇异值下 Uᵢ=Avᵢ/σᵢ。该表示对任意次数保持精确。')
      }
      setStatus(status, '分解完成。', 'success')
      typeset([output])
    } catch (error) {
      setStatus(status, error.message, 'error')
    }
  })

  document.getElementById('matrix-example-btn').addEventListener('click', () => {
    input.value = '4 2 2\n2 5 1\n2 1 3'
  })

  document.getElementById('matrix-clear-btn').addEventListener('click', () => {
    input.value = ''
    clearResult()
  })
})(typeof window !== 'undefined' ? window : globalThis)
