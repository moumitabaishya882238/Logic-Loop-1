const { startApp } = require("./src/app");

startApp().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});