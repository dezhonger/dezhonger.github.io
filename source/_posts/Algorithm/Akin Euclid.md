---
title: 类欧几里得算法(一)
date: 2025-5-28 22:22:35
mathjax: true
tags:
- Algorithm
- Math
categories:
- Basic Algorithm
---

## 前言

推导 $f(a,b,c,n)=\displaystyle\sum_{i=0}^n\Bigl\lfloor\frac{a i+b}{c}\Bigr\rfloor$ 的详细过程.


本文档将以最详细的步骤，通过公式与文字说明相结合的方式记录“类欧几里得”算法中 $f(a,b,c,n)$ 函数的推导过程。
<!-- more -->

---

## 问题定义

我们要计算

$$
 f(a,b,c,n) \;=\; \sum_{i=0}^n \Bigl\lfloor\frac{a\,i + b}{c}\Bigr\rfloor,
$$

其中 $a,b,c,n$ 均为非负整数，要求设计一个 **$O(\log n)$** 的算法。

---

## 划分两种情形：处理 $a\ge c$ 或 $b\ge c$

当 $a\ge c$ 或者 $b\ge c$ 时，可以利用取模简化：

1. 写出商和余数：

   $$
     a = \bigl\lfloor\tfrac{a}{c}\bigr\rfloor\,c \, + \,(a \bmod c),
     \quad
     b = \bigl\lfloor\tfrac{b}{c}\bigr\rfloor\,c \, + \,(b \bmod c).
   $$
2. 代入原式：
$$
\begin{aligned}
 f(a,b,c,n)&= \sum_{i=0}^n \Bigl\lfloor\tfrac{a\,i+b}{c}\Bigr\rfloor \\
            &= \sum_{i=0}^n \Bigl\lfloor
                \tfrac{(\lfloor\tfrac{a}{c}\rfloor c + (a\bmod c))\,i
                      + (\lfloor\tfrac{b}{c}\rfloor c + (b\bmod c))}{c}
              \Bigr\rfloor \\
            &= \sum_{i=0}^n \Bigl(
                \lfloor\tfrac{a}{c}\rfloor\,i
                + \lfloor\tfrac{b}{c}\rfloor
                + \Bigl\lfloor\tfrac{(a\bmod c)\,i + (b\bmod c)}{c}\Bigr\rfloor
              \Bigr) \\
            &= \underbrace{\lfloor\tfrac{a}{c}\rfloor}_{A}\sum_{i=0}^n i
              + (n+1)\underbrace{\lfloor\tfrac{b}{c}\rfloor}_{B}
              + f(a\bmod c,\,b\bmod c,\,c,\,n).
\end{aligned}
$$



3. 注意 $\sum_{i=0}^n i=\frac{n(n+1)}2$，得到

   $$
     f(a,b,c,n)
     = A\frac{n(n+1)}2 + B\,(n+1) + f(a\bmod c,b\bmod c,c,n).
   $$

这样，每次如果 $a\ge c$ 或 $b\ge c$，就可以降低 $a$ 或 $b$ 的规模。

---

## 关键情形：$a<c$ 且 $b<c$

此时商的表达式只有一个变量 $i$，不能再像上面那样直接拆分。我们采用**指示函数 + 交换求和**的技巧。

### 将整除商写成指示函数之和

对任意非负实数 $X$，有

$$
\lfloor X\rfloor \;=\; \sum_{j=1}^{\lfloor X\rfloor}1
               = \sum_{j\ge1}\mathbf1\bigl(j\le X\bigr),
$$

其中 $\mathbf1(\cdot)$ 为指示函数（条件成立时取 1，否则取 0）。

因此

$$
\Bigl\lfloor\frac{a\,i+b}{c}\Bigr\rfloor
= \sum_{j\ge1} \mathbf1\!\Bigl(j \le \tfrac{a\,i+b}{c}\Bigr).
$$

### 交换求和顺序

原式

