import { requireAuth, supabase } from "../auth.js";
import { setupAutoRefresh } from "../core/auto-refresh.js";

let hasBooted=false;
let isLoading=false;

async function loadAlertsWrapper({silent=false}={}){
  if(isLoading) return;
  isLoading=true;

  await loadAlerts(); // tu función original

  isLoading=false;
}

const autoRefresh = setupAutoRefresh({
  onRefresh: ()=>loadAlertsWrapper({silent:true}),
  isReady: ()=>hasBooted,
  isBusy: ()=>isLoading
});

refreshBtn?.addEventListener("click", async ()=>{
  await loadAlertsWrapper();
  autoRefresh.markRefreshedNow();
});

async function boot(){
  const user=await requireAuth();
  if(!user) return;

  hasBooted=true;
  await loadAlertsWrapper();
  autoRefresh.markRefreshedNow();
}

boot();