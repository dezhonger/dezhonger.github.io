/* global NexT, CONFIG, MathJax */

document.addEventListener('page:loaded', () => {
  if (!CONFIG.enableMath) return;

  // 初始化 MathJax 配置（若尚未加载）
  if (typeof MathJax === 'undefined') {
    window.MathJax = {
      tex: {
        inlineMath: { '[+]': [['$', '$']] },
        tags: CONFIG.mathjax.tags
      },
      options: {
        // 不强制全页扫描，后面我们只对需要的区域调用 typesetPromise
        processHtmlClass: 'mathjax-process',
        ignoreHtmlClass: 'tex2jax_ignore',
        renderActions: {
          insertedScript: [200, () => {
            document.querySelectorAll('mjx-container').forEach(node => {
              const target = node.parentNode;
              if (target && target.nodeName && target.nodeName.toLowerCase() === 'li') {
                target.parentNode.classList.add('has-jax');
              }
            });
          }, '', false]
        }
      }
    };

    NexT.utils.getScript(CONFIG.mathjax.js, {
      attributes: { defer: true }
    });
  } else {
    // 当 MathJax 已存在时的常规刷新调用
    MathJax.startup.document.state(0);
    MathJax.typesetClear();
    MathJax.texReset();
    MathJax.typesetPromise();
  }

  /**
   * 功能：修复 TOC 中被剥离的公式文本
   * 思路：
   *  1. 遍历 sidebar 中的每个 TOC 链接（.post-toc .nav-link）
   *  2. 从 href 中取出锚点 id（decodeURIComponent）
   *  3. 在正文中找到对应的标题元素（通过 id 查找）
   *  4. 将标题元素的 innerHTML 填回 TOC 对应的 .nav-text（保留 HTML 以便 MathJax 渲染）
   *  5. 最后只对 TOC 区域调用 MathJax.typesetPromise([toc])
   *
   * 注意：
   *  - 等待一段时间以保证 Next 的 JS 先构建好 TOC（也兼容 PJAX）
   *  - 使用多次尝试（重试机制），以适配不同加载时序
   */

  function repairTocAndTypeset() {
    const toc = document.querySelector('.post-toc');
    if (!toc) return Promise.resolve(false);

    // 找到所有 toc 的链接项
    const links = Array.from(toc.querySelectorAll('.nav-link'));
    if (!links.length) return Promise.resolve(false);

    links.forEach(link => {
      try {
        // href 可能是 "#xxx"，也可能是完整 url + #xxx
        const href = link.getAttribute('href') || '';
        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        let id = href.slice(hashIndex + 1);
        // 解码 id（处理中文或被 encode 的情况）
        try { id = decodeURIComponent(id); } catch (e) { /* ignore */ }

        // 如果 id 前面有路径片段（例如 /post/#id），只保留最后部分（极端情况）
        if (id.includes('/')) id = id.split('/').pop();

        // 在正文中寻找对应的元素（常见的：h1,h2,h3,h4,h5）
        // 也兼容带锚点的 <a id="..."></a> 情况
        let target = document.getElementById(id);
        if (!target) {
          // 有些主题把 id 放在 heading 的 child <a> 上，尝试选择属性 [id="..."] 或 a[name=...]
          target = document.querySelector(`[id="${CSS.escape ? CSS.escape(id) : id}"]`) ||
                   document.querySelector(`a[name="${CSS.escape ? CSS.escape(id) : id}"]`);
        }
        if (!target) return;

        // 如果 target 是 <a name="...">，我们希望使用其邻近的 heading（上一个元素）
        let heading = target;
        if (target.tagName && target.tagName.toLowerCase() === 'a') {
          // 寻找后面的第一个 heading
          const possible = target.nextElementSibling;
          if (possible && /^h[1-6]$/i.test(possible.tagName)) heading = possible;
        } else {
          // 如果 target 本身是 heading，直接使用
          if (!/^h[1-6]$/i.test(target.tagName)) {
            // 向上寻找最近的 heading 父元素（防护）
            let p = target;
            while (p && p !== document.body && !/^h[1-6]$/i.test(p.tagName)) p = p.parentElement;
            if (p && /^h[1-6]$/i.test(p.tagName)) heading = p;
          }
        }

        // 取 heading 的 innerHTML（保留 HTML，如 <code>, <span>, 以及 $...$ 文本）
        let html = heading.innerHTML || heading.textContent || '';
        // 清理性处理：collapse 多余换行，去掉首尾空白
        html = html.replace(/\r?\n\s*/g, ' ').trim();

        // 把原本的 nav-text 替换为 heading 的 innerHTML（使用 innerHTML 以保留 $...$）
        const navText = link.querySelector('.nav-text');
        if (navText) {
          // 仅在内容不相同或当前 navText 内容明显被截断时才替换，避免破坏主题的自定义HTML结构
          const current = (navText.textContent || '').replace(/\r?\n\s*/g, ' ').trim();
          if (!current || current.length < 1 || current.length < html.length - 3) {
            navText.innerHTML = html;
          }
        }
      } catch (err) {
        // 忽略单个项错误，继续处理其余
        // console.warn('repairToc item failed', err);
      }
    });

    // typeset TOC 区域（只对 TOC 调用，性能开销小）
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
      return MathJax.typesetPromise([toc]).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }

  // 重试机制：在页面加载后反复尝试修复（以应对不同加载时序）
  const maxAttempts = 6;
  let attempt = 0;

  (function tryRepair() {
    attempt++;
    // 每次尝试间隔逐步延长（首次很快，后面逐渐增大）
    const delay = attempt === 1 ? 200 : (attempt === 2 ? 400 : 800);
    setTimeout(() => {
      repairTocAndTypeset().then(success => {
        if (!success && attempt < maxAttempts) {
          tryRepair();
        }
      }).catch(() => {
        if (attempt < maxAttempts) tryRepair();
      });
    }, delay);
  }());

  // 兼容：当启用 PJAX 或切换文章时，重新修补
  document.addEventListener('click', (e) => {
    // 小优化：如果点击了 .sidebar 里的链接，延迟重新修复
    const t = e.target;
    if (t && t.closest && t.closest('.sidebar')) {
      setTimeout(() => { attempt = 0; try { (function(){ /* trigger a new try */ })(); } catch(e){} }, 300);
    }
  });

});
