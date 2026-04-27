---
title: 牛客周赛 Round 141
date: 2026-4-28 20:15:42
mathjax: true
tags:
  - Algorithm
  - Nowcoder
categories:
  - 算法竞赛
---

比赛链接：[牛客周赛 Round 141](https://ac.nowcoder.com/acm/contest/133523)

| 题号 | 题目 | 难度/评分 | 分类 | 关键知识点 |
| --- | --- | --- | --- | --- |
| A | 小苯的回文 | - | 数论/构造 | 完全平方数、回文判断 |
| B | 小苯的异或 | - | 位运算 | 异或性质、按位取反 |
| C | 小苯的合并 | - | 贪心/双指针 | 状态转换逆向、边界匹配 |
| D | 小苯的幂 | - | 哈希/枚举 | 幂枚举、下标配对分类讨论 |
| E | 小苯的树 | - | 构造 | 叶子深度排列、最小最大节点数分析 |
| F | 小苯的回文子序列 | - | 前缀和/组合计数 | 区间回文子序列计数、分字符贡献统计 |

<!-- more -->

## A - 小苯的回文

**题意**

题目链接：[133523A](https://ac.nowcoder.com/acm/contest/133523/A)

给定整数 $n$（$1\le n\le 10^9$），判断 $n$ 是否为"双回文数"：存在整数 $x$ 使得 $n=x^2$，且 $x$ 为回文数、$n$ 也是回文数。

**解题思路**

直接检验即可。求出 $x=\sqrt{n}$（取整数后微调避免浮点误差），若 $x^2=n$ 且 $x$ 与 $n$ 均为回文数，则答案 `YES`，否则 `NO`。

**代码**

```cpp
bool isp(long long x) {
    string s = to_string(x), t = s;
    reverse(t.begin(), t.end());
    return s == t;
}

void solve() {
    long long n;
    cin >> n;
    long long x = sqrt(n);
    while ((x + 1) * (x + 1) <= n) x++;
    while (x * x > n) x--;
    if (x * x == n && isp(x) && isp(n)) cout << "YES\n";
    else cout << "NO\n";
}
```

**复杂度分析**

时间复杂度：$O(\log n)$，空间复杂度：$O(\log n)$。

---

## B - 小苯的异或

**题意**

题目链接：[133523B](https://ac.nowcoder.com/acm/contest/133523/B)

给定 $x,y$（$0\le x,y<2^{31}$），构造整数 $n$（$0\le n<2^{31}$）满足 $x\oplus n>y\oplus n$。题目保证有解。

**解题思路**

若 $x>y$，取 $n=0$ 即可满足 $x\oplus n=x>y=y\oplus n$。

若 $x<y$，取 $n=2^{31}-1$（低31位全1）。对所有小于 $2^{31}$ 的数，异或该数等价于按位取反，大小关系翻转，故 $x\oplus n>y\oplus n$。

**代码**

```cpp
const int MSK = (1 << 31) - 1;

void solve() {
    int x, y;
    cin >> x >> y;
    if (x > y) cout << 0 << '\n';
    else cout << MSK << '\n';
}
```

**复杂度分析**

时间复杂度：$O(1)$，空间复杂度：$O(1)$。

---

## C - 小苯的合并

**题意**

题目链接：[133523C](https://ac.nowcoder.com/acm/contest/133523/C)

给定仅包含字符 `n` 和 `m` 的字符串 $s$，一次操作可将相邻两个 `n` 合并为 `m`。问经过任意次操作后 $s$ 能否变成回文串。

**解题思路**

逆向思考：最终回文串中的每个 `m` 来自原串中的 `m` 或 `nn`。于是问题等价于将 $s$ 划分成若干块，每块为 `n`、`m` 或 `nn`，且这些块对应的字符序列是回文。

用双指针从左右两端向中间匹配：

- 若 $s[l]=s[r]$，直接匹配，单指针移动。
- 若 $s[l]=$`m`，$s[r]=$`n`，右侧必须有两个连续 `n` 才能表示 `m`，即 $s[r-1]=$`n` 时可匹配 $(l,\ r-2)$。
- 若 $s[l]=$`n`，$s[r]=$`m`，左侧必须有两个连续 `n$ 才能表示 `m`，即 $s[l+1]=$`n` 时可匹配 $(l+2,\ r)$。

若某步无法匹配则无解。

**代码**

```cpp
void solve() {
    string s;
    cin >> s;
    int l = 0, r = (int)s.size() - 1;
    while (l < r) {
        if (s[l] == s[r]) {
            l++; r--;
        } else if (s[l] == 'm' && s[r] == 'n') {
            if (r - 1 >= l && s[r - 1] == 'n') {
                l++; r -= 2;
            } else {
                cout << "NO\n"; return;
            }
        } else {
            if (l + 1 <= r && s[l + 1] == 'n') {
                l += 2; r--;
            } else {
                cout << "NO\n"; return;
            }
        }
    }
    cout << "YES\n";
}
```

**复杂度分析**

时间复杂度：$O(|s|)$，空间复杂度：$O(1)$。

---

## D - 小苯的幂

**题意**

题目链接：[133523D](https://ac.nowcoder.com/acm/contest/133523/D)

给定数组 $a$（$3\le n\le 2\times10^5$，$1\le a_i\le 10^9$），判断是否存在三元组 $(i,j,z)$（$z\neq i,\ z\neq j$）满足 $a_z=a_i^{a_j}$

**解题思路**

当底数 $x\ge2$、指数 $e\ge2$ 时，$x^e\le10^9$ 的指数最多约30次。因此对每个出现过的底数，枚举其所有不超过 $10^9$ 的幂，再检查指数和结果是否都在数组中。

针对下标限制分类讨论：

- $x,e,y$ 三值互异：各至少出现一次。
- $x=e\neq y$：$i=j$ 成立，只需 $x$ 和 $y$ 各至少一次。
- $x=y\neq e$：需 $y$ 至少两次（分别作 $a_i$ 和 $a_z$），$e$ 至少一次。
- $e=y\neq x$：需 $y$ 至少两次，$x$ 至少一次。
- $x=e=y$：$i=j$ 成立，需该值至少两次。

**代码**

```cpp
const LL LIM = 1000000000LL;

bool ok(LL x, LL e, LL y, unordered_map<LL,int>& cnt) {
    if (!cnt.count(x) || !cnt.count(e) || !cnt.count(y)) return false;
    if (x == e && e == y) return cnt[x] >= 2;
    if (x == e) return cnt[x] >= 1 && cnt[y] >= 1;
    if (x == y) return cnt[x] >= 2 && cnt[e] >= 1;
    if (e == y) return cnt[e] >= 2 && cnt[x] >= 1;
    return cnt[x] >= 1 && cnt[e] >= 1 && cnt[y] >= 1;
}

void solve() {
    int n;
    cin >> n;
    vector<LL> a(n);
    unordered_map<LL,int> cnt;
    cnt.reserve(n * 2);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
        cnt[a[i]]++;
    }

    vector<LL> val;
    val.reserve(cnt.size());
    for (auto [x, c] : cnt) val.push_back(x);

    if (cnt.count(1)) {
        for (LL x : val) {
            if (ok(x, 1, x, cnt)) {
                cout << "YES\n"; return;
            }
        }
    }

    for (LL x : val) {
        if (x == 1) continue;
        LL y = x * x;
        for (LL e = 2; y <= LIM; e++) {
            if (cnt.count(e) && cnt.count(y)) {
                if (ok(x, e, y, cnt)) {
                    cout << "YES\n"; return;
                }
            }
            if (y > LIM / x) break;
            y *= x;
        }
    }
    cout << "NO\n";
}
```

**复杂度分析**

时间复杂度：$O(U\cdot\log_{2}10^9)$，其中 $U$ 为不同数字个数，总体约 $O(n\log10^9)$；空间复杂度：$O(U)$。

---

## E - 小苯的树

**题意**

题目链接：[133523E](https://ac.nowcoder.com/acm/contest/133523/E)

给定 $n,m$（$1\le n,m\le2\times10^5$），以 $1$ 号节点为根，判断能否用恰好 $n$ 个节点构造一棵 $m$ 级树：所有叶子节点到根的距离恰好构成一个长度为 $m$ 的排列 $\{1,2,\dots,m\}$。若能，输出任意构造方案（$n-1$ 条边）；否则输出 `NO`。

**解题思路**

**最少节点数**：深度 $1$ 到 $m-1$ 每层至少需 $2$ 个节点（一个作为叶子，一个继续向下），深度 $m$ 至少 $1$ 个节点，根节点深度为 $0$。故最少节点数 $mn=2m$。

**最多节点数**：每条叶子路径尽量不共享，除根外每层各用一条新链。最多节点数 $mx=1+m(m+1)/2$。

有解当且仅当 $2m\le n\le 1+m(m+1)/2$。

**构造**：先构造最小结构（一条主链到深度 $m$，每层额外挂一个叶子），再将多余的 $ex=n-mn$ 节点贪心分配给各叶子链。深度为 $d$ 的叶子最多额外贡献 $d-1$ 个节点，按 $d$ 从大到小分配即可。

**代码**

```cpp
void solve() {
    long long n, m;
    cin >> n >> m;
    long long mn = 2 * m;
    long long mx = 1 + m * (m + 1) / 2;
    if (n < mn || n > mx) {
        cout << "NO\n"; return;
    }

    long long ex = n - mn;
    vector<int> ad(m + 1, 0);
    for (int d = (int)m - 1; d >= 1; d--) {
        long long cur = min<LL>(ex, d - 1);
        ad[d] = (int)cur;
        ex -= cur;
    }

    vector<pair<int,int>> ans;
    vector<int> p(m + 1);
    int id = 1;
    p[0] = 1;
    for (int d = 1; d <= m; d++) {
        ++id; p[d] = id;
        ans.push_back({p[d-1], p[d]});
    }

    for (int d = 1; d <= m - 1; d++) {
        int len = ad[d] + 1;
        int dep = d - len;
        int pre = p[dep];
        for (int j = 1; j <= len; j++) {
            ++id;
            ans.push_back({pre, id});
            pre = id;
        }
    }

    cout << "YES\n";
    for (auto [u, v] : ans) cout << u << ' ' << v << '\n';
}
```

**复杂度分析**

时间复杂度：$O(n)$，空间复杂度：$O(n)$。

---

## F - 小苯的回文子序列

**题意**

题目链接：[133523F](https://ac.nowcoder.com/acm/contest/133523/F)

给定长度为 $n$ 的小写字母字符串 $s$，$q$ 次询问 $(l,r,x)$，每次求区间 $[l,r]$ 内长度为 $x$ 的回文子序列数量（$1\le x\le3$）。

**解题思路**

按 $x$ 分情况讨论：

- **$x=1$**：任意单字符均为回文，答案为 $r-l+1$。
- **$x=2$**：形如 $aa$，统计区间内每种字符出现次数 $k$，贡献 $C(k,2)$，答案为 $\sum_{c} C(cnt_c,2)$。
- **$x=3$**：形如 $a?a$。枚举字符 $c$，设其在区间 $[l,r]$ 内的出现位置为 $p_1<p_2<\dots<p_k$（$k\ge2$）。选定两端 $p_u,p_v$（$u<v$）后，中间可取任意下标 $t$ 满足 $p_u<t<p_v$，共 $p_v-p_u-1$ 种选择。因此字符 $c$ 对答案的贡献为
$$
\sum_{1\le u<v\le k}(p_v-p_u-1)=\sum_{u<v}(p_v-p_u)-C(k,2)
$$
只需快速计算 $\sum_{u<v}(p_v-p_u)$。

**距离和的计算**：将 $\sum_{u<v}(p_v-p_u)$ 展开，统计每个位置 $p_t$ 作为右端点或左端点出现的次数。对 $p_t$（编号为 $t$）：
- 作为右端点 $p_v$ 时，$u$ 可取 $L\sim(t-1)$，共 $t-L$ 次；
- 作为左端点 $p_u$ 时，$v$ 可取 $(t+1)\sim R$，共 $R-t$ 次。

故 $p_t$ 的总系数为
$$
(t-L)-(R-t)=2t-L-R
$$
于是
$$
\sum_{u<v}(p_v-p_u)=\sum_{t=L}^{R}p_t\cdot(2t-L-R)=2\sum t\cdot p_t-(L+R)\sum p_t
$$
预处理每个字符的位置数组以及前缀和
$$
S_i=\sum_{j=1}^i p_j,\qquad W_i=\sum_{j=1}^i j\cdot p_j
$$
即可 $O(1)$ 求得区间 $[L,R]$（该字符在 $[l,r]$ 内的位置编号区间）内的距离和：
$$
D=2(W_R-W_{L-1})-(L+R)(S_R-S_{L-1})
$$
字符 $c$ 的最终贡献为 $D-C(k,2)$。枚举全部 $26$ 个字符即可 $O(26)$ 回答单次询问。

**代码**

```cpp
LL c2(LL x) { return x * (x - 1) / 2; }

void solve() {
    int n, q;
    cin >> n >> q;
    string s;
    cin >> s;

    vector<vector<int>> pre(26, vector<int>(n + 1, 0));
    vector<vector<int>> pos(26);
    for (int c = 0; c < 26; c++) pos[c].push_back(0);

    for (int i = 1; i <= n; i++) {
        for (int c = 0; c < 26; c++) pre[c][i] = pre[c][i - 1];
        int c = s[i - 1] - 'a';
        pre[c][i]++;
        pos[c].push_back(i);
    }

    vector<vector<LL>> sp(26), sw(26);
    for (int c = 0; c < 26; c++) {
        int sz = pos[c].size();
        sp[c].assign(sz, 0);
        sw[c].assign(sz, 0);
        for (int i = 1; i < sz; i++) {
            sp[c][i] = sp[c][i - 1] + pos[c][i];
            sw[c][i] = sw[c][i - 1] + 1LL * i * pos[c][i];
        }
    }

    while (q--) {
        int l, r, x;
        cin >> l >> r >> x;
        if (x == 1) {
            cout << r - l + 1 << '\n';
            continue;
        }
        LL ans = 0;
        if (x == 2) {
            for (int c = 0; c < 26; c++) {
                LL k = pre[c][r] - pre[c][l - 1];
                ans += c2(k);
            }
            cout << ans << '\n';
            continue;
        }
        for (int c = 0; c < 26; c++) {
            int L = pre[c][l - 1] + 1;
            int R = pre[c][r];
            if (L >= R + 1) continue;
            LL k = R - L + 1;
            LL S = sp[c][R] - sp[c][L - 1];
            LL W = sw[c][R] - sw[c][L - 1];
            LL D = 2 * W - 1LL * (L + R) * S;
            ans += D - c2(k);
        }
        cout << ans << '\n';
    }
}
```

**复杂度分析**

预处理 $O(26n)$ 时间和 $O(26n)$ 空间；每次询问 $O(26)$，总时间 $O(26(n+q))$，空间 $O(26n)$。
