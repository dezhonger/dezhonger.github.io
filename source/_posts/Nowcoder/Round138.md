---
title: 牛客周赛 Round 138
date: 2026-04-06 00:00:00
mathjax: true
tags:
  - Algorithm
  - Nowcoder
categories:
  - 算法竞赛
---

比赛链接：[牛客周赛 Round 138](https://ac.nowcoder.com/acm/contest/131111)

| 题号 | 题目 | 难度/评分 | 分类 | 关键知识点 |
| --- | --- | --- | --- | --- |
| A | 小苯的转盘游戏 | - | 构造/数论 | 可达性、线性组合 |
| B | 小苯的最大异或 | - | 位运算/暴力 | 状态枚举、二进制右移 |
| C | 小苯的数位排序 | - | 贪心 | 从右到左约束、数位和链 |
| D | 小苯的路径计数 | - | 树上 DP | 祖先链贡献统计 |
| E | 小苯的数字染色 | - | 动态规划 | 前缀 DP、分类最值维护 |
| F | 小苯的对称序列 | - | DP/数据结构 | 区间嵌套转移、树状数组前缀最大值 |

<!-- more -->

## A - 小苯的转盘游戏

**题意**

题目链接：[131111A](https://ac.nowcoder.com/acm/contest/131111/A)

给定初始值 $x$ 和目标值 $y$，每次可执行 $x\leftarrow x+3$ 或 $x\leftarrow x-2$，问能否通过若干次操作把 $x$ 变成 $y$。

**解题思路**

两步操作 `+3` 再 `-2` 的净效果是 $+1$，三步操作 `+3,-2,-2` 的净效果是 $-1$。因此可以实现单位增减，进而从任意整数走到任意整数，答案恒为 `YES`。

**代码**

```cpp
void solve() {
    long long x, y;
    cin >> x >> y;
    cout << "YES\n";
}
```

**复杂度分析**

时间复杂度：$O(1)$。空间复杂度：$O(1)$。

**变形**

1. 若改成 `+a` 和 `-b`，可达性与 $\gcd(a,b)$ 有关。
2. 若要求最少操作次数，需要再做最短路或数论最优化分析。

## B - 小苯的最大异或

**题意**

题目链接：[131111B](https://ac.nowcoder.com/acm/contest/131111/B)

给定非负整数 $x,y$，每次操作可选其一：$x\leftarrow\lfloor x/2\rfloor$ 或 $y\leftarrow\lfloor y/2\rfloor$。可操作任意次（含 $0$ 次），最大化最终的 $x\oplus y$。

**解题思路**

最终的 $x$ 必为 $\lfloor x/2^i\rfloor$，最终的 $y$ 必为 $\lfloor y/2^j\rfloor$。两条可达链长度都是 $O(\log)$ 级别（最多到 $0$）。

直接枚举两条链上的所有组合并取最大异或值即可。

**代码**

```cpp
void solve() {
    int x, y;
    cin >> x >> y;

    vector<int> xs, ys;
    for (int v = x;; v /= 2) {
        xs.push_back(v);
        if (v == 0) break;
    }
    for (int v = y;; v /= 2) {
        ys.push_back(v);
        if (v == 0) break;
    }

    int ans = 0;
    for (int a : xs) {
        for (int b : ys) {
            ans = max(ans, a ^ b);
        }
    }
    cout << ans << '\n';
}
```

**复杂度分析**

时间复杂度：$O(\log x\cdot\log y)$。空间复杂度：$O(\log x+\log y)$。

**变形**

1. 把除以 $2$ 改成除以 $k$，同样枚举两条可达链。
2. 目标函数改为与、或、和等，也可在枚举态上直接比较。

## C - 小苯的数位排序

**题意**

题目链接：[131111C](https://ac.nowcoder.com/acm/contest/131111/C)

给定数组 $a$，可对任意位置执行操作 $a_i\leftarrow\operatorname{digit\_sum}(a_i)$。求最少操作次数使数组非递减；若无法做到输出 $-1$。

**解题思路**

从右向左贪心。设右侧已确定，当前需要满足 $a_i'\le \text{lim}$。

对单个数不断做数位和会形成一条单调不增链，因此“第一次达到 $\le\text{lim}$ 的状态”同时满足：

1. 操作次数最少。
2. 当前值最大（对左侧最宽松）。

若该数变到一位数后仍大于 `lim`，则无解。

**代码**

```cpp
long long digit_sum(long long x) {
    long long s = 0;
    while (x) {
        s += x % 10;
        x /= 10;
    }
    return s;
}

void solve() {
    int n;
    cin >> n;
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];

    long long ans = 0;
    long long lim = (long long)4e18;

    for (int i = n; i >= 1; i--) {
        long long x = a[i];
        int ops = 0;

        while (x > lim && x >= 10) {
            x = digit_sum(x);
            ops++;
        }

        if (x > lim) {
            cout << -1 << '\n';
            return;
        }

        ans += ops;
        lim = x;
    }

    cout << ans << '\n';
}
```

**复杂度分析**

时间复杂度：$O(n\cdot D)$，其中 $D$ 是数位和迭代涉及的位数常数，可视为 $O(n)$。空间复杂度：$O(n)$。

**变形**

1. 目标改为非递增时，可对称地从左向右处理。
2. 若替换为其他“单调下降函数”，只要状态链短也可套用。

## D - 小苯的路径计数

**题意**

题目链接：[131111D](https://ac.nowcoder.com/acm/contest/131111/D)

给定根为 $1$ 的树，节点颜色为 $c_i$。统计满足“起点是终点祖先且整条路径同色”的有向路径数量。

**解题思路**

设 $dp_v$ 表示节点 $v$ 向上连续同色祖先的个数，那么以 $v$ 为终点的合法路径数正是 $dp_v$。

转移非常直接：

- 若 $c_v=c_{fa_v}$，则 $dp_v=dp_{fa_v}+1$。
- 否则 $dp_v=0$。

答案为 $\sum_v dp_v$。这里按你的要求使用递归 DFS 写法展示。

**代码**

```cpp
void solve() {
    int n;
    cin >> n;

    vector<vector<int>> g(n + 1);
    vector<int> c(n + 1);
    vector<long long> dp(n + 1, 0);
    long long ans = 0;

    for (int i = 1; i <= n; i++) cin >> c[i];
    for (int i = 1; i < n; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        g[v].push_back(u);
    }

    function<void(int, int)> dfs = [&](int u, int fa) {
        for (int v : g[u]) {
            if (v == fa) continue;
            dp[v] = (c[v] == c[u] ? dp[u] + 1 : 0);
            ans += dp[v];
            dfs(v, u);
        }
    };

    dfs(1, 0);
    cout << ans << '\n';
}
```

**复杂度分析**

时间复杂度：$O(n)$。空间复杂度：$O(n)$。

**变形**

1. 若统计“路径上颜色全不同”，状态需要维护出现信息。
2. 若改成无向任意两点路径计数，通常要结合 LCA 或分治统计。

## E - 小苯的数字染色

**题意**

题目链接：[131111E](https://ac.nowcoder.com/acm/contest/131111/E)

有数组 $a$，初始全白。每次可选全白区间 $[l,r]$（$l<r$），要求端点同奇偶，得分 $a_l+a_r$，并把整段染红。区间不可重叠。求最大总得分。

**解题思路**

设 $dp_i$ 为前 $i$ 个位置的最大得分。

枚举右端点 $i$：

- 不选新区间：$dp_i=dp_{i-1}$。
- 选某个 $l$ 与 $i$ 配对：$dp_i=dp_{l-1}+a_l+a_i$，且端点奇偶相同。

对固定 $i$，只需知道同奇偶所有候选左端点中 $dp_{l-1}+a_l$ 的最大值。维护两类最值 $mx_0,mx_1$ 即可线性转移。

更新顺序要先算 $dp_i$，再用 $dp_{i-1}+a_i$ 更新对应 $mx$，从而保证区间不重叠。

**代码**

```cpp
void solve() {
    int n;
    cin >> n;

    vector<long long> a(n + 1), dp(n + 1, 0);
    for (int i = 1; i <= n; i++) cin >> a[i];

    const long long NEG = -(long long)4e18;
    vector<long long> best_left(2, NEG);

    for (int i = 1; i <= n; i++) {
        dp[i] = dp[i - 1];
        int p = (int)((a[i] % 2 + 2) % 2);

        if (best_left[p] > NEG / 2) {
            dp[i] = max(dp[i], best_left[p] + a[i]);
        }

        best_left[p] = max(best_left[p], dp[i - 1] + a[i]);
    }

    cout << dp[n] << '\n';
}
```

**复杂度分析**

时间复杂度：$O(n)$。空间复杂度：$O(n)$（可进一步压到 $O(1)$ 额外空间）。

**变形**

1. 若改为端点同余 $\bmod\ k$，把两类最值扩展到 $k$ 类。
2. 若得分可拆成“只与左端点相关 + 只与右端点相关”，同样可做分类最值维护。

## F - 小苯的对称序列

**题意**

题目链接：[131111F](https://ac.nowcoder.com/acm/contest/131111/F)

求最长子序列长度，使其首尾配对和都相等。即存在常数 $S$，满足
$$
a_{i_1}+a_{i_m}=a_{i_2}+a_{i_{m-1}}=\cdots
$$

**解题思路**

这题关键是先固定公共和 $S$。

固定 $S$ 后，只保留满足 $a_i+a_j=S$ 的下标对 $(i,j)$。一个合法对称子序列对应“若干对嵌套 pair”，并在奇数长度时可在中间额外放一个满足 $2a_c=S$ 的中心点。

对每个 pair $(i,j)$ 维护两类状态：

- 偶数状态：以 $(i,j)$ 为最外层时的最大偶数长度。
- 奇数状态：以 $(i,j)$ 为最外层时的最大奇数长度。

转移要求内层 pair $(p,q)$ 满足 $i<p<q<j$。将所有 pair 按左端点 $i$ 降序处理，则“已处理 pair”自动满足 $p>i$；再通过“按右端点前缀最大值查询”保证 $q<j$。这一步用树状数组维护前缀最大值。

同一左端点的 pair 不能互相转移（需要严格 $p>i$），所以必须分组：先统一查询计算，再统一更新树状数组。

奇数状态还有“直接构成长度 3”的来源：当 $S$ 为偶数且开区间 $(i,j)$ 内存在值 $S/2$ 时成立。用值域前缀计数快速判断。

**代码**

```cpp
struct FenwickMax {
    int n;
    vector<int> tr;

    // 初始化树状数组：维护“前缀最大值”
    void init(int m) {
        n = m;
        tr.assign(n + 1, 0);
    }

    // 单点 max 更新
    void add(int x, int v) {
        while (x <= n) {
            tr[x] = max(tr[x], v);
            x += x & -x;
        }
    }

    // 查询前缀 [1..x] 的最大值
    int ask(int x) {
        int r = 0;
        while (x > 0) {
            r = max(r, tr[x]);
            x -= x & -x;
        }
        return r;
    }
};

void solve() {
    int n;
    cin >> n;
    vector<int> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];

    // pre[v][i]：值 v 在前 i 个位置出现次数
    // 用于 O(1) 判断开区间 (l, r) 内是否存在值 s/2
    vector<vector<int>> pre(1001, vector<int>(n + 1, 0));
    for (int v = 1; v <= 1000; v++) {
        for (int i = 1; i <= n; i++) {
            pre[v][i] = pre[v][i - 1] + (a[i] == v);
        }
    }

    // pairs_by_sum[s] 存所有满足 a[i] + a[j] = s 的 pair(i, j)
    vector<vector<pair<int, int>>> pairs_by_sum(2001);
    for (int i = 1; i <= n; i++) {
        for (int j = i + 1; j <= n; j++) {
            pairs_by_sum[a[i] + a[j]].push_back({i, j});
        }
    }

    int ans = 1;

    for (int s = 2; s <= 2000; s++) {
        auto &pairs = pairs_by_sum[s];
        if (pairs.empty()) continue;

        // 左端点降序：保证当前 pair 转移时，历史 pair 的左端点更靠内
        sort(pairs.begin(), pairs.end(), [&](pair<int, int> x, pair<int, int> y) {
            if (x.first != y.first) return x.first > y.first;
            return x.second < y.second;
        });

        // even_bit/odd_bit 分别维护内部 pair 的最佳偶数/奇数长度
        FenwickMax even_bit, odd_bit;
        even_bit.init(n);
        odd_bit.init(n);

        int m = (int)pairs.size();
        for (int l = 0; l < m; ) {
            int r = l;
            while (r < m && pairs[r].first == pairs[l].first) r++;

            // 同一左端点不能互相转移，先算完再统一更新
            vector<tuple<int, int, int>> pending;
            for (int k = l; k < r; k++) {
                int i = pairs[k].first;
                int j = pairs[k].second;

                // 偶数长度：当前这一对贡献 2 + 内部最优偶数结构
                int best_even_len = 2 + even_bit.ask(j - 1);

                int best_odd_len = 0;

                // 奇数长度来源 1：内部已有奇数结构，再向外套一层
                int inner_best_odd = odd_bit.ask(j - 1);
                if (inner_best_odd > 0) {
                    best_odd_len = max(best_odd_len, inner_best_odd + 2);
                }

                // 奇数长度来源 2：直接在中间放中心点，形成长度 3
                if ((s & 1) == 0) {
                    int center_value = s / 2;
                    if (pre[center_value][j - 1] - pre[center_value][i] > 0) {
                        best_odd_len = max(best_odd_len, 3);
                    }
                }

                ans = max(ans, best_even_len);
                ans = max(ans, best_odd_len);
                pending.push_back({j, best_even_len, best_odd_len});
            }

            // 统一更新，避免同组 pair 互相当作“内部结构”
            for (auto [j, best_even_len, best_odd_len] : pending) {
                even_bit.add(j, best_even_len);
                if (best_odd_len > 0) odd_bit.add(j, best_odd_len);
            }

            l = r;
        }
    }

    cout << ans << '\n';
}
```

**复杂度分析**

时间复杂度：$O(n^2\log n + nV)$，其中 $V=1000$。空间复杂度：$O(n^2 + nV)$。

**变形**

1. 若要输出具体方案，可在状态转移时记录前驱并回溯。
2. 若把“和相等”改成“差相等”，可按同样框架改 pair 判定条件。
