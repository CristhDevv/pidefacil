module.exports = {
  apps: [
    {
      name: 'dropi-enrich-daemon',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'scripts/enrich-daemon.ts',
      autorestart: true,
      max_restarts: 100,
      restart_delay: 4000,
      watch: false,
      env: {
        NODE_ENV: 'production',
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
      }
    }
  ]
};
