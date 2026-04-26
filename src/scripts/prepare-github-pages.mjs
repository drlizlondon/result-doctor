import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), "dist/client");
const indexHtml = path.join(outputDir, "index.html");
const notFoundHtml = path.join(outputDir, "404.html");
const noJekyll = path.join(outputDir, ".nojekyll");

if (!existsSync(indexHtml)) {
  throw new Error(`GitHub Pages preparation failed: ${indexHtml} was not created.`);
}

copyFileSync(indexHtml, notFoundHtml);
writeFileSync(noJekyll, "");

console.log("Prepared GitHub Pages artifact:");
console.log(`- ${path.relative(process.cwd(), notFoundHtml)}`);
console.log(`- ${path.relative(process.cwd(), noJekyll)}`);
