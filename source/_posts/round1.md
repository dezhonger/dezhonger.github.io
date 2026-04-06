---
title: 牛客周赛 Round 1
date: 2025-05-17 00:00:00
mathjax: true
tags:
  - Algorithm
  - Nowcoder
categories:
  - 算法竞赛
---

- 比赛链接：[牛客周赛 Round 1](https://ac.nowcoder.com/acm/contest/60245#question)
- 参考题解：[牛客博客](https://blog.nowcoder.net/n/b47135dffd0e47a4a0f76e0195d689e7)

<!-- more -->

## A. 游游画 U

### 题意

题目链接：[A. 游游画 U](https://ac.nowcoder.com/acm/contest/60245/A)

给定一个正整数 $n$，输出一个 $4n \times 4n$ 的字符矩阵，用 `*` 和 `.` 画出一个大小为 $n$ 的字母 `U`。

### 解题思路

直接按行构造即可。

- 前 $3n$ 行固定为：左边 $n$ 个 `*`，中间 $2n$ 个 `.`，右边 $n$ 个 `*`。
- 后 $n$ 行第 $i$ 行左侧和右侧各补 $i$ 个 `.`，中间两段竖线各保留 $n$ 个 `*`，中间空白长度变成 $2(n-i)$。

### 代码

```cpp
#include <bits/stdc++.h>
using namespace std;

#ifdef LOCAL
#include "debug.h"
#else
#define debug(...) 42
#endif
using LL = long long;
using ULL = unsigned long long;

void solve() {
    int n;
    cin >> n;
    for (int i = 0; i < 3 * n; i++) {
        cout << string(n, '*') << string(2 * n, '.') << string(n, '*') << '\n';
    }
    for (int i = 1; i <= n; i++) {
        cout << string(i, '.')
             << string(n, '*')
             << string(2 * (n - i), '.')
             << string(n, '*')
             << string(i, '.') << '\n';
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T = 1;
    while (T--) {
        solve();
    }
    return 0;
}
```

### 复杂度分析

时间复杂度：$O(n^2)$。

空间复杂度：$O(1)$。

## B. 游游的数组染色

### 题意

题目链接：[B. 游游的数组染色](https://ac.nowcoder.com/acm/contest/60245/B)

给定一个数组和一个颜色串。第 $i$ 个位置的数值为 $a_i$，颜色为红色或蓝色。要求统计满足下面条件的二元组数量：

- 两个位置不同；
- 两个位置颜色不同；
- 两个位置上的数值相同。

位置不同就视为不同方案。

### 解题思路

对每个数值分别统计：

- 出现了多少次红色；
- 出现了多少次蓝色。

若某个值的红色出现次数为 $r$，蓝色出现次数为 $b$，那么它对答案的贡献就是 $r \times b$。最后把所有数值的贡献加起来即可。

### 代码

```cpp
#include <bits/stdc++.h>
using namespace std;

#ifdef LOCAL
#include "debug.h"
#else
#define debug(...) 42
#endif
using LL = long long;
using ULL = unsigned long long;

void solve() {
    int n;
    cin >> n;
    vector<LL> a(n);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }

    string s;
    cin >> s;

    unordered_map<LL, array<LL, 2>> cnt;
    cnt.reserve(n * 2);
    for (int i = 0; i < n; i++) {
        cnt[a[i]][s[i] == 'R']++;
    }

    LL ans = 0;
    for (auto &[x, c] : cnt) {
        ans += c[0] * c[1];
    }
    cout << ans << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T = 1;
    while (T--) {
        solve();
    }
    return 0;
}
```

### 复杂度分析

时间复杂度：$O(n)$，这里用的是哈希表均摊复杂度。

空间复杂度：$O(n)$。

## C. 游游的交换字符

### 题意

题目链接：[C. 游游的交换字符](https://ac.nowcoder.com/acm/contest/60245/C)

给定一个只包含 `0` 和 `1` 的字符串。每次可以交换一对相邻字符。要求用最少的交换次数把字符串变成相邻字符都不同的交错串。

### 解题思路

最终目标串只有两种可能：

- `010101...`
- `101010...`

若两种字符数量不同，那么开头字符是唯一确定的；若数量相同，两种目标串都要算一遍取最小值。

设某种目标串要求字符 `c` 出现在位置 $0,2,4,\dots$。把原串中所有字符 `c` 的下标依次记为 $p_0,p_1,\dots$，那么把它们移动到目标位置的最小总代价就是：

$$
\sum |p_i - 2i|
$$

因为相邻交换的总次数，等于这些字符各自移动距离之和。

### 代码

```cpp
#include <bits/stdc++.h>
using namespace std;

#ifdef LOCAL
#include "debug.h"
#else
#define debug(...) 42
#endif
using LL = long long;
using ULL = unsigned long long;

LL cal(const string &s, char c) {
    vector<int> pos;
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] == c) {
            pos.push_back(i);
        }
    }

    int need = ((int)s.size() + 1) / 2;
    if ((int)pos.size() != need) {
        return (LL)4e18;
    }

    LL res = 0;
    for (int i = 0; i < need; i++) {
        res += 1LL * abs(pos[i] - 2 * i);
    }
    return res;
}

void solve() {
    string s;
    cin >> s;

    int c0 = 0, c1 = 0;
    for (char c : s) {
        if (c == '0') {
            c0++;
        } else {
            c1++;
        }
    }

    LL ans = (LL)4e18;
    if (c0 >= c1) {
        ans = min(ans, cal(s, '0'));
    }
    if (c1 >= c0) {
        ans = min(ans, cal(s, '1'));
    }
    cout << ans << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T = 1;
    while (T--) {
        solve();
    }
    return 0;
}
```

### 复杂度分析

时间复杂度：$O(n)$。

空间复杂度：$O(n)$。

## D. 游游的 9 的倍数

### 题意

题目链接：[D. 游游的 9 的倍数](https://ac.nowcoder.com/acm/contest/60245/D)

给定一个数字串，要求统计有多少个子序列可以组成一个 $9$ 的倍数。子序列可以不连续，也允许前导零。若两个子序列在原串中选取的位置不同，就视为不同方案，答案对 $10^9+7$ 取模。

### 解题思路

一个数能被 $9$ 整除，当且仅当它的数位和能被 $9$ 整除。因此不用关心这个子序列具体组成了什么数，只需要关心数位和模 $9$ 的余数。

设 `dp[r]` 表示处理完当前前缀后，余数为 $r$ 的子序列个数。处理新数字 $d$ 时有两种选择：

- 不选当前数字：原来的 `dp` 保留；
- 选当前数字：
  - 可以单独作为一个新子序列；
  - 也可以接到之前任何一个子序列后面，余数从 $r$ 变成 $(r+d)\bmod 9$。

于是每次只需要做一个 9 维转移即可。

### 代码

```cpp
#include <bits/stdc++.h>
using namespace std;

#ifdef LOCAL
#include "debug.h"
#else
#define debug(...) 42
#endif
using LL = long long;
using ULL = unsigned long long;

const int mod = 1000000007;

void upd(LL &x, LL y) {
    x += y;
    if (x >= mod) {
        x -= mod;
    }
}

void solve() {
    string s;
    cin >> s;

    vector<LL> dp(9), ndp(9);
    for (char c : s) {
        int d = (c - '0') % 9;
        ndp = dp;
        upd(ndp[d], 1);
        for (int r = 0; r < 9; r++) {
            upd(ndp[(r + d) % 9], dp[r]);
        }
        dp.swap(ndp);
    }

    cout << dp[0] << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T = 1;
    while (T--) {
        solve();
    }
    return 0;
}
```

### 复杂度分析

时间复杂度：$O(9n)$。

空间复杂度：$O(9)$。
