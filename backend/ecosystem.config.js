// PM2 para mantener el backend vivo y reiniciarlo solo si se cae.
// Uso en el servidor (dentro de backend/, tras `npm run build`):
//   pm2 start ecosystem.config.js
//   pm2 save           (para que sobreviva reinicios del servidor)
//   pm2 startup        (una vez, sigue las instrucciones que imprime)
module.exports = {
  apps: [
    {
      name: 'raices-api',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',          // el rate-limit/bloqueo de login es en memoria: un solo proceso
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      autorestart: true,
      time: true,
    },
  ],
};
