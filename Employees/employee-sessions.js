import { requireAuth, supabase } from "../auth.js";
import { setupAutoRefresh } from "../core/auto-refresh.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.getElementById("sessionsTableBody");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const messageBox = document.getElementById("messageBox");

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

let allSessions = [];
let hasBooted = false;
let isLoading = false;

function showLoading(v){loadingState.classList.toggle("hidden", !v);}
function showMessage(t){messageBox.textContent=t;}
function hideMessage(){messageBox.textContent="";}

function render(rows){
  if(!rows.length){
    tableBody.innerHTML="";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  tableWrap.classList.remove("hidden");
  tableBody.innerHTML = rows.map(r=>`<tr>
    <td>${r.employee?.display_name||"—"}</td>
    <td>${r.session_status}</td>
    <td>${r.check_in_at||"—"}</td>
    <td>${r.check_out_at||"—"}</td>
    <td>${r.total_minutes||"—"}</td>
    <td>${r.check_in_method||"—"}</td>
    <td>${r.check_out_method||"—"}</td>
  </tr>`).join("");
}

function filter(q){
  q=q.toLowerCase();
  return allSessions.filter(s =>
    (s.employee?.display_name||"").toLowerCase().includes(q)
  );
}

async function load({silent=false}={}){
  if(isLoading) return;
  isLoading=true;

  if(!silent){showLoading(true);hideMessage();}

  const {data,error}=await supabase.from("dtc_work_sessions").select("*");

  if(error){showMessage(error.message);}
  else{
    allSessions=data||[];
    render(filter(searchInput.value||""));
  }

  if(!silent)showLoading(false);
  isLoading=false;
}

const autoRefresh = setupAutoRefresh({
  onRefresh: ()=>load({silent:true}),
  isReady: ()=>hasBooted,
  isBusy: ()=>isLoading
});

searchInput?.addEventListener("input", ()=>render(filter(searchInput.value)));

refreshBtn?.addEventListener("click", async ()=>{
  await load();
  autoRefresh.markRefreshedNow();
});

async function boot(){
  const user=await requireAuth();
  if(!user) return;

  hasBooted=true;
  await load();
  autoRefresh.markRefreshedNow();
}

boot();