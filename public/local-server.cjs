const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const root = __dirname;
const requestedPort = Number(process.argv[2]);
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function openBrowser(url) {
  const platform = process.platform;

  if (platform === "win32") {
    exec(`start "" "${url}"`);
    return;
  }

  if (platform === "darwin") {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

function resolveRequestPath(requestUrl) {
  const safeUrl = decodeURIComponent((requestUrl || "/").split("?")[0]);
  const normalizedPath = safeUrl === "/" ? "/index.html" : safeUrl;
  const filePath = path.normalize(path.join(root, normalizedPath));

  if (!filePath.startsWith(root)) {
    return path.join(root, "index.html");
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          response.writeHead(404);
          response.end("App non trovata.");
          return;
        }

        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(fallbackContent);
      });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    response.end(content);
  });
});

server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Mio Portafoglio aperto su ${url}`);
  console.log("Chiudi questa finestra per fermare l'app.");
  openBrowser(url);
});
