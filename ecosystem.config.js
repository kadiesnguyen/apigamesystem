module.exports = {
  apps: [
    {
      name: 'server',
      cwd: '/home/Server',
      script: 'bun',
      args: 'run src/index.ts',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/logs/server-error.log',
      out_file: '/home/logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'api',
      cwd: '/home/api',
      script: 'bun',
      args: 'run src/server.ts',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3300
      },
      error_file: '/home/logs/api-error.log',
      out_file: '/home/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};

