module.exports = {
  apps: [
    {
      name: 'sync-bridge',
      script: './build/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable cluster mode for scalability
      watch: false, // Disable watch in production

      // Memory management
      max_memory_restart: '1G', // Restart instance if memory exceeds 1GB
      node_args: '--max-old-space-size=4096 --optimize_for_size --gc-interval=100', // Optimize GC behavior

      // Logging configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/combined.log',
      max_size: '20M',
      rotate_interval: '1d',
      max_logs: 14,
      combine_logs: true,
      merge_logs: true,
      time: true,

      // Process lifecycle configuration
      wait_ready: true, // Ensure app signals readiness before being fully started
      listen_timeout: 10000, // Allow sufficient time for the app to start
      kill_timeout: 30000, // Allow a graceful shutdown of processes

      // Development environment
      env: {
        NODE_CONFIG_DISABLE_FILE_WATCH: 'Y',
        NODE_APP_INSTANCE: '',
        NODE_ENV: 'development',
      },

      // Staging environment
      env_staging: {
        NODE_CONFIG_DISABLE_FILE_WATCH: 'Y',
        NODE_APP_INSTANCE: '',
        NODE_ENV: 'staging',
      },

      // Production environment
      env_production: {
        NODE_CONFIG_DISABLE_FILE_WATCH: 'Y',
        NODE_APP_INSTANCE: '',
        NODE_ENV: 'production',
      },
    },
  ],
};
