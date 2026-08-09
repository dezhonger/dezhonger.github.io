(function (root) {
  'use strict'

  const M = root.ExactMath || (typeof require === 'function' ? require('./exact-math-core.js') : null)
  if (!M) throw new Error('ExactMath 未加载')
  const { Rational, ZERO, ONE } = M

  function cloneMatrix(matrix) {
    return matrix.map(row => row.slice())
  }

  function zeroMatrix(rows, columns) {
    return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ZERO))
  }

  function identityMatrix(size) {
    const result = zeroMatrix(size, size)
    for (let index = 0; index < size; index += 1) result[index][index] = ONE
    return result
  }

  function transpose(matrix) {
    return matrix[0].map((_, column) => matrix.map(row => row[column]))
  }

  function multiply(left, right) {
    if (left[0].length !== right.length) throw new Error('矩阵维度不匹配，无法相乘')
    const result = zeroMatrix(left.length, right[0].length)
    for (let row = 0; row < left.length; row += 1) {
      for (let column = 0; column < right[0].length; column += 1) {
        let value = ZERO
        for (let inner = 0; inner < right.length; inner += 1) {
          value = value.add(left[row][inner].mul(right[inner][column]))
        }
        result[row][column] = value
      }
    }
    return result
  }

  function add(left, right) {
    return left.map((row, i) => row.map((value, j) => value.add(right[i][j])))
  }

  function scale(matrix, scalar) {
    const value = Rational.from(scalar)
    return matrix.map(row => row.map(entry => entry.mul(value)))
  }

  function rref(matrix) {
    const result = cloneMatrix(matrix)
    const rowCount = result.length
    const columnCount = result[0].length
    const pivotColumns = []
    let pivotRow = 0
    for (let column = 0; column < columnCount && pivotRow < rowCount; column += 1) {
      let selected = pivotRow
      while (selected < rowCount && result[selected][column].isZero()) selected += 1
      if (selected === rowCount) continue
      ;[result[pivotRow], result[selected]] = [result[selected], result[pivotRow]]
      const pivot = result[pivotRow][column]
      result[pivotRow] = result[pivotRow].map(value => value.div(pivot))
      for (let row = 0; row < rowCount; row += 1) {
        if (row === pivotRow || result[row][column].isZero()) continue
        const factor = result[row][column]
        result[row] = result[row].map((value, index) => value.sub(factor.mul(result[pivotRow][index])))
      }
      pivotColumns.push(column)
      pivotRow += 1
    }
    return { matrix: result, pivotColumns, rank: pivotColumns.length }
  }

  function determinant(matrix) {
    if (matrix.length !== matrix[0].length) throw new Error('只有方阵有行列式')
    const result = cloneMatrix(matrix)
    const size = result.length
    let determinantValue = ONE
    let sign = 1
    for (let column = 0; column < size; column += 1) {
      let pivot = column
      while (pivot < size && result[pivot][column].isZero()) pivot += 1
      if (pivot === size) return ZERO
      if (pivot !== column) {
        ;[result[pivot], result[column]] = [result[column], result[pivot]]
        sign *= -1
      }
      const pivotValue = result[column][column]
      determinantValue = determinantValue.mul(pivotValue)
      for (let row = column + 1; row < size; row += 1) {
        if (result[row][column].isZero()) continue
        const factor = result[row][column].div(pivotValue)
        for (let inner = column; inner < size; inner += 1) {
          result[row][inner] = result[row][inner].sub(factor.mul(result[column][inner]))
        }
      }
    }
    return sign < 0 ? determinantValue.neg() : determinantValue
  }

  function inverse(matrix) {
    if (matrix.length !== matrix[0].length) throw new Error('只有方阵有逆矩阵')
    const size = matrix.length
    const augmented = matrix.map((row, index) => row.concat(identityMatrix(size)[index]))
    const reduced = rref(augmented)
    if (reduced.pivotColumns.slice(0, size).length !== size || reduced.pivotColumns.some((column, index) => index < size && column !== index)) {
      throw new Error('矩阵奇异，不存在逆矩阵')
    }
    return reduced.matrix.map(row => row.slice(size))
  }

  function trace(matrix) {
    if (matrix.length !== matrix[0].length) throw new Error('只有方阵定义迹')
    return matrix.reduce((sum, row, index) => sum.add(row[index]), ZERO)
  }

  function nullSpace(matrix) {
    const reduced = rref(matrix)
    const columnCount = matrix[0].length
    const pivotSet = new Set(reduced.pivotColumns)
    const freeColumns = Array.from({ length: columnCount }, (_, index) => index).filter(index => !pivotSet.has(index))
    return freeColumns.map(freeColumn => {
      const vector = Array.from({ length: columnCount }, () => ZERO)
      vector[freeColumn] = ONE
      reduced.pivotColumns.forEach((pivotColumn, row) => {
        vector[pivotColumn] = reduced.matrix[row][freeColumn].neg()
      })
      return vector
    })
  }

  function columnSpace(matrix) {
    const pivots = rref(matrix).pivotColumns
    return pivots.map(column => matrix.map(row => row[column]))
  }

  function characteristicPolynomial(matrix) {
    if (matrix.length !== matrix[0].length) throw new Error('只有方阵有特征多项式')
    const size = matrix.length
    const identity = identityMatrix(size)
    let previous = identity
    const coefficients = [ONE]
    for (let step = 1; step <= size; step += 1) {
      const product = multiply(matrix, previous)
      const coefficient = trace(product).div(new Rational(-step))
      coefficients.push(coefficient)
      previous = add(product, scale(identity, coefficient))
    }
    return coefficients
  }

  function plu(matrix) {
    if (matrix.length !== matrix[0].length) throw new Error('PLU 分解当前只支持方阵')
    const size = matrix.length
    const P = identityMatrix(size)
    const L = identityMatrix(size)
    const U = cloneMatrix(matrix)
    for (let column = 0; column < size; column += 1) {
      let pivot = column
      while (pivot < size && U[pivot][column].isZero()) pivot += 1
      if (pivot === size) throw new Error('矩阵奇异，当前精确 PLU 分解要求每一步都有非零主元')
      if (pivot !== column) {
        ;[U[pivot], U[column]] = [U[column], U[pivot]]
        ;[P[pivot], P[column]] = [P[column], P[pivot]]
        for (let index = 0; index < column; index += 1) {
          ;[L[pivot][index], L[column][index]] = [L[column][index], L[pivot][index]]
        }
      }
      for (let row = column + 1; row < size; row += 1) {
        const factor = U[row][column].div(U[column][column])
        L[row][column] = factor
        for (let inner = column; inner < size; inner += 1) {
          U[row][inner] = U[row][inner].sub(factor.mul(U[column][inner]))
        }
      }
    }
    return { P, L, U }
  }

  function ldu(matrix) {
    const decomposition = plu(matrix)
    const size = matrix.length
    const D = zeroMatrix(size, size)
    const unitU = zeroMatrix(size, size)
    for (let row = 0; row < size; row += 1) {
      const diagonal = decomposition.U[row][row]
      if (diagonal.isZero()) throw new Error('存在零主元，无法形成 LDU 分解')
      D[row][row] = diagonal
      for (let column = row; column < size; column += 1) {
        unitU[row][column] = decomposition.U[row][column].div(diagonal)
      }
    }
    return { P: decomposition.P, L: decomposition.L, D, U: unitU }
  }

  function isSymmetric(matrix) {
    if (matrix.length !== matrix[0].length) return false
    for (let row = 0; row < matrix.length; row += 1) {
      for (let column = row + 1; column < matrix.length; column += 1) {
        if (!matrix[row][column].equals(matrix[column][row])) return false
      }
    }
    return true
  }

  function ldlt(matrix) {
    if (!isSymmetric(matrix)) throw new Error('LDLᵀ 分解要求输入对称方阵')
    const size = matrix.length
    const L = identityMatrix(size)
    const D = zeroMatrix(size, size)
    for (let row = 0; row < size; row += 1) {
      let diagonal = matrix[row][row]
      for (let inner = 0; inner < row; inner += 1) {
        diagonal = diagonal.sub(L[row][inner].mul(L[row][inner]).mul(D[inner][inner]))
      }
      if (diagonal.isZero()) throw new Error('出现零主元；当前无主元交换的 LDLᵀ 分解无法继续')
      D[row][row] = diagonal
      for (let nextRow = row + 1; nextRow < size; nextRow += 1) {
        let value = matrix[nextRow][row]
        for (let inner = 0; inner < row; inner += 1) {
          value = value.sub(L[nextRow][inner].mul(L[row][inner]).mul(D[inner][inner]))
        }
        L[nextRow][row] = value.div(diagonal)
      }
    }
    return { L, D, LT: transpose(L) }
  }

  function orthogonalColumns(matrix) {
    const columns = transpose(matrix)
    const orthogonal = []
    const upper = zeroMatrix(columns.length, columns.length)
    const norms = []
    columns.forEach((column, columnIndex) => {
      let current = column.slice()
      upper[columnIndex][columnIndex] = ONE
      orthogonal.forEach((basis, basisIndex) => {
        let numerator = ZERO
        let denominator = ZERO
        for (let row = 0; row < column.length; row += 1) {
          numerator = numerator.add(basis[row].mul(column[row]))
          denominator = denominator.add(basis[row].mul(basis[row]))
        }
        if (denominator.isZero()) throw new Error('列向量线性相关，无法完成 QR 分解')
        const coefficient = numerator.div(denominator)
        upper[basisIndex][columnIndex] = coefficient
        current = current.map((value, row) => value.sub(coefficient.mul(basis[row])))
      })
      let normSquared = ZERO
      current.forEach(value => {
        normSquared = normSquared.add(value.mul(value))
      })
      if (normSquared.isZero()) throw new Error('列向量线性相关，无法完成满列秩 QR 分解')
      orthogonal.push(current)
      norms.push(normSquared)
    })
    return { orthogonal: transpose(orthogonal), upper, norms }
  }

  const api = {
    cloneMatrix,
    zeroMatrix,
    identityMatrix,
    transpose,
    multiply,
    add,
    scale,
    rref,
    determinant,
    inverse,
    trace,
    nullSpace,
    columnSpace,
    characteristicPolynomial,
    plu,
    ldu,
    isSymmetric,
    ldlt,
    orthogonalColumns,
  }

  root.ExactMatrix = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
