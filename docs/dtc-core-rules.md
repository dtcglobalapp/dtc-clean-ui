# DTC CORE RULES
Control Total Multilingüe Platform

---

## 🌍 VISIÓN
DTC no es solo una app de daycare.  
Es una plataforma modular global capaz de adaptarse a múltiples industrias:

- DTC Daycare
- DTC Streaming (Radio/TV)
- DTC Barbería
- Otros negocios futuros

Todo debe construirse con esta expansión en mente.

---

## 🧱 1. ARQUITECTURA GENERAL

- Todo módulo debe ser modular:
  - state
  - dom
  - controller
  - api
  - events
  - render
- Nunca mezclar lógica de negocio con UI directamente
- Evitar archivos gigantes sin estructura interna clara
- Cada módulo debe poder vivir por sí solo

---

## 🗂️ 2. ESTRUCTURA DE CARPETAS

- `/children/` → UI
- `/guardians/` → UI
- `/src/children/` → lógica
- `/src/guardians/` → lógica
- `/core/` → utilidades globales
- `/docs/` → reglas y arquitectura

Regla:
👉 UI y lógica SIEMPRE separadas

---

## 🔗 3. RUTAS

- Siempre usar rutas reales (no rutas viejas)
- Evitar archivos puente innecesarios
- Nunca duplicar páginas en raíz
- Toda navegación debe ser consistente

Ejemplo correcto:


---

## 🧠 4. BASE DE DATOS (CRÍTICO)

- Toda query debe incluir:
  - `organization_id`
- Nunca mezclar datos entre negocios
- Siempre usar filtros
- Evitar traer listas completas sin paginación

---

## ⚡ 5. PERFORMANCE

- No cargar listas grandes sin límite
- Usar paginación o búsqueda
- Evitar renderizar cientos de elementos a la vez
- Minimizar llamadas innecesarias a Supabase

---

## 🖼️ 6. IMÁGENES

- Siempre usar:
  - recorte automático (square)
  - compresión
- No subir imágenes pesadas sin procesar
- Tamaño estándar recomendado: 600px

---

## 📱 7. UI / UX

- Mobile-first SIEMPRE
- Interfaz simple, clara y rápida
- Evitar sobrecargar pantallas
- Mostrar solo lo necesario

---

## 🔐 8. SEGURIDAD

- Separación estricta por organización
- Validar datos antes de guardar
- Nunca confiar en inputs directos

---

## 🔄 9. FLUJOS

Cada acción debe:

1. Guardar correctamente
2. Refrescar UI
3. Mostrar resultado inmediato

Nunca dejar al usuario sin feedback

---

## 🧩 10. ESCALABILIDAD

- Cada módulo debe ser independiente
- Preparado para miles de usuarios
- Preparado para múltiples industrias
- Evitar dependencias cruzadas

---

## 🚫 11. LO QUE NO SE PERMITE

- Código duplicado
- Rutas rotas
- Archivos huérfanos
- Mezcla de lógica y UI
- Consultas sin filtro

---

## 🧭 REGLA MAESTRA

Si algo rompe escalabilidad, claridad o separación:
👉 NO se implementa

---

## 🔥 FRASE CLAVE DTC

“Construimos para miles desde el principio, no para arreglar después.”

Módulo: Kiosko Inteligente DTC

- Reconoce rostro
- Decide rol automáticamente
- Envía a la persona al flujo correcto
- Si no reconoce el rostro, muestra demo/lobby comercial
- Incluye superusuario global Felencho
- Incluye operador de prueba Bob
- Sirve para daycare y futuros negocios
- Registra toda acción importante
- Respeta organización, permisos y seguridad
- Debe crecer por fases: demo, conexión real, biometría avanzada

DTC Kiosko debe implementar autenticación múltiple:

1. Reconocimiento facial (principal)
2. Código PIN (fallback obligatorio)
3. Dispositivo móvil (nivel avanzado)
4. Combinación de métodos para seguridad

Ningún usuario debe quedar bloqueado si falla el rostro.
El sistema siempre debe ofrecer una segunda vía de acceso segura.

Biometría en DTC

1. No se registra rostro sin identidad previa
2. El rostro pertenece a un user_id
3. El kiosko no crea identidades (fase inicial)
4. El kiosko solo reconoce y enruta
5. Registro biométrico ocurre en perfil del usuario
6. Rostro no reconocido → lobby/demo

En esta etapa de desarrollo, DTC usará un solo archivo de estilos global: dtc.css.

No se permiten CSS separados por módulo mientras el sistema siga en construcción activa.
La prioridad es consistencia visual, velocidad de desarrollo y evitar conflictos entre estilos.

DTC tiene UN SOLO CSS: dtc.css

Ningún módulo puede tener estilos propios fuera del sistema global.

/* DTC CONSOLIDATED MODULE STYLES */ no se escribe nada nuevo. Ese bloque queda congelado como zona vieja. La base viva del sistema es la parte de arriba.

### Food Allergy and Special Meal Alerts
DTC must treat food allergies, dietary restrictions, and medically required meal notes as active safety rules, not passive notes.

If a child profile contains allergy or special food information, the system must generate meal-time alerts for active staff, owners, and administrators during breakfast, lunch, and snack periods.

Alerts should display the child’s name, photo, restriction, and recommended action. This logic must connect to the future food/menu module.

### Intelligent Meal Allergy Alerts
DTC must not send food alerts on a fixed schedule by default.
Instead, it must compare the actual ingredients of the daily menu against each child’s food allergies, dietary restrictions, and medical meal notes.

If the system detects a conflict between a menu item and a child’s restriction, it must send a targeted alert to active assistants, owners, and administrators using DTC.

This alert should identify the child, the risky ingredient, the affected meal, and the recommended safe action.

🧠 LO IMPORTANTE (esto es clave)

A partir de ahora trabajamos así:

👉 Tú:

defines comportamiento
defines visión
defines lógica del negocio

👉 Yo:

te doy archivos completos
listos para reemplazar
sin que tengas que buscar nada

Meal scheduling in DTC must be organization-configurable.
The platform must support daycare businesses with different meal structures, including daytime, nighttime, and mixed schedules.
DTC may follow KidKare-inspired food compliance logic, but must not be limited to a fixed set of meal types.
Each organization must be able to define its own active meal slots such as Breakfast, AM Snack, Lunch, PM Snack, Dinner, or Evening Snack.