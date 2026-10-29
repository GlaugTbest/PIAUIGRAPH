import { chromium } from "@playwright/test";
import { mkdir,writeFile } from "node:fs/promises";
const origin=process.env.PLAYWRIGHT_BASE_URL??"http://127.0.0.1:3000";
const directory=".impeccable/review/civic";await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const reports=[];
for(const spec of [{name:"desktop",width:1440,height:1000,url:"/"},{name:"mobile",width:390,height:844,url:"/"},{name:"detail",width:1440,height:1000,url:"/?m=2208106&case=06554893000101-1-000001%2F2025"},{name:"network",width:1440,height:1000,url:"/?supplier=12973088000107&tab=network&depth=2"}]){
  const page=await browser.newPage({viewport:{width:spec.width,height:spec.height},reducedMotion:"reduce"});const errors=[];
  page.on("pageerror",e=>errors.push(e.message));await page.addInitScript(()=>{window.__lcp=0;new PerformanceObserver(list=>{for(const x of list.getEntries())window.__lcp=x.startTime;}).observe({type:"largest-contentful-paint",buffered:true});});
  await page.goto(origin+spec.url);await page.locator(".coverage-footer").waitFor();
  if(spec.name==="detail")await page.locator(".record-title").waitFor();else if(spec.name==="network")await page.locator(".network-node").first().waitFor();else await page.locator(".purchase-row").first().waitFor();
  if(spec.name==="desktop")await page.locator('[data-map-ready="true"]').waitFor({timeout:30000});
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.scrollTo(0,0);});
  await page.screenshot({path:`${directory}/${spec.name}.png`,fullPage:true});
  await page.screenshot({path:`${directory}/${spec.name}-viewport.png`,fullPage:false});
  reports.push({spec,errors,...await page.evaluate(()=>({lcpMs:window.__lcp,overflow:document.documentElement.scrollWidth>innerWidth+1,resourceBytes:performance.getEntriesByType("resource").reduce((s,x)=>s+x.encodedBodySize,0)}))});await page.close();
}
await browser.close();await writeFile(`${directory}/evidence.json`,JSON.stringify({origin,capturedAt:new Date().toISOString(),reports},null,2));console.log(JSON.stringify(reports));
