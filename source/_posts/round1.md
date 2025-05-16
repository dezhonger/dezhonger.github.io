---
title: 牛客周赛 Round 1
mathjax: true
categories: # 分类
    - 算法竞赛  # 只能有一个
tags:
- 软件测试
- 符号执行
- 牛客
---


# 牛客周赛 Round 1
- 题目: https://ac.nowcoder.com/acm/contest/60245#question
- 题解: https://blog.nowcoder.net/n/b47135dffd0e47a4a0f76e0195d689e7
<!-- more -->

## T1
模拟


## T2
统计相同的数字两种颜色分别有多少个位置，乘起来即可

## T3
两种情况 "1010101....", 或者"010101...", 分别计算求最小值.难点在于如何计算

sol1:
两个树状数组，分别维护0的位置和1的位置。每次计算的时候，即求0前面有多少个1(或者1前面有多少个0), 当前位置计算后，在树状数组里删掉

sol2:
直接贪心, $sigma(abs(expectPosition_{i} - current_{i}))$
```
void solve() {
    string s;
    cin >> s;
    int n = s.size();
    vector<int> p0, p1;
    for (int i = 0; i < n; i++) {
        if (s[i] == '0')
            p0.push_back(i);
        else
            p1.push_back(i);
    }

    auto cal = [&](vector<int>& p0, vector<int>& p1) -> LL {
        if (p0.size() < p1.size())
            return LLONG_MAX;
        LL res = 0;
        for (int i = 0; i < p0.size(); i++)
            res += abs(p0[i] - 2 * i);
        return res;
    };

    cout << min(cal(p0, p1), cal(p1, p0)) << endl;
}
```

## T4
DP:

sol1:
f[i][j] 以第i个位置结尾，余数是j的序列个数, f[i][j]  <- sum(f[k][x](k < i, (k*10+s[i]-'0')%9==j),
表示把前面的以x结尾的序列后面加上s[i], 用前缀和维护一下(<i)的按照余数分类的总个数, 时间复杂度O(N)

```
const int mod = 1e9 + 7;

void update(LL &x, int y) {
    x += y;
    if (x >= mod) {
        x -= mod;
    }
}

void solve() {
    string s;
    cin >> s;
    int n = s.size();
    s = " " + s;
    vector<vector<LL>> f(n + 1, vector<LL>(9));
    vector<LL> sum(9);

    int v = (s[1] - '0') % 9;
    sum[v] = f[1][v] = 1;

    for (int i = 2; i <= n; i++) {
        v = (s[i] - '0') % 9;
        f[i][v] = 1;
        for (int j = 0; j < 9; j++) {
            int w = (j * 10 + v) % 9;
            update(f[i][w], sum[j]);
        }
        for (int j = 0; j < 9; j++) {
            update(sum[j], f[i][j]); 
        }
    }
    cout << sum[0] << endl;
}
```

sol2.
f[i][j] 表示前i个元素中，余数是j的序列的个数。 递推过程中，比如考虑到i, 考虑f[i-1][j]的序列后面加上s[i], 累加到f[i][j*10+s[i]]上

```
const int mod = 1e9 + 7;

void update(LL& x, int y) {
    x += y;
    if (x >= mod) {
        x -= mod;
    }
}

void solve() {
    string s;
    cin >> s;
    int n = s.size();
    s = " " + s;
    vector<LL> sum(9);
    sum[(s[1] - '0') % 9] = 1;

    for (int i = 2; i <= n; i++) {
        vector<LL> f(9);
        int v = (s[i] - '0') % 9;
        f[v] = 1;
        for (int j = 0; j < 9; j++) {
            update(f[j], sum[j]);
            int w = (j * 10 + v) % 9;
            update(f[w], sum[j]);
        }
        sum = f;
    }
    cout << sum[0] << endl;
}
```
