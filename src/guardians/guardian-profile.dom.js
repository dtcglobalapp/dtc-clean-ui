export function getGuardianProfileDom() {
  return {
    pageTitle: document.getElementById("guardianPageTitle"),
    pageSubtitle: document.getElementById("guardianPageSubtitle"),
    feedback: document.getElementById("guardianFeedback"),
    loading: document.getElementById("guardianLoading"),
    notFound: document.getElementById("guardianNotFound"),
    content: document.getElementById("guardianProfileContent"),

    avatar: document.getElementById("guardianAvatar"),
    fullName: document.getElementById("guardianFullName"),
    role: document.getElementById("guardianRole"),
    statusBadge: document.getElementById("guardianStatusBadge"),
    primaryBadge: document.getElementById("guardianPrimaryBadge"),

    phone: document.getElementById("guardianPhone"),
    email: document.getElementById("guardianEmail"),
    relationship: document.getElementById("guardianRelationship"),
    language: document.getElementById("guardianLanguage"),
    address: document.getElementById("guardianAddress"),
    emergencyFlag: document.getElementById("guardianEmergencyFlag"),
    notes: document.getElementById("guardianNotes"),

    childrenEmpty: document.getElementById("guardianChildrenEmpty"),
    childrenWrap: document.getElementById("guardianChildrenWrap"),
    childrenTableBody: document.getElementById("guardianChildrenTableBody"),

    btnRefresh: document.getElementById("btnRefreshGuardian"),
    btnEdit: document.getElementById("btnEditGuardian"),
    btnCall: document.getElementById("btnCallGuardian"),
    btnEmail: document.getElementById("btnEmailGuardian"),
  };
}