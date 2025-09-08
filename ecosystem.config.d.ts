export let apps: {
  name: string;
  script: string;
  instances: string;
  exec_mode: string;
  watch: boolean;
  max_memory_restart: string;
  node_args: string;
  log_date_format: string;
  error_file: string;
  out_file: string;
  max_size: string;
  rotate_interval: string;
  max_logs: number;
  combine_logs: boolean;
  merge_logs: boolean;
  time: boolean;
  wait_ready: boolean;
  listen_timeout: number;
  kill_timeout: number;
  env: {
    NODE_CONFIG_DISABLE_FILE_WATCH: string;
    NODE_APP_INSTANCE: string;
    NODE_ENV: string;
  };
  env_staging: {
    NODE_CONFIG_DISABLE_FILE_WATCH: string;
    NODE_APP_INSTANCE: string;
    NODE_ENV: string;
  };
  env_production: {
    NODE_CONFIG_DISABLE_FILE_WATCH: string;
    NODE_APP_INSTANCE: string;
    NODE_ENV: string;
  };
}[];
