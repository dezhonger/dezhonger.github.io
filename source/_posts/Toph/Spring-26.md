---
title: Toph Spring 26
date: 2026-4-9 01:44:27
mathjax: true
tags:
  - Algorithm
  - Toph
categories:
  - 算法竞赛
---

比赛链接：[DIU Unlock The Algorithm Spring 26 Preliminary](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/dashboard)

| 题号 | 题目 | 难度/评分 | 分类 | 关键知识点 |
| --- | --- | --- | --- | --- |
| A | Independence Day | - | 模拟 | 固定输出 |
| B | Odd + Even = N | - | 数学/构造 | 奇偶性、最小边界 |
| C | Pizza Cut | - | 数学 | 递推转公式、等差数列 |
| D | Flag Count | - | 计数 | 乘法原理、幂 |
| E | K Compression | - | 字符串 | 分段统计、RLE |
| F | One Change to All 5 Equal | - | 观察/数组 | 模式归纳、线性扫描 |
| G | Maximum Path Sum in DAG | - | 图论/DP | 拓扑排序、DAG 最长路 |
| I | Max Weight Increasing Subsequence with Length < LIS | - | DP/数据结构 | LIS、分层 DP、树状数组 |

<!-- more -->

## A - Independence Day

**题意**

题目链接：[Toph Spring 26 A](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d6142ebf7aa3559eb642b6)

无输入，按题目要求输出孟加拉国独立日日期。

**解题思路**

直接输出固定字符串 `26 March`。

**代码**
```cpp
cout << "26 March\n";
```

**复杂度分析**

时间复杂度：$O(1)$。  
空间复杂度：$O(1)$。

**变形**
1. 给国家名，输出固定节日日期。
2. 给多个节日名，做映射查询输出。

## B - Odd + Even = N

**题意**

题目链接：[Toph Spring 26 B](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d614dfbf7aa3559eb642c9)

给定整数 $N$，判断是否存在正整数 $x,y$，满足：$x$ 为奇数、$y$ 为偶数、且 $x+y=N$。

**解题思路**

奇数与偶数之和一定是奇数，所以 $N$ 必须为奇数。又因为 $x,y$ 都是正整数，最小可行为 $1+2=3$。  
因此当且仅当 $N$ 是奇数且 $N\ge 3$ 时答案是 `YES`。

**代码**
```cpp
long long n;
cin >> n;
cout << ((n % 2 == 1 && n >= 3) ? "YES\n" : "NO\n");
```

**复杂度分析**

时间复杂度：$O(1)$。  
空间复杂度：$O(1)$。

**变形**
1. 改成“两个奇数和为 $N$”，则需判断 $N$ 是否为偶数且 $N\ge 2$。
2. 要求输出一组解，可在可行时直接输出 $(1, N-1)$。

## C - Pizza Cut

**题意**

题目链接：[Toph Spring 26 C](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d6153bbf7aa3559eb642d7)

给定切割次数 $N$，每次用一条直线切圆形披萨，求最多能切成多少块。

**解题思路**

第 $i$ 刀最多新增 $i$ 块（让它与前 $i-1$ 刀都相交且不过已有交点）。初始有 1 块，因此：

$$
ans = 1 + \sum_{i=1}^{N} i = 1 + \frac{N(N+1)}{2}
$$

直接代入公式即可。

**代码**
```cpp
long long n;
cin >> n;
cout << 1 + n * (n + 1) / 2 << '\n';
```

**复杂度分析**

时间复杂度：$O(1)$。  
空间复杂度：$O(1)$。

**变形**
1. 给定块数 $K$，反推最少切几刀，可二分 $N$。
2. 若所有切线都必须过圆心，答案公式会改变，需要重新分类。

## D - Flag Count

**题意**

题目链接：[Toph Spring 26 D](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d615acbf7aa3559eb642ee)

有 $x$ 条横向色带、$y$ 种颜色。每条色带独立选一种颜色，问能组成多少种不同旗子。

**解题思路**

每条色带有 $y$ 种选择，彼此独立，乘法原理得总方案数为：

$$
y^x
$$

数据范围下用 `long long` 足够。

**代码**
```cpp
long long x, y;
cin >> x >> y;

long long ans = 1;
for (long long i = 0; i < x; i++) ans *= y;
cout << ans << '\n';
```

**复杂度分析**

时间复杂度：$O(x)$。  
空间复杂度：$O(1)$。

**变形**
1. 若相邻色带不能同色，则答案变为 $y(y-1)^{x-1}$。
2. 要求恰好使用 $k$ 种颜色，可转向容斥或组合计数。

## E - K Compression

**题意**

题目链接：[Toph Spring 26 E](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d615e3bf7aa3559eb642f8)

给定字符串 $s$，把每段连续的 `'k'` 做如下处理：

