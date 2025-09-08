const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");

const uploadDir = path.join(__dirname, "uploads");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
    serveStaticFile(res, path.join(publicDir, "index.html"), "text/html");
  }

  else if (req.method === "POST" && req.url === "/upload") {
    const form = new formidable.IncomingForm({
      multiples: false,
      uploadDir,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(302, {
          Location: "/?msg=" + encodeURIComponent("⚠️ Upload error") + "&type=error",
        });
        res.end();
        return;
      }

      const uploadedFile = files.myFile;

      if (!uploadedFile || !uploadedFile[0]) {
        res.writeHead(302, {
          Location: "/?msg=" + encodeURIComponent("⚠️ No file uploaded") + "&type=error",
        });
        res.end();
        return;
      }

      const fileData = uploadedFile[0];
      const fileName = (fileData.originalFilename || "").toLowerCase();
      const tempPath = fileData.filepath;

      const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
      const isValid = allowedExt.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        res.writeHead(302, {
          Location:
            "/?msg=" +
            encodeURIComponent("Invalid file format. Only JPG, JPEG, PNG, PDF allowed.") +
            "&type=error",
        });
        res.end();
        return;
      }

      const newPath = path.join(uploadDir, fileName);
      fs.rename(tempPath, newPath, (err) => {
        if (err) {
          res.writeHead(302, {
            Location: "/?msg=" + encodeURIComponent("⚠️ File save error") + "&type=error",
          });
          res.end();
          return;
        }

        res.writeHead(302, {
          Location:
            "/?msg=" +
            encodeURIComponent("File successfully uploaded!") +
            "&type=success&file=" +
            encodeURIComponent(fileName),
        });
        res.end();
      });
    });
  }

  else if (req.method === "GET" && req.url === "/style.css") {
    serveStaticFile(res, path.join(publicDir, "style.css"), "text/css");
  }

  else if (req.method === "GET" && req.url === "/banner.png") {
    serveStaticFile(res, path.join(publicDir, "banner.png"), "image/jpeg");
  }

  else if (req.method === "GET" && req.url.startsWith("/uploads/")) {
    const filePath = path.join(uploadDir, decodeURIComponent(req.url.replace("/uploads/", "")));
    if (!filePath.startsWith(uploadDir)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Access denied");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".pdf") contentType = "application/pdf";

    serveStaticFile(res, filePath, contentType);
  }

  else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>⚠️ Page not found</h1>");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));