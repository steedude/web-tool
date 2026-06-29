export function passwordPage(slug: string, error = '') {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>需要密碼｜Web Tool</title>
  <style>
    body{display:grid;min-height:100vh;place-items:center;margin:0;background:#f8f2df;color:#171714;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    form{width:min(420px,calc(100vw - 32px));border:2px solid #171714;background:#fff;padding:28px;box-shadow:8px 8px 0 #ad9cff}
    h1{margin:0 0 10px;font-size:32px;line-height:1;font-weight:900;letter-spacing:-.04em}
    p{margin:0 0 20px;color:rgba(23,23,20,.68);line-height:1.7}
    input,button{box-sizing:border-box;width:100%;border:2px solid #171714;padding:14px 16px;font:inherit}
    input{background:#f8f2df}
    button{margin-top:12px;background:#171714;color:#fff;font-weight:900;cursor:pointer}
    .error{margin:0 0 14px;border-left:4px solid #ff6b57;background:rgba(255,107,87,.15);padding:10px 12px;color:#171714;font-weight:700}
    code{font-weight:800}
  </style>
</head>
<body>
  <form method="post" action="/s/${slug}">
    <h1>這個短網址有鎖</h1>
    <p>輸入建立者設定的密碼後，才會前往 <code>/s/${slug}</code>。</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <input name="password" type="password" autocomplete="current-password" placeholder="輸入密碼" autofocus required>
    <button>解鎖前往</button>
  </form>
</body>
</html>`
}
