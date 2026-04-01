import { supabase, requireAuth } from "../auth.js";
import { setupAutoRefresh } from "../core/auto-refresh.js";

let hasBooted=false;
let isLoading=false;

async function loadDocuments({silent=false}={}){
  if(isLoading) return;
  isLoading=true;

  // TODO: aquí va tu lógica original SIN TOCAR
  await originalLoadDocuments();

  isLoading=false;
}

const autoRefresh = setupAutoRefresh({
  onRefresh: ()=>loadDocuments({silent:true}),
  isReady: ()=>hasBooted,
  isBusy: ()=>isLoading
});

refreshBtn?.addEventListener("click", async ()=>{
  await loadDocuments();
  autoRefresh.markRefreshedNow();
});

async function boot(){
  const user=await requireAuth();
  if(!user) return;

  hasBooted=true;
  await loadDocuments();
  autoRefresh.markRefreshedNow();
}

boot();