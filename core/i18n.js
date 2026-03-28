const DICTIONARY = {
  en: {
    common: {
      back: "Back",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      refresh: "Refresh",
      open: "Open",
      status: "Status",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      loading: "Loading...",
      employee: "Employee",
      employees: "Employees",
      payments: "Payments",
      contactInfo: "Contact Info",
      accessSecurity: "Access & Security",
      recentWorkSessions: "Recent Work Sessions",
      totalPaid: "Total Paid",
      pending: "Pending",
      sessions: "Sessions",
      earned: "Earned",
      hoursWorked: "Hours Worked",
      pin: "PIN",
      pinEnabled: "PIN Enabled",
      faceScan: "Face Scan",
      allowedRadius: "Allowed Radius",
      yes: "Yes",
      no: "No",
      smartEmployeeProfile: "Smart employee profile",
      noNotesAvailable: "No notes available.",
      openSession: "Open session",
      invalidEmployeeId: "Invalid employee ID"
    },
    brand: {
      defaultVertical: "Daycare Control"
    },
    employeeProfile: {
      title: "Employee Profile",
      subtitle: "View employee access, identity, and kiosk permissions."
    },
    employeeForm: {
      addTitle: "Add Employee",
      editTitle: "Edit Employee",
      subtitle: "Create or update staff access, roles, and kiosk permissions."
    }
  },

  es: {
    common: {
      back: "Volver",
      edit: "Editar",
      save: "Guardar",
      cancel: "Cancelar",
      refresh: "Actualizar",
      open: "Abrir",
      status: "Estado",
      email: "Correo",
      phone: "Teléfono",
      notes: "Notas",
      loading: "Cargando...",
      employee: "Empleado",
      employees: "Empleados",
      payments: "Pagos",
      contactInfo: "Información de contacto",
      accessSecurity: "Acceso y seguridad",
      recentWorkSessions: "Sesiones de trabajo recientes",
      totalPaid: "Total pagado",
      pending: "Pendiente",
      sessions: "Sesiones",
      earned: "Ganado",
      hoursWorked: "Horas trabajadas",
      pin: "PIN",
      pinEnabled: "PIN habilitado",
      faceScan: "Escaneo facial",
      allowedRadius: "Radio permitido",
      yes: "Sí",
      no: "No",
      smartEmployeeProfile: "Perfil inteligente del empleado",
      noNotesAvailable: "No hay notas disponibles.",
      openSession: "Sesión abierta",
      invalidEmployeeId: "ID de empleado inválido"
    },
    brand: {
      defaultVertical: "Control de Daycare"
    },
    employeeProfile: {
      title: "Perfil del Empleado",
      subtitle: "Vea acceso, identidad y permisos de kiosko del empleado."
    },
    employeeForm: {
      addTitle: "Agregar Empleado",
      editTitle: "Editar Empleado",
      subtitle: "Cree o actualice acceso del personal, roles y permisos del kiosko."
    }
  }
};

const STORAGE_KEY = "dtc_language";
const DEFAULT_LANGUAGE = "en";

export function getSupportedLanguages() {
  return Object.keys(DICTIONARY);
}

export function getCurrentLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && DICTIONARY[saved]) return saved;
  return DEFAULT_LANGUAGE;
}

export function setCurrentLanguage(lang) {
  if (!DICTIONARY[lang]) return false;
  localStorage.setItem(STORAGE_KEY, lang);
  return true;
}

export function t(path, lang = getCurrentLanguage()) {
  const active = DICTIONARY[lang] || DICTIONARY[DEFAULT_LANGUAGE];
  const fallback = DICTIONARY[DEFAULT_LANGUAGE];

  const read = (obj, keyPath) =>
    keyPath.split(".").reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);

  return read(active, path) ?? read(fallback, path) ?? path;
}

export function applyText(id, key, lang = getCurrentLanguage()) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = t(key, lang);
}

export function applyDocumentLanguage() {
  const lang = getCurrentLanguage();
  document.documentElement.lang = lang;
  return lang;
}