1. 长度为 1 时保持 `'k'`。
2. 长度为 $c>1$ 时输出 `k{c}`。

其余字符原样保留。

**解题思路**

从左到右扫描字符串。遇到非 `'k'` 直接加入答案；遇到 `'k'` 时统计这一整段连续长度 $c$：

1. 若 $c=1$，追加 `'k'`。
2. 若 $c>1$，追加 `k{c}`。

每个字符恰好访问一次，线性完成。

**代码**
```cpp
string s;
cin >> s;

string out;
int n = (int)s.size();
for (int i = 0; i < n; ) {
    if (s[i] != 'k') {
        out += s[i];
        i++;
        continue;
    }

    int j = i;
    while (j < n && s[j] == 'k') j++;
    int cnt = j - i;

    if (cnt == 1) out += 'k';
    else out += "k{" + to_string(cnt) + "}";

    i = j;
}

cout << out << '\n';
```

**复杂度分析**

时间复杂度：$O(|s|)$。  
空间复杂度：$O(|s|)$。

**变形**
1. 把目标字符从 `'k'` 改为任意给定字符。
2. 只在段长达到阈值（如 $\ge 3$）时才压缩。

## F - One Change to All 5 Equal

**题意**

题目链接：[Toph Spring 26 F](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d6163dbf7aa3559eb6430a)

给定数组 $a$，保证原数组中不存在三个连续相同元素。问是否存在长度为 5 的连续子段，能通过修改其中恰好 1 个位置，使 5 个数全相同。若有多个，输出最靠左子段里应修改位置的 1-based 下标；否则输出 $-1$。

**解题思路**

要“一改成全相同”，窗口内当前必须是“4 个相同 + 1 个不同”。  
再结合“没有三个连续相同”这个约束，长度 5 窗口唯一可能形态是：

$$
x\ x\ y\ x\ x
$$

也就是中间位置是唯一异类。否则异类在边上会导致出现连续三个 $x$，与题意矛盾。  
因此只需枚举每个位置 $i$（0-based）作为中心，检查：

$$
a_{i-2}=a_{i-1}=a_{i+1}=a_{i+2},\quad a_i\ne a_{i-2}
$$

第一个满足条件的就是最靠左合法窗口，输出 $i+1$（1-based）。

**代码**
```cpp
int n;
cin >> n;
vector<long long> a(n);
for (int i = 0; i < n; i++) cin >> a[i];

int ans = -1;
for (int i = 2; i + 2 < n; i++) {
    if (a[i - 2] == a[i - 1] &&
        a[i - 1] == a[i + 1] &&
        a[i + 1] == a[i + 2] &&
        a[i] != a[i - 2]) {
        ans = i + 1;
        break;
    }
}

cout << ans << '\n';
```

**复杂度分析**

时间复杂度：$O(n)$。  
空间复杂度：$O(n)$。

**变形**
1. 若去掉“无三个连续相同”限制，需要对每个长度 5 窗口做频次统计。
2. 若窗口长度改为 $k$，可检查窗口内是否存在出现次数为 $k-1$ 的值。

## G - Maximum Path Sum in DAG

**题意**

题目链接：[Toph Spring 26 G](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d616ffbf7aa3559eb64320)

给定一个有向无环图，边有权值（可为负），求所有非空有向路径中的最大权值和；若不存在路径则输出 $0$。

**解题思路**

这是 DAG 最长路模板。定义：

$$
dp_v = \text{以点 }v\text{ 结尾的最大路径和}
$$

按拓扑序处理每条边 $u\to v$（权值 $w$），有两种来源：

1. 只走当前边，得到 $w$。
2. 接在到 $u$ 的最优路径后，得到 $dp_u + w$。

转移：

$$
dp_v = \max(dp_v,\ w,\ dp_u+w)
$$

因为是 DAG，拓扑序保证转移时前置状态已经稳定；每条边只处理一次。  
注意边权可能为负，`dp` 要初始化为负无穷，避免把空路径误当作合法路径。

**代码**
```cpp
struct Edge {
    int to;
    long long w;
};

int n, m;
cin >> n >> m;

vector<vector<Edge>> g(n + 1);
vector<int> indeg(n + 1, 0);

for (int i = 0; i < m; i++) {
    int u, v;
    long long w;
    cin >> u >> v >> w;
    g[u].push_back({v, w});
    indeg[v]++;
}

queue<int> q;
for (int i = 1; i <= n; i++) {
    if (indeg[i] == 0) q.push(i);
}

const long long NEG = -(1LL << 60);
vector<long long> dp(n + 1, NEG);
long long ans = NEG;

while (!q.empty()) {
    int u = q.front();
    q.pop();

    for (auto e : g[u]) {
        int v = e.to;
        long long w = e.w;

        dp[v] = max(dp[v], w);
        if (dp[u] != NEG) dp[v] = max(dp[v], dp[u] + w);
        ans = max(ans, dp[v]);

        indeg[v]--;
        if (indeg[v] == 0) q.push(v);
    }
}

cout << (ans == NEG ? 0 : ans) << '\n';
```

