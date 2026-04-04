---
title: Bertrand's ballot theorem
date: 2026-3-19 02:09:37
mathjax: true
tags:
  - Math
categories:
  - Puzzle
---

# Bertrand's Ballot Theorem Summary

Let candidate A have $p$ votes and candidate B have $q$ votes, with $p > q$. All counting orders are equally probable, and the total number of permutations is:

$$
\binom{p+q}{p}
$$

<!-- more -->

---

## 1. A Always Strictly Ahead of B

**Condition:**

$$
\forall \text{prefix},\quad A > B
$$

### Probability

$$
\Pr = \frac{p - q}{p + q}
$$

### Number of Valid Permutations

$$
\# = \frac{p - q}{p + q} \binom{p+q}{p}
$$

Equivalent form:

$$
\# = \binom{p+q-1}{p-1} - \binom{p+q-1}{p}
$$

---

## 2. B Never Exceeds A (Ties Allowed)

**Condition:**

$$
\forall \text{prefix},\quad B \le A
$$

### Probability

$$
\Pr = \frac{p + 1 - q}{p + 1}
$$

### Number of Valid Permutations

$$
\# = \frac{p + 1 - q}{p + 1} \binom{p+q}{p}
$$

Equivalent form:

$$
\# = \binom{p+q}{p} - \binom{p+q}{p+1}
$$

---

## Do You Know How to Prove It?
