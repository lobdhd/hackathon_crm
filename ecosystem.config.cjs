module.exports = {
  apps: [{
    name: "hackathon-crm",
    cwd: "/www/wwwroot/hackathon_crm",
    script: "node_modules/vite/bin/vite.js",
    args: "--host 0.0.0.0 --port 3201 --strictPort",
    interpreter: "node",
    autorestart: true,
    max_restarts: 20,
    min_uptime: "10s",
    restart_delay: 2000
  }]
};
