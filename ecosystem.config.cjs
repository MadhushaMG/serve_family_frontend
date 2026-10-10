module.exports = {
  apps: [
    {
      name: 'serve-family-backend',
      script: 'dist/app.js',
      // Set to 1 for in-memory socket & timeout sync. Use 'max' only when Redis Adapter (@socket.io/redis-adapter) is installed.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Automatically restarts if memory leaks exceed 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
