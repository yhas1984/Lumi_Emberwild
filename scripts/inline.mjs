import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Post-processes the Vite build into a single self-contained HTML file that
// works from file:// (double click), iframes and any browser:
//  - bundles the JS inline as a classic (non-module) script
//  - escapes </script> sequences inside the bundle
//  - uses a function replacement to avoid "$&" expansion of the bundle content
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = join(root, "dist", "index.html");
const html = readFileSync(htmlPath, "utf8");
const m = html.match(/src="\.\/assets\/([^"]+)"/);
if (!m) {
  console.error("inline: no bundle script found in dist/index.html");
  process.exit(1);
}
let js = readFileSync(join(root, "dist", "assets", m[1]), "utf8");
js = js.replace(/<\/script>/gi, "<\\/script>");

const marker = '<div id="boot-error"';
const injection = '  <script>' + js + '</script>\n  ' + marker;
const standalone = html
  .replace(/<script type="module"[^>]*><\/script>/, "")
  .replace(/<link rel="icon"[^>]*>/, "")
  // Function replacement avoids "$&" expansion of the bundle content.
  .replace(marker, () => injection);

writeFileSync(htmlPath, standalone);
writeFileSync(join(root, "dist", "lumi-standalone.html"), standalone);
console.log("self-contained build written: dist/index.html + dist/lumi-standalone.html (" + Math.round(standalone.length / 1024) + " KB)");
