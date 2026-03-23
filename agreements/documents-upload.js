import { supabase, requireAuth } from "../auth.js";

const form = document.getElementById("documentForm");
const messageBox = document.getElementById("messageBox");
const childSelect = document.getElementById("child_id");
const saveBtn = document.getElementById("saveBtn");

const params = new URLSearchParams(window.location.search);
const preselectedChildId = params.get("child_id");

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function setLoading(loading) {
  saveBtn.disabled = loading;
  saveBtn.textContent = loading ? "Uploading..." : "Upload Document";
}

async function getCurrentUserAndOrg() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data: orgMembership, error: orgError } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (orgError) throw orgError;
  if (!orgMembership?.organization_id) {
    throw new Error("No organization found for this user.");
  }

  return {
    user,
    organizationId: orgMembership.organization_id,
  };
}

async function loadChildrenOptions() {
  const { organizationId } = await getCurrentUserAndOrg();

  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId)
    .order("first_name", { ascending: true });

  if (error) throw error;

  childSelect.innerHTML = `<option value="">Select child</option>`;

  for (const child of data ?? []) {
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = `${child.first_name} ${child.last_name}`;
    childSelect.appendChild(option);
  }

  if (preselectedChildId) {
    childSelect.value = preselectedChildId;
  }
}

function buildStoragePath(childId, fileName) {
  const safeName = fileName.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return `child-documents/${childId}/${Date.now()}-${safeName}`;
}

async function uploadFileToStorage(file, childId) {
  const storagePath = buildStoragePath(childId, file.name);

  const { error } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("dtc-documents")
    .getPublicUrl(storagePath);

  return {
    fileUrl: data.publicUrl,
    fileName: file.name,
    mimeType: file.type || null,
  };
}

async function insertChildDocument(payload) {
  const { data, error } = await supabase
    .from("child_documents")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  try {
    await loadChildrenOptions();
  } catch (error) {
    console.error("Load children options error:", error);
    showMessage(`Could not load children: ${error.message}`, "error");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setLoading(true);

  try {
    const { user, organizationId } = await getCurrentUserAndOrg();

    const fileInput = document.getElementById("file_input");
    const file = fileInput.files?.[0];

    if (!file) {
      throw new Error("Please select a PDF or image file.");
    }

    const childId = document.getElementById("child_id").value;
    if (!childId) {
      throw new Error("Please select a child.");
    }

    const documentType = document.getElementById("document_type").value;
    if (!documentType) {
      throw new Error("Please select a document type.");
    }

    const title = document.getElementById("title").value.trim();
    if (!title) {
      throw new Error("Please enter a title.");
    }

    const uploaded = await uploadFileToStorage(file, childId);

    const payload = {
      organization_id: organizationId,
      child_id: childId,
      uploaded_by_user_id: user.id,
      uploaded_by_role: "staff",
      source_type: "staff_uploaded",
      review_status: "pending_review",
      document_type: documentType,
      title,
      file_url: uploaded.fileUrl,
      file_name: uploaded.fileName,
      mime_type: uploaded.mimeType,
      issue_date: document.getElementById("issue_date").value || null,
      expires_at: document.getElementById("expires_at").value || null,
      requires_renewal: document.getElementById("requires_renewal").checked,
      notes: document.getElementById("notes").value.trim() || null,
    };

    await insertChildDocument(payload);

    showMessage("Document uploaded successfully and sent to Pending Review.", "info");

    setTimeout(() => {
      window.location.href = `./documents-list.html?child_id=${encodeURIComponent(childId)}`;
    }, 900);
  } catch (error) {
    console.error("Upload document error:", error);
    showMessage(error.message || "Could not upload document.", "error");
  } finally {
    setLoading(false);
  }
});

init();