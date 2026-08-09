(function (root) {
  'use strict'

  const M = root.ExactMath || (typeof require === 'function' ? require('./exact-math-core.js') : null)
  if (!M) throw new Error('ExactMath 未加载')
  const { absBigInt, gcdBigInt, extendedGcd, parseInteger, appendResult, setStatus, typeset } = M
  const TWO_TO_64 = 18446744073709551616n
  const DETERMINISTIC_BASES_64 = [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n]
  const LARGE_BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n]

  function mod(value, modulus) {
    const result = value % modulus
    return result < 0n ? result + modulus : result
  }

  function modPow(base, exponent, modulus) {
    let result = 1n
    let current = mod(base, modulus)
    let power = exponent
    while (power > 0n) {
      if (power & 1n) result = (result * current) % modulus
      current = (current * current) % modulus
      power >>= 1n
    }
    return result
  }

  function primality(value) {
    const n = BigInt(value)
    if (n < 2n) return { prime: false, proven: true, reason: '小于 2' }
    const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]
    for (const prime of smallPrimes) {
      if (n === prime) return { prime: true, proven: true, reason: '小质数' }
      if (n % prime === 0n) return { prime: false, proven: true, divisor: prime }
    }
    let d = n - 1n
    let s = 0
    while ((d & 1n) === 0n) {
      d >>= 1n
      s += 1
    }
    const deterministic = n < TWO_TO_64
    const bases = deterministic ? DETERMINISTIC_BASES_64 : LARGE_BASES
    for (const rawBase of bases) {
      const base = rawBase % n
      if (base === 0n) continue
      let witness = modPow(base, d, n)
      if (witness === 1n || witness === n - 1n) continue
      let passed = false
      for (let round = 1; round < s; round += 1) {
        witness = (witness * witness) % n
        if (witness === n - 1n) {
          passed = true
          break
        }
      }
      if (!passed) return { prime: false, proven: true, witness: rawBase }
    }
    return {
      prime: true,
      proven: deterministic,
      rounds: bases.length,
      reason: deterministic ? '64 位整数的确定性 Miller–Rabin' : '多基强伪素数检验',
    }
  }

  function nextFrame() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
      else setTimeout(resolve, 0)
    })
  }

  async function pollardBrent(n, seed, deadline) {
    if (n % 2n === 0n) return 2n
    if (n % 3n === 0n) return 3n
    let y = 2n + BigInt(seed * 2)
    let c = 1n + BigInt(seed * 4)
    const batchSize = 96
    let factor = 1n
    let roundLength = 1
    let checkpoint = y
    let steps = 0
    while (factor === 1n && Date.now() < deadline && steps < 240000) {
      const x = y
      for (let index = 0; index < roundLength; index += 1) y = (y * y + c) % n
      let offset = 0
      while (offset < roundLength && factor === 1n) {
        checkpoint = y
        let product = 1n
        const limit = Math.min(batchSize, roundLength - offset)
        for (let index = 0; index < limit; index += 1) {
          y = (y * y + c) % n
          product = (product * absBigInt(x - y)) % n
        }
        factor = gcdBigInt(product, n)
        offset += limit
        steps += limit
        if ((steps & 4095) === 0) await nextFrame()
        if (Date.now() >= deadline) break
      }
      roundLength *= 2
    }
    if (factor === n) {
      const x = y
      do {
        checkpoint = (checkpoint * checkpoint + c) % n
        factor = gcdBigInt(absBigInt(x - checkpoint), n)
        steps += 1
        if ((steps & 4095) === 0) await nextFrame()
      } while (factor === 1n && Date.now() < deadline && steps < 300000)
    }
    return factor > 1n && factor < n ? factor : null
  }

  async function factorize(value, options) {
    const settings = Object.assign({ timeLimitMs: 12000 }, options || {})
    let n = absBigInt(BigInt(value))
    if (n < 2n) return { factors: [], unresolved: [], exactProduct: n }
    const factors = []
    const unresolved = []
    const deadline = Date.now() + settings.timeLimitMs

    function takeFactor(prime) {
      while (n % prime === 0n) {
        factors.push({ value: prime, proven: true })
        n /= prime
      }
    }

    takeFactor(2n)
    takeFactor(3n)
    takeFactor(5n)
    let candidate = 7n
    const increments = [4n, 2n, 4n, 2n, 4n, 6n, 2n, 6n]
    let incrementIndex = 0
    while (candidate <= 100000n && candidate * candidate <= n) {
      takeFactor(candidate)
      candidate += increments[incrementIndex]
      incrementIndex = (incrementIndex + 1) % increments.length
    }

    const stack = n > 1n ? [n] : []
    while (stack.length) {
      const current = stack.pop()
      const result = primality(current)
      if (result.prime) {
        factors.push({ value: current, proven: result.proven })
        continue
      }
      if (Date.now() >= deadline) {
        unresolved.push(current)
        continue
      }
      let divisor = null
      for (let attempt = 1; attempt <= 8 && !divisor && Date.now() < deadline; attempt += 1) {
        divisor = await pollardBrent(current, attempt, deadline)
      }
      if (!divisor) unresolved.push(current)
      else {
        stack.push(divisor)
        stack.push(current / divisor)
      }
    }
    factors.sort((left, right) => (left.value < right.value ? -1 : left.value > right.value ? 1 : 0))
    unresolved.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    return { factors, unresolved, exactProduct: absBigInt(BigInt(value)) }
  }

  function groupFactors(factors) {
    const groups = []
    factors.forEach(factor => {
      const last = groups[groups.length - 1]
      if (last && last.value === factor.value) {
        last.exponent += 1
        last.proven = last.proven && factor.proven
      } else groups.push({ value: factor.value, exponent: 1, proven: factor.proven })
    })
    return groups
  }

  let sieveState = null

  function buildSieve() {
    if (sieveState) return sieveState
    const limit = 5000000
    const composite = new Uint8Array(limit + 1)
    const pi = new Uint32Array(limit + 1)
    const primes = []
    for (let value = 2; value <= limit; value += 1) {
      if (!composite[value]) primes.push(value)
      for (let index = 0; index < primes.length; index += 1) {
        const product = value * primes[index]
        if (product > limit) break
        composite[product] = 1
        if (value % primes[index] === 0) break
      }
      pi[value] = primes.length
    }
    sieveState = { limit, pi, primes, lehmerMemo: new Map(), phiMemo: new Map() }
    return sieveState
  }

  function integerRootNumber(value, degree) {
    let rootValue = Math.floor(Math.pow(value, 1 / degree))
    while (Math.pow(rootValue + 1, degree) <= value) rootValue += 1
    while (Math.pow(rootValue, degree) > value) rootValue -= 1
    return rootValue
  }

  function phi(x, s, state) {
    if (s === 0) return x
    if (s === 1) return x - Math.floor(x / 2)
    if (s === 2) return x - Math.floor(x / 2) - Math.floor(x / 3) + Math.floor(x / 6)
    if (x <= state.limit) {
      const primeCountAtX = state.pi[x]
      if (s >= primeCountAtX) return 1
      const lastExcludedPrime = state.primes[s - 1]
      if (lastExcludedPrime * lastExcludedPrime > x) return primeCountAtX - s + 1
    }
    const cacheable = s <= 200 && state.phiMemo.size < 600000
    const key = cacheable ? `${x}:${s}` : ''
    if (cacheable && state.phiMemo.has(key)) return state.phiMemo.get(key)
    const result = phi(x, s - 1, state) - phi(Math.floor(x / state.primes[s - 1]), s - 1, state)
    if (cacheable) state.phiMemo.set(key, result)
    return result
  }

  function lehmerPi(x) {
    const state = buildSieve()
    if (x < state.limit) return state.pi[x]
    if (state.lehmerMemo.has(x)) return state.lehmerMemo.get(x)
    const a = lehmerPi(integerRootNumber(x, 4))
    const b = lehmerPi(integerRootNumber(x, 2))
    const c = lehmerPi(integerRootNumber(x, 3))
    let result = phi(x, a, state) + Math.floor(((b + a - 2) * (b - a + 1)) / 2)
    for (let index = a; index < b; index += 1) {
      const quotient = Math.floor(x / state.primes[index])
      result -= lehmerPi(quotient)
      if (index < c) {
        const limit = lehmerPi(integerRootNumber(quotient, 2))
        for (let inner = index; inner < limit; inner += 1) {
          result -= lehmerPi(Math.floor(quotient / state.primes[inner])) - inner
        }
      }
    }
    state.lehmerMemo.set(x, result)
    return result
  }

  function primeCount(value) {
    const x = parseInteger(value, { allowNegative: false, maxDigits: 14 })
    if (x > 10000000000000n) throw new Error('当前浏览器版精确支持 0 ≤ x ≤ 10^13')
    return BigInt(lehmerPi(Number(x)))
  }

  function parseCongruences(raw) {
    const lines = String(raw).split(/\n|;/).map(line => line.trim()).filter(Boolean)
    if (!lines.length) throw new Error('请至少输入一个同余式')
    if (lines.length > 30) throw new Error('一次最多合并 30 个同余式')
    return lines.map((originalLine, index) => {
      const line = originalLine.replace(/−/g, '-').replace(/（/g, '(').replace(/）/g, ')')
      let match = line.match(/^(?:x\s*)?(?:≡|=)\s*([+-]?\d+)\s*(?:\(\s*)?(?:mod|模)\s*([+-]?\d+)\s*\)?$/i)
      if (!match) match = line.match(/^([+-]?\d+)\s*(?:\(\s*)?(?:mod|模)\s*([+-]?\d+)\s*\)?$/i)
      if (!match) match = line.match(/^([+-]?\d+)(?:\s*[,，]\s*|\s+)([+-]?\d+)$/)
      if (!match) throw new Error(`第 ${index + 1} 行格式无法识别，请使用“余数 mod 模数”或“余数 模数”`)
      const remainder = parseInteger(match[1], { maxDigits: 140 })
      const rawModulus = parseInteger(match[2], { maxDigits: 140 })
      if (rawModulus === 0n) throw new Error(`第 ${index + 1} 行的模数不能为 0`)
      const modulus = absBigInt(rawModulus)
      return { remainder: mod(remainder, modulus), modulus, original: originalLine }
    })
  }

  function generalizedCrt(congruences) {
    if (!Array.isArray(congruences) || !congruences.length) throw new Error('请至少提供一个同余式')
    let remainder = mod(BigInt(congruences[0].remainder), absBigInt(BigInt(congruences[0].modulus)))
    let modulus = absBigInt(BigInt(congruences[0].modulus))
    if (modulus === 0n) throw new Error('模数不能为 0')
    const steps = []
    for (let index = 1; index < congruences.length; index += 1) {
      const nextModulus = absBigInt(BigInt(congruences[index].modulus))
      if (nextModulus === 0n) throw new Error('模数不能为 0')
      const nextRemainder = mod(BigInt(congruences[index].remainder), nextModulus)
      const difference = nextRemainder - remainder
      const commonDivisor = gcdBigInt(modulus, nextModulus)
      if (difference % commonDivisor !== 0n) {
        return {
          solvable: false,
          remainder,
          modulus,
          conflict: { index, nextRemainder, nextModulus, difference, commonDivisor },
          steps,
        }
      }
      const leftReduced = modulus / commonDivisor
      const rightReduced = nextModulus / commonDivisor
      const bezout = extendedGcd(leftReduced, rightReduced)
      const multiplier = mod((difference / commonDivisor) * bezout.x, rightReduced)
      const mergedModulus = modulus * rightReduced
      const mergedRemainder = mod(remainder + modulus * multiplier, mergedModulus)
      steps.push({
        leftRemainder: remainder,
        leftModulus: modulus,
        rightRemainder: nextRemainder,
        rightModulus: nextModulus,
        commonDivisor,
        multiplier,
        mergedRemainder,
        mergedModulus,
      })
      remainder = mergedRemainder
      modulus = mergedModulus
    }
    return { solvable: true, remainder, modulus, steps }
  }

  const api = { modPow, primality, factorize, groupFactors, primeCount, lehmerPi, parseCongruences, generalizedCrt }
  root.ExactNumberTheory = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api

  if (typeof document === 'undefined') return

  const integerInput = document.getElementById('nt-integer')
  const integerOutput = document.getElementById('nt-output')
  const integerStatus = document.getElementById('nt-status')
  const primeButton = document.getElementById('prime-check-btn')
  const factorButton = document.getElementById('factor-btn')
  const piInput = document.getElementById('pi-input')
  const piOutput = document.getElementById('pi-output')
  const piStatus = document.getElementById('pi-status')
  const euclidOutput = document.getElementById('euclid-output')
  const euclidStatus = document.getElementById('euclid-status')
  const crtOutput = document.getElementById('crt-output')
  const crtStatus = document.getElementById('crt-status')

  function prepareOutput(container, status) {
    container.innerHTML = ''
    setStatus(status, '', '')
  }

  primeButton.addEventListener('click', () => {
    prepareOutput(integerOutput, integerStatus)
    try {
      const n = parseInteger(integerInput.value, { allowNegative: false, maxDigits: 140 })
      const result = primality(n)
      if (!result.prime) {
        const detail = result.divisor ? `可被 ${result.divisor} 整除。` : result.witness ? `底数 ${result.witness} 给出了合数见证。` : result.reason
        appendResult(integerOutput, '判定结果', `${n}\\text{ 是合数}`, detail)
      } else if (result.proven) {
        appendResult(integerOutput, '判定结果', `${n}\\text{ 是质数}`, '在 n < 2^64 范围内使用确定性 Miller–Rabin 基底集合，结论为确定性。')
      } else {
        appendResult(integerOutput, '判定结果', `${n}\\text{ 是强可能质数}`, `已通过 ${result.rounds} 个基底的强伪素数检验。由于 n ≥ 2^64，页面不会把概率性结果伪装成严格素性证明。`)
      }
      typeset([integerOutput])
    } catch (error) {
      setStatus(integerStatus, error.message, 'error')
    }
  })

  factorButton.addEventListener('click', async () => {
    prepareOutput(integerOutput, integerStatus)
    factorButton.disabled = true
    setStatus(integerStatus, '正在进行试除与 Pollard–Brent 分解…', 'working')
    try {
      const n = parseInteger(integerInput.value, { allowNegative: false, maxDigits: 140 })
      if (n < 2n) throw new Error('质因数分解要求整数 n ≥ 2')
      await nextFrame()
      const result = await factorize(n)
      const groups = groupFactors(result.factors)
      const parts = groups.map(group => `${group.value}${group.exponent > 1 ? `^{${group.exponent}}` : ''}`)
      result.unresolved.forEach(value => parts.push(`\\underbrace{${value}}_{\\text{未分解余因子}}`))
      appendResult(integerOutput, '质因数分解', `${n}=${parts.join('\\cdot ') || n}`)
      const probable = groups.filter(group => !group.proven).map(group => String(group.value))
      if (!result.unresolved.length && !probable.length) {
        setStatus(integerStatus, '分解完成；乘积与原数完全一致。', 'success')
      } else if (!result.unresolved.length) {
        setStatus(integerStatus, `分解完成；大因子 ${probable.join(', ')} 仅通过概率素性检验。`, 'working')
      } else {
        setStatus(integerStatus, '已返回精确的部分分解；困难余因子在本次浏览器时间预算内未拆开。', 'working')
      }
      typeset([integerOutput])
    } catch (error) {
      setStatus(integerStatus, error.message, 'error')
    } finally {
      factorButton.disabled = false
    }
  })

  document.getElementById('pi-btn').addEventListener('click', async () => {
    prepareOutput(piOutput, piStatus)
    setStatus(piStatus, '正在初始化筛表并计算 Lehmer π(x)…', 'working')
    try {
      await nextFrame()
      const x = parseInteger(piInput.value, { allowNegative: false, maxDigits: 14 })
      const result = primeCount(x)
      appendResult(piOutput, '素数计数', `\\pi(${x})=${result}`, `区间 [1, ${x}] 中共有 ${result} 个质数。结果是整数精确值。`)
      setStatus(piStatus, '计算完成。', 'success')
      typeset([piOutput])
    } catch (error) {
      setStatus(piStatus, error.message, 'error')
    }
  })

  document.getElementById('euclid-btn').addEventListener('click', () => {
    prepareOutput(euclidOutput, euclidStatus)
    try {
      const a = parseInteger(document.getElementById('euclid-a').value, { maxDigits: 140 })
      const b = parseInteger(document.getElementById('euclid-b').value, { maxDigits: 140 })
      const result = extendedGcd(a, b)
      const lcm = a === 0n || b === 0n ? 0n : absBigInt((a / result.gcd) * b)
      appendResult(euclidOutput, '最大公因数与最小公倍数', `\\gcd(${a},${b})=${result.gcd},\\qquad \\operatorname{lcm}(${a},${b})=${lcm}`)
      appendResult(euclidOutput, 'Bézout 等式', `${a}\\cdot(${result.x})+${b}\\cdot(${result.y})=${result.gcd}`)
      const modulusRaw = document.getElementById('euclid-modulus').value.trim()
      if (modulusRaw) {
        const modulus = parseInteger(modulusRaw, { allowNegative: false, maxDigits: 140 })
        if (modulus <= 1n) throw new Error('模数必须大于 1')
        const inverseResult = extendedGcd(a, modulus)
        if (inverseResult.gcd === 1n) {
          appendResult(euclidOutput, '模逆元', `${a}^{-1}\\pmod{${modulus}}=${mod(inverseResult.x, modulus)}`)
        } else appendResult(euclidOutput, '模逆元', `\\gcd(${a},${modulus})=${inverseResult.gcd}\\ne1`, '模逆元不存在。')
      }
      typeset([euclidOutput])
    } catch (error) {
      setStatus(euclidStatus, error.message, 'error')
    }
  })

  document.getElementById('crt-btn').addEventListener('click', () => {
    prepareOutput(crtOutput, crtStatus)
    try {
      const congruences = parseCongruences(document.getElementById('crt-input').value)
      const system = congruences.map(item => `x\\equiv ${item.remainder}\\pmod{${item.modulus}}`).join(' \\\\ ')
      appendResult(crtOutput, '标准化同余方程组', `\\begin{cases}${system}\\end{cases}`)
      const result = generalizedCrt(congruences)
      result.steps.forEach((step, index) => {
        appendResult(
          crtOutput,
          `第 ${index + 1} 次合并`,
          `g=\\gcd(${step.leftModulus},${step.rightModulus})=${step.commonDivisor},\\qquad t=${step.multiplier},\\qquad x\\equiv ${step.mergedRemainder}\\pmod{${step.mergedModulus}}`,
          '先检查余数之差能否被最大公因数整除，再在约去公因数后的模数上求逆元。',
        )
      })
      if (!result.solvable) {
        const conflict = result.conflict
        appendResult(crtOutput, '无解', `${conflict.difference}\\not\\equiv 0\\pmod{${conflict.commonDivisor}}`, `第 ${conflict.index + 1} 个同余式与当前合并结果冲突，因此整个方程组无解。`)
        setStatus(crtStatus, '同余方程组无解。', 'error')
      } else {
        appendResult(crtOutput, '通解', `x\\equiv ${result.remainder}\\pmod{${result.modulus}},\\qquad x=${result.remainder}+${result.modulus}k,\\quad k\\in\\mathbb{Z}`)
        setStatus(crtStatus, '合并完成；不要求输入模数两两互质。', 'success')
      }
      typeset([crtOutput])
    } catch (error) {
      setStatus(crtStatus, error.message, 'error')
    }
  })
})(typeof window !== 'undefined' ? window : globalThis)
