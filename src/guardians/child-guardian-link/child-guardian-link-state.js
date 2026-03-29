export function createChildGuardianLinkState({ childId }) {
  return {
    childId,
    child: null,
    linked: [],
    available: [],
    selectedGuardian: null,
    editingLink: null,
  };
}