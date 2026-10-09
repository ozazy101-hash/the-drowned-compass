import { defineConfig, devices } from '@playwright/test';
// Workshop/revision already contain their own laptop/phone and touch journeys.
const shared = ['map-display-live.spec.ts','map-aligned-stages.spec.ts','map-display.spec.ts','party-display.spec.ts','map-integrated-workflows.spec.ts'];
export default defineConfig({testDir:'./e2e',workers:1,timeout:120000,reporter:[['list'],['json',{outputFile:'.scratch/map-creation/evidence/12-browser.json'}]],outputDir:'/private/tmp/map-integration-12-browser',use:{baseURL:'http://127.0.0.1:4182/the-drowned-compass/',trace:'off'},projects:[
 {name:'creation-and-revision',testMatch:['map-workshop.spec.ts','map-revision.spec.ts'],use:{...devices['Desktop Chrome'],channel:'chrome'}},
 {name:'laptop',testMatch:shared,use:{...devices['Desktop Chrome'],channel:'chrome'}},
 {name:'phone',testMatch:shared,use:{...devices['Pixel 7'],channel:'chrome'}}
],webServer:{command:'VITE_USE_IN_MEMORY_DATA=true node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4182 --strictPort',url:'http://127.0.0.1:4182/the-drowned-compass/',reuseExistingServer:false}});
