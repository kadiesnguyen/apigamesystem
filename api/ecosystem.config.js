module.exports = {
  apps: [
    {
      name: "api",
      script: "run",
      args: "dev",
      interpreter: "/root/.bun/bin/bun",
      cwd: "/home/api",
      watch: false,
    },
  ],
};