**复杂度分析**

时间复杂度：$O(N+M)$。  
空间复杂度：$O(N+M)$。

**变形**
1. 指定起点 $s$ 时可设 $dp_s=0$，其余为负无穷。
2. 要恢复路径可额外记录前驱数组。

## I - Max Weight Increasing Subsequence with Length < LIS

**题意**

题目链接：[Toph Spring 26 I](https://toph.co/arena?contest=diu-unlock-the-algorithm-spring-26-preliminary-m#!/p/69d61840bf7aa3559eb6437e)

每组数据给定长度为 $N$ 的序列 $A,B$。设 $L$ 为 $A$ 的 LIS 长度。需要在所有严格上升子序列中，选一个长度 $k<L$ 的子序列，使 $\sum B_i$ 最大；允许空子序列，分数为 0。

**解题思路**

先求 $L=\text{LIS}(A)$。若 $L=1$，任何非空上升子序列长度都为 1，不满足 $k<L$，答案为 0。

接着做“按长度分层”的 DP 优化。设离散化后 $A_i$ 的秩为 $rk_i$。对每个长度 $k$ 维护一棵树状数组，存：

$$
\text{best}_{k}(x)=\text{末尾值秩}\le x\text{ 的长度 }k\text{ 子序列最大权值和}
$$

处理第 $i$ 个元素时：

1. 枚举 $k=L-1\dots 2$（倒序），从第 $k-1$ 层查询 $rk_{i-1}$ 的前缀最大值，得到可接前驱。
2. 若前驱存在，则产生新值 $pre + B_i$，更新到第 $k$ 层的 $rk_i$。
3. 最后把长度 1 状态 $B_i$ 更新到第 1 层。

倒序的作用是保证当前 $i$ 在这一轮不会被重复使用到更长层中。  
整体即为：LIS + 分层 DP + 树状数组前缀最值。

**代码**
```cpp
struct FenwickMax {
    int n;
    vector<long long> bit;

    void init(int n_) {
        n = n_;
        bit.assign(n + 1, -(1LL << 60));
    }

    void update(int idx, long long val) {
        for (int i = idx; i <= n; i += i & -i) {
            bit[i] = max(bit[i], val);
        }
    }

    long long query(int idx) const {
        long long res = -(1LL << 60);
        for (int i = idx; i > 0; i -= i & -i) {
            res = max(res, bit[i]);
        }
        return res;
    }
};

int lis_length(const vector<long long> &a) {
    vector<long long> d;
    for (long long x : a) {
        auto it = lower_bound(d.begin(), d.end(), x);
        if (it == d.end()) d.push_back(x);
        else *it = x;
    }
    return (int)d.size();
}

void solve() {
    int n;
    cin >> n;
    vector<long long> a(n), b(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    for (int i = 0; i < n; i++) cin >> b[i];

    int L = lis_length(a);
    if (L == 1) {
        cout << 0 << '\n';
        return;
    }

    vector<long long> vals = a;
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());

    vector<int> rk(n);
    for (int i = 0; i < n; i++) {
        rk[i] = (int)(lower_bound(vals.begin(), vals.end(), a[i]) - vals.begin()) + 1;
    }

    vector<FenwickMax> fw(L);
    int m = (int)vals.size();
    for (int k = 1; k < L; k++) fw[k].init(m);

    const long long NEG = -(1LL << 60);
    long long ans = 0;

    for (int i = 0; i < n; i++) {
        int p = rk[i];

        for (int k = L - 1; k >= 2; k--) {
            long long pre = fw[k - 1].query(p - 1);
            if (pre == NEG) continue;
            long long cur = pre + b[i];
            fw[k].update(p, cur);
            ans = max(ans, cur);
        }

        fw[1].update(p, b[i]);
        ans = max(ans, b[i]);
    }

    cout << max(0LL, ans) << '\n';
}
```

**复杂度分析**

先求 LIS 为 $O(N\log N)$，离散化为 $O(N\log N)$。分层 DP 每次转移做一次树状数组查询/更新，总复杂度：

$$
O(NL\log N)
$$

总计为：

$$
O(N\log N + NL\log N)
$$

最坏 $L\le N$ 时为 $O(N^2\log N)$。  
空间复杂度为 $O(NL)$（最坏 $O(N^2)$）。

**变形**
1. 若要求长度恰好为 $K$，只保留第 $K$ 层答案。
2. 若改为非降子序列，把条件从 $A_j < A_i$ 改为 $A_j \le A_i$（即从查询 $rk_{i-1}$ 改为查询 $rk_i$）。
