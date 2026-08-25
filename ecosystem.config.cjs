// PM2 process manager config for the Hostinger VPS.
// Usage: pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: "cpa-hub-backend",
      cwd: __dirname + "/backend",
      script: "src/server.js",
      // PORT also set here (not just backend/.env) so it can't silently drift back to :5000
      env: { NODE_ENV: "production", PORT: 5001 },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
    },
    {
      name: "cpa-hub-frontend",
      cwd: __dirname + "/cpa-hub",
      script: ".output/server/index.mjs",
      env: { NODE_ENV: "production", PORT: 3001 },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
    },
  ],
};
