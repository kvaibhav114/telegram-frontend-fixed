export function renderErrorPage(): string {
  return `<!DOCTYPE html>
<html><head><title>Error — Telegrok</title>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0e1621;color:#fff}
.box{text-align:center;max-width:400px;padding:2rem}h1{font-size:1.5rem}p{color:#8899a6;margin-top:.5rem}
a{display:inline-block;margin-top:1rem;padding:.5rem 1rem;background:#2b5278;color:#fff;border-radius:.5rem;text-decoration:none}</style>
</head><body><div class="box"><h1>Something went wrong</h1><p>Please try refreshing or head back home.</p><a href="/">Go home</a></div></body></html>`;
}
