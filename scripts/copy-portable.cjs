const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const source = path.join(projectRoot, "dist", "index.html");
const destination = path.join(projectRoot, "Apri App.html");

fs.copyFileSync(source, destination);
console.log("Creato Apri App.html nella cartella principale.");