$$
\sum_{i=0}^n \Bigl\lfloor\frac{a\,i+b}{c}\Bigr\rfloor
= \sum_{i=0}^n \sum_{j\ge1} \mathbf1\Bigl(j\le\tfrac{a\,i+b}{c}\Bigr)
= \sum_{j\ge1} \sum_{i=0}^n \mathbf1\Bigl(j\le\tfrac{a\,i+b}{c}\Bigr).
$$

注意当 $j>\lfloor\tfrac{a,n+b}{c}\rfloor:=m$ 时，内层全是 0，因此可以令

$$
m = \Bigl\lfloor\tfrac{a\,n+b}{c}\Bigr\rfloor,
\quad j=0,1,\dots,m
$$

最后写成

$$
 f(a,b,c,n)
= \sum_{j=0}^{m}\sum_{i=0}^n \mathbf1\Bigl(j\le\tfrac{a\,i+b}{c}\Bigr).
$$

### 将指示条件转换成对 $i$ 的不等式

$$
j\le\frac{a\,i+b}{c}
\iff j\,c \le a\,i + b
\iff a\,i \ge j\,c - b
\iff i \ge \frac{j\,c - b}{a}.
$$

由于 $i$ 为整数，等价于

$$
i \ge \Bigl\lceil\tfrac{j\,c - b}{a}\Bigr\rceil
\iff i > \Bigl\lfloor\tfrac{j\,c - b -1}{a}\Bigr\rfloor.
$$

定义

$$
t_j \;=\; \Bigl\lfloor\frac{j\,c - b -1}{a}\Bigr\rfloor.
$$

于是

$$
\mathbf1\Bigl(j\le\frac{a\,i+b}{c}\Bigr)
= \mathbf1(i>t_j),
$$

意味着“对每个 $j$，内层 $i$ 的计数是满足 $i>t_j$ 的那些 $i$”。

### 统计满足 $i>t_j$ 的 $i$ 个数

$i$ 在 $0,1,\dots,n$ 中，满足 $i>t\_j$ 的整数一共有

$$
\underbrace{(n+1)}_{i=0..n} - \underbrace{(t_j+1)}_{i=0..t_j}
= n - t_j.
$$

因此

$$
\sum_{i=0}^n \mathbf1(i>t_j)
= n - t_j.
$$

### 合并外层求和

回到

$$
f(a,b,c,n)
= \sum_{j=0}^m \bigl(n - t_j\bigr)
= (m+1)n - \sum_{j=0}^m t_j.
$$

注意我们原本定义的

$$
 f(x,y,z,N)
= \sum_{k=0}^N \Bigl\lfloor\frac{x\,k+y}{z}\Bigr\rfloor,
$$

与

$$
 t_j=\Bigl\lfloor\frac{j\,c+(c-b-1)}{a}\Bigr\rfloor
$$

**形式完全相同**，只需置换参数

* 把 $(a,b,c,n)$ 换成 $(c,\,c-b-1,\,a,\,m)$。

于是

$$
\sum_{j=0}^m t_j
= f\bigl(c,\,c-b-1,\,a,\,m\bigr).
$$

最后得到递归：

$$
f(a,b,c,n)
= (m+1)n - f(c,c-b-1,a,m),
m = \lfloor (a n + b)/c \rfloor.
$$

---

## 总结与算法实现

1. **初始化** 通过取模处理，将任意 $(a,b)$ 转换到 $a <c,b<c$（缩小参数）。
2. **递归公式** 当 $a<c$ 且 $b<c$ 时：

   $$
    f(a,b,c,n) = (m+1)n \;-\; f(c,c-b-1,a,m),
    \quad m=\lfloor\tfrac{an+b}{c}\rfloor.
   $$
3. **递归终止** 当 $n<0$ 时返回 0；当 $a=0$ 时结果为 $(n+1)\lfloor b/c\rfloor$。
4. **复杂度** 每次递归都将 $(a,b,n)$ 映射到 $(c,,c-b-1,,m)$，且 $m=\lfloor( a n + b)/c\rfloor< n$，同类欧几里得算法，复杂度 $O(\log n)$。
