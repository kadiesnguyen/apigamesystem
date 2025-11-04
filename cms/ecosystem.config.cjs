module.exports = {
  apps: [
    {
      name: "serercms",
      script: "dist/index.js", // File chính của ứng dụng
      interpreter: "/root/.bun/bin/bun", // Đường dẫn tới Bun
      env: {
        PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`
      }
    }
  ]
};