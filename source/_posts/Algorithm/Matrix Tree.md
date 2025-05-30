---
title: 矩阵树定理
date: 2025-5-30 14:44:26
mathjax: true
tags:
- Algorithm
- Math
- Graph Theory
categories:
- Basic Algorithm
---

## 前言

本文会介绍图论中的矩阵树定理(包括有向图和无向图), 欧拉图的Best定理. 本文不包含定理的证明,只介绍如何使用.

## 应用场景
矩阵树定理解决了一张图的生成树个数计数问题。

## 无向图

> 给定 n 个点 m 条边的无向图，求图的生成树个数的问题. 可以有重边,不能有自环.

设 $G$ 是一个有 $n$ 个顶点的无向图。定义度数矩阵 $D(G)$ 为

$$
D_{ij}(G) = 
\begin{cases}
\deg(i), & \text{如果 } i = j, \\
0, & \text{如果 } i \neq j.
\end{cases}
$$

设 $\#e(i, j)$ 为点 $i$ 与点 $j$ 相连的边数，并定义邻接矩阵 $A$ 为
$$
A_{ij}(G)=
\begin{cases}
0, & i = j \\
\#e(i, j), & i\neq j
\end{cases}
$$ 

定义 Laplace 矩阵（亦称 Kirchhoff 矩阵） $L$ 为
$ L(G) = D(G) - A(G) $
记图 $G$ 的所有生成树个数为 $t(G)$。

### 矩阵树定理(无向图)
定义 $[n]=\{1,2,\cdots,n\}$，矩阵 $A$ 的子矩阵 $A_{S,T}$ 为选取 $A_{i,j}\ (i\in S,j\in T)$ 的元素得到的子矩阵。

**定理 1（矩阵树定理，无向图，行列式形式）**

对于无向图 $G$ 和任意的 $k$，都有
$$t(G)=\det L(G)_{[n]\setminus\{k\},[n]\setminus\{k\}}$$
也就是说，无向图的 Laplace 矩阵所有 $n - 1$ 阶主子式都相等，且都等于图的生成树的个数。

形象地说,得到矩阵L后, 去掉它的任意一行和任意一列, 计算这个子矩阵的行列式值就是原图的生成树的个数

**推论 1（矩阵树定理，无向图，特征值形式, 不常用）**

设 $\lambda_1\geq\lambda_2\geq\cdots\geq\lambda_{n - 1}\geq\lambda_n = 0$ 为 $L(G)$ 的 $n$ 个特征值，那么有
$$t(G)=\frac{1}{n}\lambda_1\lambda_2\cdots\lambda_{n - 1}$$

### Cayley公式

大小为$n$的带标号的无根树有$n^{n-2}$个

等价地，只要求得 \(n\) 个顶点的完全图的生成树的数目为 \(n^{n - 2}\) 即可。为此，写出 Laplace 矩阵
$$
L(G)=
\begin{pmatrix}
n - 1 & -1 & \cdots & -1 \\
-1 & n - 1 & \cdots & -1 \\
\vdots & \vdots & \ddots & \vdots \\
-1 & -1 & \cdots & n - 1
\end{pmatrix}_{n\times n}
$$
计算它的任意主子式的行列式的值，即得到结论。 


## 有向图
设 $G$ 是一个有 $n$ 个顶点的有向图。
- **出度矩阵 $D^{out}(G)$**：
$$
D_{ij}^{out}(G) = 
\begin{cases}
\deg^{out}(i), & \text{如果 } i = j, \\
0, & \text{如果 } i \neq j.
\end{cases}
$$
- **入度矩阵 $D^{in}(G)$**：
$$
D_{ij}^{in}(G) = 
\begin{cases}
\deg^{in}(i), & \text{如果 } i = j, \\
0, & \text{如果 } i \neq j.
\end{cases}
$$
- **邻接矩阵 $A(G)$**：
$$
A_{ij}(G) = 
\begin{cases}
0, & \text{如果 } i = j, \\
\#e(i, j), & \text{如果 } i \neq j.
\end{cases}
$$
- **出度 Laplace 矩阵 $L^{out}(G)$**：

