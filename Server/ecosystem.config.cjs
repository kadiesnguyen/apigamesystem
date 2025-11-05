module.exports = {
  apps: [
    {
      name: "server_slot",
      script: "dist/index.js", // File chính của ứng dụng
      interpreter: "/root/.bun/bin/bun", // Đường dẫn tới Bun
      env: {
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`
      }
    }
  ]
};