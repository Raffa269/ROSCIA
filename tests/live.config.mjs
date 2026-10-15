import {defineConfig} from '@playwright/test';
if(!process.env.ROSCIA_LIVE_URL)throw Error('ROSCIA_LIVE_URL obbligatoria');
export default defineConfig({testDir:'./live',workers:1,timeout:120000,retries:0,use:{baseURL:process.env.ROSCIA_LIVE_URL,serviceWorkers:'allow',trace:'off',screenshot:'off',launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox'],proxy:{server:process.env.HTTPS_PROXY || 'http://proxy:8080'}}}});
