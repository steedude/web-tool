import { LinkResolveStatus } from '../configs/link.config'

const statusCopy = {
  [LinkResolveStatus.Expired]: {
    code: 410,
    eyebrow: 'LINK EXPIRED',
    message: '\u9019\u500B\u77ED\u7DB2\u5740\u7684\u6709\u6548\u671F\u9650\u5DF2\u7D93\u7D50\u675F\uFF0C\u5167\u5BB9\u4E0D\u518D\u63D0\u4F9B\u958B\u555F\u3002',
    title: '\u9019\u689D\u9023\u7D50\u5DF2\u904E\u671F\u3002',
  },
  [LinkResolveStatus.NotFound]: {
    code: 404,
    eyebrow: 'LINK NOT FOUND',
    message: '\u53EF\u80FD\u662F\u4EE3\u78BC\u8F38\u5165\u932F\u8AA4\uFF0C\u6216\u9019\u689D\u9023\u7D50\u5DF2\u88AB\u79FB\u9664\u3002',
    title: '\u627E\u4E0D\u5230\u9019\u500B\u77ED\u7DB2\u5740\u3002',
  },
} as const

export function linkStatusPage(status: LinkResolveStatus.Expired | LinkResolveStatus.NotFound) {
  const copy = statusCopy[status]

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${copy.title} - Web Tool</title>
  <style>
    body{display:grid;min-height:100vh;place-items:center;margin:0;background:linear-gradient(135deg,#f5ffc6,#f8f2df 52%,#d8f3ff);color:#171714;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    section{box-sizing:border-box;width:min(760px,calc(100vw - 32px));border:2px solid #171714;background:#fff;padding:40px;box-shadow:10px 10px 0 #ad9cff}
    .eyebrow{margin:0;color:rgba(23,23,20,.55);font-size:12px;font-weight:900;letter-spacing:.22em}
    .code{margin:24px 0 0;color:#ff735c;font-family:ui-monospace,monospace;font-size:92px;line-height:1;font-weight:900}
    h1{margin:18px 0 0;font-size:48px;line-height:1;font-weight:900;letter-spacing:-.05em}
    p{max-width:560px;margin:18px 0 0;color:rgba(23,23,20,.7);font-size:18px;line-height:1.8}
    a{display:inline-flex;margin-top:28px;border:2px solid #171714;background:#171714;color:#fff;padding:12px 18px;font-weight:900;text-decoration:none}
  </style>
</head>
<body>
  <section>
    <p class="eyebrow">${copy.eyebrow}</p>
    <p class="code">${copy.code}</p>
    <h1>${copy.title}</h1>
    <p>${copy.message}</p>
    <a href="/links">\u56DE\u5230\u9023\u7D50\u5DE5\u5177</a>
  </section>
</body>
</html>`
}
