module.exports = {
  apps: [
    {
      name: "api",
      cwd: "/home/api",
      script: "/root/.bun/bin/bun",   // đường dẫn bun
      args: "run dev",                // chạy script dev trong package.json
      interpreter: "none",            // QUAN TRỌNG: không dùng node wrapper của PM2
      env: {
        NODE_ENV: "development",
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
