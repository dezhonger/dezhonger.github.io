---
title: 类欧几里得算法(二)
date: 2025-5-28 22:30:57
mathjax: true
tags:
- Algorithm
- Math
categories:
- Basic Algorithm
---


## 前言

本文以高中数学水平即可理解的方式，详细推导经典“类欧几里得”算法中的三个核心函数：

* $f(a,b,c,n)=\sum_{i=0}^n\left\lfloor\tfrac{a,i+b}{c}\right\rfloor$
* $g(a,b,c,n)=\sum_{i=0}^n i,\left\lfloor\tfrac{a,i+b}{c}\right\rfloor$
* $h(a,b,c,n)=\sum_{i=0}^n\left\lfloor\tfrac{a,i+b}{c}\right\rfloor^2$
<!-- more -->


---
## f(a,b,c,n) 的推导
$f(a,b,c,n)$ 的推导
（此部分内容与前文一致，可参考前节）

*略*

---

## g(a,b,c,n) 的推导
$g(a,b,c,n)$ 的推导

### 问题定义

$$
g(a,b,c,n)
= \sum_{i=0}^n i\,\left\lfloor\frac{a\,i + b}{c}\right\rfloor.
$$

与 $f$ 类似，我们同样分两种情形：

#### 若 $a\ge c$ 或 $b\ge c$

像 $f$ 一样，先拆商与余：

$$
a=\lfloor\tfrac{a}{c}\rfloor c + (a\bmod c),\quad
b=\lfloor\tfrac{b}{c}\rfloor c + (b\bmod c).
$$

代入：

$$
\sum_{i=0}^{n} i\left\lfloor\tfrac{a\,i+b}{c}\right\rfloor
= \sum_{i=0}^{n} i\Bigl(\lfloor\tfrac{a}{c}\rfloor i + \lfloor\tfrac{b}{c}\rfloor + \lfloor\tfrac{(a\bmod c)\,i + (b\bmod c)}{c}\rfloor\Bigr).
$$

将三项拆开：

1. $\lfloor\tfrac{a}{c}\rfloor\sum i^2 = A\tfrac{n(n+1)(2n+1)}6$；
2. $\lfloor\tfrac{b}{c}\rfloor\sum i = B\tfrac{n(n+1)}2$；
3. 剩余部分构成 $g(a\bmod c,b\bmod c,c,n)$。

于是当 $a\ge c$ 或 $b\ge c$ 时：

$$
\begin{aligned}
g(a, b, c, n) &= A \cdot \frac{n(n+1)(2n+1)}{6} + B \cdot \frac{n(n+1)}{2} + g(a \bmod c, b \bmod c, c, n)
\end{aligned}
$$

#### 关键情形：$a<c$ 且 $b<c$

依然使用“指示函数 + 交换求和”技巧：

1. **展开 floor**

   $$
   \left\lfloor\tfrac{a\,i+b}{c}\right\rfloor
   = \sum_{j\ge1}\mathbf1\bigl(j\le\tfrac{a\,i+b}{c}\bigr).
   $$

2. **交换求和**

   $$
   g
   = \sum_{i=0}^n i\sum_{j\ge1}\mathbf1(j\le\tfrac{a\,i+b}{c})
   = \sum_{j=0}^{m-1}\sum_{i=0}^n i\,\mathbf1(i>t_j),
   $$

   其中 $m=\lfloor\tfrac{a,n+b}{c}\rfloor$，$t_j=\lfloor\tfrac{j,c-b-1}{a}\rfloor$。

3. **统计 $i>t_j$ 时的 $i$ 之和**

$$
\begin{aligned}
\sum_{i=0}^n i\,\mathbf{1}(i>t_j) &= \sum_{i=t_j+1}^n i \\
&= \frac{n(n+1)}{2} - \frac{t_j(t_j+1)}{2} \\
&= \frac{(n-t_j)(n+t_j+1)}{2}.
\end{aligned}
$$

4. **合并对 $j$ 求和**
$$
\begin{aligned}
g &= \sum_{j=0}^{m-1}\frac{(n-t_j)(n+t_j+1)}{2} \\
  &= \frac{1}{2}\left(
      m\,n(n+1) - \sum_{j=0}^{m-1}t_j(t_j+1)
     \right). \\
\sum t_j &= f(c, c-b-1, a, m-1), \\
\sum t_j^2 &= h(c, c-b-1, a, m-1).
\end{aligned}
$$
5. **写出递归**

$$
g(a,b,c,n)
= \tfrac12\Bigl[
 m\,n(n+1) - h(c,c-b-1,a,m-1) - f(c,c-b-1,a,m-1)
\Bigr],
$$

其中 $m=\lfloor\frac{a,n+b}{c}\rfloor$。

---

## h(a,b,c,n) 的推导
$h(a,b,c,n)$ 的推导

### 问题定义

$$
h(a,b,c,n)
= \sum_{i=0}^n \left\lfloor\frac{a\,i + b}{c}\right\rfloor^2.
$$

### 拆平方与指示函数

利用恒等式 $L^2 = 2\sum_{j=1}^L j - L$，令 $L_i=\lfloor\tfrac{a,i+b}{c}\rfloor$：

