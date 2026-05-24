module.exports = {
  apps: [
    {
      name: 'gitsync',
      script: 'dist/index.js',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
