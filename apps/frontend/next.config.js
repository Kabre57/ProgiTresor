/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* 
     Configuration du compilateur SWC pour le nettoyage des logs.
     En production, tous les console.log, console.debug, console.info, etc. 
     seront supprimés pour la performance et la sécurité, 
     SAUF les console.error qui resteront actifs pour votre monitoring.
  */
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error'] } 
      : false,
  },
};

module.exports = nextConfig;