$$
\begin{aligned}
L^{out}(G) &= D^{out}(G) - A(G) \\
&= \begin{cases}
\deg^{out}(i), & \text{如果 } i = j, \\
-\#e(i, j), & \text{如果 } i \neq j.
\end{cases}
\end{aligned}
$$

- **入度 Laplace 矩阵 $L^{in}(G)$**：
$$
\begin{aligned}
L^{in}(G) &= D^{in}(G) - A(G) \\
&= \begin{cases}
\deg^{in}(i), & \text{如果 } i = j, \\
-\#e(j, i), & \text{如果 } i \neq j.
\end{cases}
\end{aligned}
$$

### 矩阵树定理(有向图)

**定理 2（矩阵树定理，有向图根向树，行列式形式）**
对于有向图 $G$ 和任意的 $k$，都有
$$t^{root}(G, k)=\det L^{out}(G)_{[n]\setminus\{k\},[n]\setminus\{k\}}$$
也就是说，有向图的出度 Laplace 矩阵删去第 $k$ 行第 $k$ 列得到的主子式等于以 $k$ 为根的根向树形图的个数。
因此如果要统计一张图所有的根向树形图，只要枚举所有的根 $k$ 并对 $t^{root}(G, k)$ 求和即可。

> 所谓根向树形图，是说这张图的基图(忽略边的方向后的无向图)是一棵树，所有的边全部指向父亲。

**定理 3（矩阵树定理，有向图叶向树，行列式形式）**
对于有向图 $G$ 和任意的 $k$，都有
$$t^{leaf}(G, k)=\det L^{in}(G)_{[n]\setminus\{k\},[n]\setminus\{k\}}$$
也就是说，有向图的入度 Laplace 矩阵删去第 $k$ 行第 $k$ 列得到的主子式等于以 $k$ 为根的叶向树形图的个数。
因此如果要统计一张图所有的叶向树形图，只要枚举所有的根 $k$ 并对 $t^{leaf}(G, k)$ 求和即可。 

> 所谓叶向树形图，是说这张图的基图是一棵树，所有的边全部指向儿子。

## BEST定理

### 定义
**欧拉路径**: 经过图中每条边恰好一次的路
**欧拉回路**: 经过图中每条边恰好一次的**回路**(起点和终点是同一个点)
**欧拉图**: 如果一个图中存在欧拉回路，则这个图被称为欧拉图
**半欧拉图**: 如果一个图中不存在欧拉回路但是存在欧拉路径

BEST定理将**有向欧拉图**中**欧拉回路**的数目和该图的**根向树形图**的数目联系起来，从而解决了有向图中的欧拉回路的计数问题。
> 注意，任意无向图中的欧拉回路的计数问题是 NP 完全的。


在实现该算法时，应当首先判定给定图是否是欧拉图，移除所有零度顶点，然后建图计算根向树形图的个数，并由 BEST 定理得到欧拉回路的计数。注意，**如果所求欧拉回路个数要求以给定点作为起点，需要将答案再乘上该点出度，相当于枚举回路中首条边**



### 定理描述
设 $G$ 是有向欧拉图，$k$ 为任意顶点，那么 $G$ 的不同欧拉回路总数 $\text{ec}(G)$ 是
$$
\text{ec}(G)=t^{\text{root}}(G,k)\prod_{v\in V}(\deg(v)-1)!
$$

对于欧拉图，因为出度和入度相等，可以将它们略去上标，记作$deg(v)$
这也说明，对欧拉图 $G$ 的任意两个节点 $k,k'$，都有
$$
t^{\text{root}}(G,k)=t^{\text{root}}(G,k')
$$

### 代码实现
[【模板】Matrix-Tree 定理](https://www.luogu.com.cn/problem/P6178)