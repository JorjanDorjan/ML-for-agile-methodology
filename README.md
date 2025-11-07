# Plataforma Ágil Empresarial

Aplicación web para impulsar el cambio cultural y consolidar la metodología ágil en la empresa. Incluye backend Flask con almacenamiento JSON, SPA sin build y endpoints de ML para predicción de KPIs.

## Requisitos
- Python 3.10+
- Navegador moderno (Chrome/Edge/Firefox)
- MySQL (local) con base de datos `agileboard`

## Instalación (Windows PowerShell)
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Ejecución
```bash
# Backend (API)
python ML.py   # http://localhost:5000

# Frontend
# Abrir index.html con doble clic o usando Live Server
```

### Integración con machine.py (SQL)
- `machine.py` entrena y guarda un modelo `modelo_retrasos.pkl` usando datos MySQL (`agileboard`). No modifiques ese archivo.
- La API expone endpoints para consultar sprints/predicciones y ejecutar nuevas predicciones usando ese modelo:
  - GET `/api/sql/sprints` → lista sprints desde MySQL
  - GET `/api/sql/predicciones` → lista predicciones guardadas
  - POST `/api/sql/predict` con JSON:
    ```json
    {"sprint_id":1, "tareas_completadas":30, "tareas_pendientes":12, "problemas_reportados":3, "evaluacion_likert":5}
    ```
    Reentrena un `StandardScaler` con los sprints actuales (como en `machine.py`), predice con `modelo_retrasos.pkl` y persiste en `predicciones`.

#### MySQL esperado
Tablas mínimas:
- `sprints(id, tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert, estado)`
- `predicciones(id AUTO, sprint_id, probabilidad_retraso DOUBLE, recomendacion VARCHAR(...))`

## Uso rápido
1. Inicia sesión en la cabecera con tu correo y rol (Empleado, Líder, Scrum Master, Admin).
2. Pestañas:
   - Inicio: propósito, justificación, objetivos y guía de usuario SCRUM.
   - Áreas: menú por área; ver proyectos (público) y, según rol, contenido privado.
   - Metodología: descripción general y consideraciones de implementación.
   - Aportaciones: dudas, sugerencias y autoevaluaciones (flujo de revisión).
   - Perfil: datos del usuario y subsecciones (actividades, calendario, equipo).
3. Crear proyectos en Áreas requiere rol de liderazgo/Scrum/Admin.

## Endpoints principales
- GET `/api/health`
- POST `/api/login` { email, role }
- GET `/api/profiles/me` (Bearer token)
- GET `/api/areas`
- GET/POST/PUT/DELETE `/api/projects`
- GET/POST `/api/suggestions`, PUT `/api/suggestions/:id/status`
- GET/POST `/api/kpis`
- POST `/api/ml/train`, POST `/api/ml/predict`

## ML (opcional)
- Entrenar: `POST /api/ml/train` con `{ "features": ["value"], "target": "value" }` usando datos de `/api/kpis`.
- Predecir: `POST /api/ml/predict` con las mismas keys de `features`.

## Seguridad (demo)
Autenticación básica con token de perfil. Para producción: SSO/OIDC, autorización por rol/área, cifrado, auditoría.

## Estructura de datos (resumen)
- projects: nombre, objetivos, fechas, responsables, recursos, estado, área.
- areas: catálogo de áreas.
- suggestions: dudas/sugerencias/autoevaluaciones con flujo de aprobación.
- kpis: métricas por sprint/fecha.
- profiles: datos del usuario (modificables solo por RH).

## Licencia
© Derechos reservados. Uso interno.

