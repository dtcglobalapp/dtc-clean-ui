export function getDom() {
  return {
    childTitle: document.getElementById("childTitle"),
    childSubtitle: document.getElementById("childSubtitle"),
    childAvatar: document.getElementById("childAvatar"),
    backToProfileBtn: document.getElementById("backToProfileBtn"),

    linkedGuardianGrid: document.getElementById("linkedGuardianGrid"),
    linkedCountBadge: document.getElementById("linkedCountBadge"),
    guardianSearchInput: document.getElementById("guardianSearchInput"),
    showBlockedOnly: document.getElementById("showBlockedOnly"),
    showPickupOnly: document.getElementById("showPickupOnly"),

    availableGuardiansList: document.getElementById("availableGuardiansList"),
    availableGuardianSearchInput: document.getElementById("availableGuardianSearchInput"),
    linkGuardianBtn: document.getElementById("linkGuardianBtn"),

    editLinkDialog: document.getElementById("editLinkDialog"),
    editLinkForm: document.getElementById("editLinkForm"),
    editLinkId: document.getElementById("editLinkId"),
    editRelationship: document.getElementById("editRelationship"),
    editNotes: document.getElementById("editNotes"),
    editCanPickup: document.getElementById("editCanPickup"),
    editPickupBlocked: document.getElementById("editPickupBlocked"),
    editPrimary: document.getElementById("editPrimary"),
    editIsActive: document.getElementById("editIsActive"),
    closeEditDialogBtn: document.getElementById("closeEditDialogBtn"),
    cancelEditDialogBtn: document.getElementById("cancelEditDialogBtn"),
    deleteFromDialogBtn: document.getElementById("deleteFromDialogBtn"),

    createLinkDialog: document.getElementById("createLinkDialog"),
    createLinkForm: document.getElementById("createLinkForm"),
    createGuardianId: document.getElementById("createGuardianId"),
    createRelationship: document.getElementById("createRelationship"),
    createNotes: document.getElementById("createNotes"),
    createCanPickup: document.getElementById("createCanPickup"),
    createPickupBlocked: document.getElementById("createPickupBlocked"),
    createPrimary: document.getElementById("createPrimary"),
    createIsActive: document.getElementById("createIsActive"),
    selectedGuardianPreview: document.getElementById("selectedGuardianPreview"),
    closeCreateDialogBtn: document.getElementById("closeCreateDialogBtn"),
    cancelCreateDialogBtn: document.getElementById("cancelCreateDialogBtn"),
  };
}