$$
h = \sum L_i^2
= 2\sum_{i=0}^n\sum_{j=1}^{L_i}j - \sum_{i=0}^n L_i
= 2\sum_{i=0}^n\sum_{j=1}^{L_i}j - f(a,b,c,n).
$$

### 交换求和并统计

1. 展开：

   $$
   \sum_{i=0}^n\sum_{j=1}^{L_i}j
   = \sum_{j=1}^m j\sum_{i=0}^n\mathbf1(j\le L_i),
   $$

   其中 $m=\lfloor(a,n+b)/c\rfloor$。
2. 指示条件同 $f,g$，有 $\mathbf1(j\le L_i)=\mathbf1(i>t_j)$。
3. **统计** $\sum_{i=0}^n\mathbf1(i>t_j) = n-t_j$。
4. 合并：

$$
2\sum_{j=1}^m j(n-t_j) - f(a,b,c,n)
= 2\sum_{j=0}^{m-1}(j+1)(n-t_j) - f(a,b,c,n).
$$

### 识别子问题与递归形式

同样令 $t_j=\lfloor\tfrac{j,c-b-1}{a}\rfloor$，参数置换得到：


$$
\begin{aligned}
\sum t_j &= f(c, c-b-1, a, m-1), \\
\sum (j+1)t_j &= g(c, c-b-1, a, m-1) + f(c, c-b-1, a, m-1).
\end{aligned}
$$

故

$$
\begin{aligned}
h(a, b, c, n) &= n \cdot m \cdot (m+1) \\
& \quad - 2 \cdot g(c, c-b-1, a, m-1) \\
& \quad - 2 \cdot f(c, c-b-1, a, m-1) \\
& \quad - f(a, b, c, n),
\end{aligned}
$$

其中 $m=\lfloor(a,n+b)/c\rfloor$。

---

## 代码实现

三函数在每次递归时，参数都被置换并减小，整体时间复杂度 $O(\log n)$。
[模板题](https://www.luogu.com.cn/problem/P5170)

给定 $n,\,a,\,b,\,c$ ，分别求 $\sum\limits_{i=0}^{n}\lfloor \frac{ai+b}{c} \rfloor\,,\  \sum\limits_{i=0}^{n}{\lfloor \frac{ai+b}{c} \rfloor}^2\,,\  \sum\limits_{i=0}^{n}i\lfloor \frac{ai+b}{c} \rfloor$ ，答案对 $998244353$ 取模。多组数据。
第一行给出数据组数 $t$ 。
接下来 $t$ 行，每行有四个整数，分别为每组数据的 $n,\ a,\ b,\ c$ 。
对于每组数据，输出一行三个整数，为三个答案对 $998244353$ 取模的结果。
对于所有测试点，有 $1 \leqslant t \leqslant 10^5,\ 0 \leqslant n,\,a,\,b,\,c \leqslant 10^9,\ c \neq 0$ 。
```cpp
#include <cstdio>
using namespace std;
constexpr long long P = 998244353;
long long i2 = 499122177, i6 = 166374059;

struct data_t {
  data_t() { f = g = h = 0; }

  long long f, g, h;
};  // 三个函数打包

data_t calc(long long n, long long a, long long b, long long c) {
  long long ac = a / c, bc = b / c, m = (a * n + b) / c, n1 = n + 1,
            n21 = n * 2 + 1;
  data_t d;
  if (a == 0) {  // 迭代到最底层
    d.f = bc * n1 % P;
    d.g = bc * n % P * n1 % P * i2 % P;
    d.h = bc * bc % P * n1 % P;
    return d;
  }
  if (a >= c || b >= c) {  // 取模
    d.f = n * n1 % P * i2 % P * ac % P + bc * n1 % P;
    d.g = ac * n % P * n1 % P * n21 % P * i6 % P + bc * n % P * n1 % P * i2 % P;
    d.h = ac * ac % P * n % P * n1 % P * n21 % P * i6 % P +
          bc * bc % P * n1 % P + ac * bc % P * n % P * n1 % P;
    d.f %= P, d.g %= P, d.h %= P;

    data_t e = calc(n, a % c, b % c, c);  // 迭代

    d.h += e.h + 2 * bc % P * e.f % P + 2 * ac % P * e.g % P;
    d.g += e.g, d.f += e.f;
    d.f %= P, d.g %= P, d.h %= P;
    return d;
  }
  data_t e = calc(m - 1, c, c - b - 1, a);
  d.f = n * m % P - e.f, d.f = (d.f % P + P) % P;
  d.g = m * n % P * n1 % P - e.h - e.f, d.g = (d.g * i2 % P + P) % P;
  d.h = n * m % P * (m + 1) % P - 2 * e.g - 2 * e.f - d.f;
  d.h = (d.h % P + P) % P;
  return d;
}

long long T, n, a, b, c;

signed main() {
  scanf("%lld", &T);
  while (T--) {
    scanf("%lld%lld%lld%lld", &n, &a, &b, &c);
    data_t ans = calc(n, a, b, c);
    printf("%lld %lld %lld\n", ans.f, ans.h, ans.g);
  }
  return 0;
}

```
