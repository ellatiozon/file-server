const http = require("http");
const fs = require("fs");
const path = require("path");
const formidable = require('formidable');

const uploadDir = path.join(__dirname, "uploads");

// Make sure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function renderPage(message = "") {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>File Upload Server</title>
      <link rel="stylesheet" href="/style.css">
  </head>
  <body>
      <div class="container">
          <h1>Upload a File</h1>
          <form action="/upload" method="post" enctype="multipart/form-data">
              <input type="file" name="myFile" required />
              <button type="submit">Upload</button>
          </form>
          <p class="message">${message}</p>
      </div>
  </body>
  </html>`;
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderPage());
  }

  else if (req.method === "POST" && req.url === "/upload") {
    const form = new formidable.IncomingForm({ multiples: false, uploadDir, keepExtensions: true });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(renderPage("⚠️ Upload error"));
        return;
      }

      const uploadedFile = files.myFile;

      // Defensive check in case no file
      if (!uploadedFile || !uploadedFile[0]) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(renderPage("⚠️ No file uploaded"));
        return;
      }

      const fileData = uploadedFile[0]; // Formidable v3+ returns array
      const fileName = (fileData.originalFilename || "").toLowerCase();
      const tempPath = fileData.filepath;

      // Only allow certain extensions
      const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
      const isValid = allowedExt.some(ext => fileName.endsWith(ext));

      if (!isValid) {
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath); // delete invalid file safely
        }
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(renderPage("❌ Invalid format. Only JPG, JPEG, PNG, PDF allowed."));
        return;
      }

      // Save file
      const newPath = path.join(uploadDir, fileName);
      fs.rename(tempPath, newPath, (err) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(renderPage("⚠️ File save error"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(renderPage("✅ Successfully uploaded!"));
      });
    });
  }

  else if (req.method === "GET" && req.url === "/style.css") {
    const cssPath = path.join(__dirname, "public", "style.css");
    fs.readFile(cssPath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("CSS not found");
      } else {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(data);
      }
    });
  }

  else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(renderPage("⚠️ Page not found"));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
