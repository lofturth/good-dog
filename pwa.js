if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch((error) => {
    console.warn("Good Dog offline setup failed:", error);
  });
}
