// Test du déclenchement automatique CI/CD via GitHub
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "CI/CD SaaS fonctionne !",
    version: "1.0.0",
    environment: "kubernetes",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "UP",
  });
});

app.listen(PORT, () => {
  console.log(`Application démarrée sur le port ${PORT}`);
});
