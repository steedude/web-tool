export function passwordPage(slug: string, error = '') {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>需要密碼｜Web Lab</title>
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

export function imagePasswordPage(slug: string, error = '') {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>受保護的圖片</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f0df;color:#171714;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    form{width:min(420px,calc(100vw - 32px));background:white;border:2px solid #171714;box-shadow:8px 8px 0 #ad9cff;padding:28px}
    h1{margin:0 0 12px;font-size:28px;line-height:1;font-weight:900}
    p{margin:0 0 20px;color:rgb(23 23 20 / .65);font-weight:700;line-height:1.6}
    input,button{box-sizing:border-box;width:100%;border:2px solid #171714;padding:14px 16px;font:inherit;font-weight:800}
    input{background:#f5f0df}
    button{margin-top:12px;background:#171714;color:white;cursor:pointer}
    .error{margin-top:12px;border-left:4px solid #ff6b57;background:rgb(255 107 87 / .16);padding:10px 12px;color:#171714}
  </style>
</head>
<body>
  <form method="post" action="/image/${slug}">
    <h1>這張圖片受到保護</h1>
    <p>請輸入密碼，通過後才會顯示圖片內容。</p>
    <input name="password" type="password" autocomplete="current-password" placeholder="輸入密碼" autofocus required>
    <button type="submit">查看圖片</button>
    ${error ? `<p class="error">${error}</p>` : ''}
  </form>
</body>
</html>`
}

export function imagePage(imageUrl: string, title = '圖片分享', description = '') {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const safeImageUrl = escapeHtml(imageUrl)
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImageUrl}">
  <style>
    body{margin:0;min-height:100vh;background:#171714;color:white;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    article{width:min(1100px,100%)}
    img{display:block;max-width:100%;max-height:78vh;margin:auto;border:2px solid white;background:white;object-fit:contain}
    h1{margin:20px 0 8px;font-size:clamp(28px,5vw,56px);line-height:.95;font-weight:900}
    p{margin:0;color:rgb(255 255 255 / .7);font-weight:700;line-height:1.7}
  </style>
</head>
<body>
  <main>
    <article>
      <img src="${safeImageUrl}" alt="${safeTitle}">
      <h1>${safeTitle}</h1>
      ${safeDescription ? `<p>${safeDescription}</p>` : ''}
    </article>
  </main>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
