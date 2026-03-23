import { requireAuth, supabase } from "./auth.js";

const childrenCount = document.getElementById("childrenCount");
const documentsCount = document.getElementById("documentsCount");
const pendingDocsCount = document.getElementById("pendingDocsCount");
const expiringDocsCount = document.getElementById("expiringDocsCount");
const alertsList = document.getElementById("alertsList");

function createAlertCard({ icon, title, message, tone = "neutral" }) {
  return `
    <article class="alert-card ${tone}">
      <div class="alert-icon">${icon}</div>
      <div class="alert-copy">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    </article>
  `;
}

function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function futureKey(daysAhead = 30) {
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  return [
    future.getFullYear(),
    String(future.getMonth() + 1).padStart(2, "0"),
    String(future.getDate()).padStart(2, "0"),
  ].join("-");
}

async function loadDashboard() {
  const user = await requireAuth();
  if (!user) return;

  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select("id", { count: "exact" });

  if (childrenError) {
    console.error("Children dashboard error:", childrenError);
  }

  const { data: documents, error: documentsError } = await supabase
    .from("child_documents")
    .select("id, review_status, expires_at", { count: "exact" });

  if (documentsError) {
    console.error("Documents dashboard error:", documentsError);
  }

  const docs = documents ?? [];
  const totalChildren = children?.length ?? 0;
  const totalDocuments = docs.length;
  const pending = docs.filter(doc => doc.review_status === "pending_review").length;

  const now = todayKey();
  const soon = futureKey(30);
  const expiringSoon = docs.filter(doc => doc.expires_at && doc.expires_at >= now && doc.expires_at <= soon).length;

  childrenCount.textContent = String(totalChildren);
  documentsCount.textContent = String(totalDocuments);
  pendingDocsCount.textContent = String(pending);
  expiringDocsCount.textContent = String(expiringSoon);

  const alerts = [];

  if (pending > 0) {
    alerts.push({
      icon: "⏳",
      title: `${pending} document${pending === 1 ? "" : "s"} pending review`,
      message: "Review and approve uploaded files so the daycare stays organized and inspection-ready.",
      tone: "warning",
    });
  }

  if (expiringSoon > 0) {
    alerts.push({
      icon: "⚠️",
      title: `${expiringSoon} document${expiringSoon === 1 ? "" : "s"} expiring soon`,
      message: "Follow up before deadlines arrive, avoid stress, and keep records updated for the city and agencies.",
      tone: "warning",
    });
  }

  if (totalChildren > 0 && totalDocuments === 0) {
    alerts.push({
      icon: "📄",
      title: "Children need document records",
      message: "Start uploading vaccine records, medical forms, agreements, and other required files.",
      tone: "neutral",
    });
  }

  if (!alerts.length) {
    alerts.push({
      icon: "✅",
      title: "Good foundation in place",
      message: "Your daycare dashboard is active and ready. As more modules grow, DTC will surface smarter operational alerts here.",
      tone: "success",
    });
  }

  alertsList.innerHTML = alerts.map(createAlertCard).join("");
}

loadDashboard();