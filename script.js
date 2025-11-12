const API_BASE = "https://ml-for-agile-methodology.onrender.com";

const state = {
  token: null,
  profile: null,
  areas: [],
  projects: [],
  kpis: [],
  suggestions: []
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, inicializando...');
  document.getElementById('year').textContent = new Date().getFullYear();
  const tabs = document.querySelectorAll('.tab');
  console.log('Tabs encontrados:', tabs.length);
  tabs.forEach(t => {
    console.log('Configurando tab:', t.dataset.tab);
    t.addEventListener('click', () => {
      console.log('Click en tab:', t.dataset.tab);
      navigate(t.dataset.tab);
    });
  });
  document.getElementById('loginBtn').addEventListener('click', login);
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  const searchEl = document.getElementById('globalSearch');
  if (searchEl) searchEl.addEventListener('input', onSearch);
  const saved = JSON.parse(localStorage.getItem('session') || 'null');
  if (saved?.token) {
    state.token = saved.token;
    state.profile = saved.profile;
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
  }
  console.log('Navegando a inicio...');
  navigate('inicio');
});

function setActive(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

// --- Project actions: delete / update status / toggle important ---
async function deleteProject(id) {
  if (!state.token) { alert('Debes iniciar sesión para eliminar proyectos'); return; }
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error eliminando proyecto');
    }
    // actualizar estado local
    state.projects = state.projects.filter(p => String(p.id) !== String(id));
    alert('Proyecto eliminado');
  } catch (err) {
    console.error('deleteProject', err);
    alert(err.message || 'Error eliminando proyecto');
  }
}

async function updateProjectStatus(id, status) {
  if (!state.token) { alert('Debes iniciar sesión para actualizar proyectos'); return; }
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo actualizar estado');
    }
    const updated = await res.json();
    state.projects = state.projects.map(p => String(p.id) === String(updated.id) ? updated : p);
    alert('Estado actualizado');
  } catch (err) {
    console.error('updateProjectStatus', err);
    alert(err.message || 'Error actualizando estado');
  }
}

async function toggleProjectImportant(id) {
  if (!state.token) { alert('Debes iniciar sesión'); return; }
  try {
    // Encontrar proyecto localmente
    const p = state.projects.find(x => String(x.id) === String(id));
    if (!p) { alert('Proyecto no encontrado'); return; }
    const newVal = !p.important;
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify({ important: newVal })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo actualizar');
    }
    const updated = await res.json();
    state.projects = state.projects.map(q => String(q.id) === String(updated.id) ? updated : q);
  } catch (err) {
    console.error('toggleProjectImportant', err);
    alert(err.message || 'Error actualizando proyecto');
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (data.token) {
    state.token = data.token;
    state.profile = data.profile;
    localStorage.setItem('session', JSON.stringify({ token: state.token, profile: state.profile }));
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    alert('Sesión iniciada');
    navigate('inicio');
  } else {
    alert('Error de acceso');
  }
}

function logout() {
  state.token = null;
  state.profile = null;
  localStorage.removeItem('session');
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'none';
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.style.display = 'inline-block';
  alert('Sesión cerrada');
  navigate('inicio');
}

async function navigate(tab) {
  console.log('Navegando a:', tab);
  setActive(tab);
  if (tab === 'inicio') return renderInicio();
  if (tab === 'areas') return renderAreas();
  if (tab === 'metodologia') return renderMetodologia();
  if (tab === 'aportaciones') return renderAportaciones();
  if (tab === 'perfil') return renderPerfil();
}

function view(html) {
  document.getElementById('view').innerHTML = html;
}

function badge(status) {
  switch (status) {
    case 'en_revision': return '<span class="pill rev">En revisión</span>';
    case 'iniciando': return '<span class="pill ini">Iniciando</span>';
    case 'en_desarrollo': return '<span class="pill dev">En desarrollo</span>';
    case 'finalizado': return '<span class="pill fin">Finalizado</span>';
    default: return '';
  }
}

// --- Inicio ---
function renderInicio() {
  view(`
  <div class="grid cols-2">
    <section class="card">
      <h3 class="section-title">Propósito</h3>
      <p>Centralizar la transformación cultural de la empresa hacia la agilidad. La plataforma será el principal habilitador de la visibilidad inter-áreas, fomentará la colaboración efectiva y permitirá la mejora continua del trabajo, utilizando análisis de datos y machine learning para maximizar la eficiencia.</p>
      <h3 class="section-title">Justificación</h3>
      <p>La agilidad es esencial para garantizar la entrega temprana de valor y aumentar nuestra capacidad de respuesta. Esta herramienta clave resuelve la desalineación entre áreas al unificar la gestión de la información (proyectos, equipos, sprints y KPIs), lo cual transforma los problemas de comunicación en decisiones informadas y proactivas.</p>
      <h3 class="section-title">Objetivos</h3>
      <ul>
        <li>Claridad operacional: Ofrecer una visión transparente y actualizada del estado de los proyectos y el rendimiento de cada equipo.</li>
        <li>Inteligencia de proyectos: Utilizar machine learning para predecir el comportamiento y pronosticar los KPIs de agilidad, facilitando una gestión anticipada.</li>
        <li>Soporte estratégico: Apoyar la construcción del plan de intervención generando propuestas y ajustes basados en el análisis de datos.</li>
        <li>Fomentar la retroalimentación: Establecer un sistema claro para gestionar sugerencias y aprendizajes, asegurando la revisión continua y la mejora del proceso.</li>
      </ul>
    </section>
    <section class="card">
      <h3 class="section-title">Guía de usuario SCRUM</h3>
      <div style="aspect-ratio:16/9; background:#e6f0fb; border:1px dashed #93c5fd; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#1f4e79;">
        Espacio para video (embed)
      </div>
      <div class="muted" style="margin-top:8px">Espacio para videos de guía</div>
    </section>
  </div>
  `);
}

// --- Áreas ---
async function renderAreas() {
  console.log('Iniciando renderAreas...');
  
  // Mostrar estado de carga
  view(`
    <div class="card">
      <h3 class="section-title">Cargando áreas...</h3>
      <p class="muted">Conectando con el servidor...</p>
    </div>
  `);
  
  try {
    console.log('Haciendo fetch a /api/areas y /api/projects...');
    const [areasRes, projectsRes] = await Promise.all([
      fetch(`${API_BASE}/areas`),
      fetch(`${API_BASE}/projects`)
    ]);
    
    console.log('Respuestas recibidas:', areasRes.status, projectsRes.status);
    
    if (!areasRes.ok) {
      throw new Error(`Error cargando áreas: ${areasRes.status}`);
    }
    if (!projectsRes.ok) {
      throw new Error(`Error cargando proyectos: ${projectsRes.status}`);
    }
    
    const [areas, projects] = await Promise.all([areasRes.json(), projectsRes.json()]);
    console.log('Datos parseados:', { areas: areas.length, projects: projects.length });
    
    state.areas = areas;
    state.projects = projects;
    
    // Generar HTML
    const options = areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    
    view(`
      <div class="card">
        <div class="row">
          <div>
            <label>Área</label>
            <select id="areaSelect">${options}</select>
          </div>
          <div style="align-self:flex-end">
            ${state.profile && ['lider_equipo','lider_area','scrum_master','admin'].includes(state.profile.role) ? '<button class="btn" id="btnNuevoProyecto">Nuevo proyecto</button>' : ''}
          </div>
        </div>
      </div>
      <div id="areaContent" class="grid cols-2" style="margin-top:16px">
        <section class="card">
          <h3 class="section-title">Información pública</h3>
          <p class="muted">Descripción de la metodología del área y estado general de actividades.</p>
          <div id="publicList"></div>
        </section>
        <section class="card">
          <h3 class="section-title">Información privada</h3>
          ${state.profile ? '<div id="privateList"></div>' : '<p class="muted">Inicia sesión para ver contenido de tu área.</p>'}
        </section>
      </div>
    `);
    
    // Configurar event listeners
    const sel = document.getElementById('areaSelect');
    if (sel) {
      sel.addEventListener('change', refreshArea);
      refreshArea(); // Llamar inicialmente
    }
    
    if (document.getElementById('btnNuevoProyecto')) {
      document.getElementById('btnNuevoProyecto').addEventListener('click', showNuevoProyecto);
    }
    
    function refreshArea() {
      const areaId = sel.value;
      // filtrar usando el estado global (state.projects) para mantener consistencia tras operaciones
      const filteredProjects = state.projects.filter(p => !areaId || String(p.areaId) === String(areaId));

      const role = state.profile?.role;
      const canManage = state.profile && ['lider_equipo','lider_area','scrum_master','admin'].includes(role);

      const projectsHtml = filteredProjects.map(p => {
        const imp = p.important ? '⭐' : '';
        return `
          <div class="card project-item" data-id="${p.id}">
            <div class="row" style="justify-content:space-between;align-items:center">
              <div>
                <strong>${p.name} ${imp}</strong>
                <div class="muted">${badge(p.status)} • ${p.startDate || ''} → ${p.endDate || ''}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                ${canManage ? `<button class="btn proj-finish" data-id="${p.id}">Finalizar</button>` : ''}
                ${canManage ? `<button class="btn proj-delete" data-id="${p.id}">Eliminar</button>` : ''}
                ${state.token ? `<button class="btn proj-important" data-id="${p.id}">${p.important ? 'Quitar importante' : 'Marcar importante'}</button>` : ''}
              </div>
            </div>
            <div class="muted" style="margin-top:8px">${p.objectives || ''}</div>
          </div>`;
      }).join('') || '<div class="muted">Sin proyectos</div>';

      document.getElementById('publicList').innerHTML = `
        <div style="margin-bottom:8px">${projectsHtml}</div>
        <details><summary>Metodología del área</summary><div class="muted">Marco Scrum con adaptaciones específicas del área.</div></details>
        <details><summary>Estado general de actividades</summary><div class="muted">En revisión, iniciando, en desarrollo, finalizado.</div></details>
      `;

      if (state.profile && (String(state.profile.areaId) === String(areaId) || ['admin','scrum_master','lider_area','lider_equipo'].includes(state.profile.role))) {
        document.getElementById('privateList').innerHTML = `
          <details open><summary>Roles por equipo</summary><div class="muted">Listado de roles por equipo (demo).</div></details>
          <details><summary>Calendarización</summary><div class="muted">Calendario del área (demo).</div></details>
          <details><summary>Responsables y contacto</summary><div class="muted">Responsables de actividades con email/teléfono (demo).</div></details>
          <details><summary>Plan de acción</summary><div class="muted">Plan detallado (demo).</div></details>
          <details><summary>Estado por equipo</summary><div class="muted">En revisión, iniciando, en desarrollo, finalizado.</div></details>
        `;
      } else if (state.profile) {
        document.getElementById('privateList').innerHTML = '<div class="muted">No tienes acceso privado a esta área.</div>';
      }
    }

    // Delegación de eventos para acciones sobre proyectos dentro de la sección
    const areaContentEl = document.getElementById('areaContent');
    if (areaContentEl) {
      areaContentEl.addEventListener('click', async (ev) => {
        const del = ev.target.closest('.proj-delete');
        const fin = ev.target.closest('.proj-finish');
        const imp = ev.target.closest('.proj-important');
        if (del) {
          const id = del.dataset.id;
          if (!confirm('¿Eliminar proyecto? Esta acción es irreversible.')) return;
          await deleteProject(id);
          refreshArea();
        } else if (fin) {
          const id = fin.dataset.id;
          if (!confirm('¿Marcar proyecto como finalizado?')) return;
          await updateProjectStatus(id, 'finalizado');
          refreshArea();
        } else if (imp) {
          const id = imp.dataset.id;
          await toggleProjectImportant(id);
          refreshArea();
        }
      });
    }
    
  } catch (error) {
    console.error('Error en renderAreas:', error);
    view(`
      <div class="card">
        <h3 class="section-title">Error cargando áreas</h3>
        <p class="muted">Error: ${error.message}</p>
        <p class="muted">Verifica que el servidor esté ejecutándose en http://localhost:5000</p>
        <button class="btn" onclick="renderAreas()">Reintentar</button>
      </div>
    `);
  }
}

function showNuevoProyecto() {
  const container = document.createElement('div');
  container.className = 'card';
  container.innerHTML = `
    <h3 class="section-title">Nuevo proyecto</h3>
    <div class="row">
      <div><label>Nombre</label><input class="input" id="pName" /></div>
      <div><label>Área</label><select id="pArea">${state.areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
    </div>
    <div class="row">
      <div><label>Inicio</label><input class="input" id="pStart" type="date" /></div>
      <div><label>Fin</label><input class="input" id="pEnd" type="date" /></div>
    </div>
    <div><label>Objetivos</label><textarea id="pObj"></textarea></div>
    <div class="row">
      <div><label>Responsables (coma)</label><input class="input" id="pOwners" /></div>
      <div><label>Recursos</label><input class="input" id="pResources" /></div>
    </div>
    <div style="margin-top:12px"><button class="btn" id="pSave">Guardar</button></div>
  `;
  document.getElementById('view').prepend(container);
  document.getElementById('pSave').addEventListener('click', async () => {
    const body = {
      name: document.getElementById('pName').value,
      areaId: document.getElementById('pArea').value,
      startDate: document.getElementById('pStart').value,
      endDate: document.getElementById('pEnd').value,
      objectives: document.getElementById('pObj').value,
      owners: document.getElementById('pOwners').value.split(',').map(s => s.trim()),
      resources: document.getElementById('pResources').value,
      status: 'en_revision'
    };
    const res = await fetch(`${API_BASE}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      alert('Proyecto creado');
      renderAreas();
    } else {
      const err = await res.json();
      alert(err.error || 'Error');
    }
  });
}

// --- Metodología ---
function renderMetodologia() {
  view(`
  <section class="card">
    <h2 style="margin:0 0 12px 0; font-size:28px; color:var(--blue-800)">Metodología propuesta</h2>
    <h2 style="margin:0; font-size:24px; color:var(--blue-700)">Consideraciones y ramas de implementación</h2>
  </section>
  <section class="card" style="margin-top:12px">
    <h3 class="section-title">Integración con modelo SQL (machine.py)</h3>
    <div class="row">
      <button class="btn" id="btnLoadSprints">Cargar sprints (SQL)</button>
      <button class="btn" id="btnLoadPreds">Ver predicciones</button>
    </div>
    <div class="grid cols-2" style="margin-top:12px">
      <div>
        <h4>Sprints</h4>
        <div id="sqlSprints" class="muted">(sin datos)</div>
      </div>
      <div>
        <h4>Predicciones</h4>
        <div id="sqlPreds" class="muted">(sin datos)</div>
      </div>
    </div>
    <h4 style="margin-top:12px">Nueva predicción</h4>
    <div class="grid cols-2">
      <div class="row">
        <div><label>Sprint ID</label><input class="input" id="spId" type="number" /></div>
        <div><label>Tareas completadas</label><input class="input" id="spComp" type="number" /></div>
      </div>
      <div class="row">
        <div><label>Tareas pendientes</label><input class="input" id="spPend" type="number" /></div>
        <div><label>Problemas reportados</label><input class="input" id="spProb" type="number" /></div>
      </div>
      <div class="row">
        <div><label>Evaluación Likert</label><input class="input" id="spLikert" type="number" min="1" max="5" /></div>
        <div style="align-self:flex-end"><button class="btn" id="btnPredictSql">Predecir</button></div>
      </div>
    </div>
    <div id="sqlPredictResult" class="muted" style="margin-top:8px"></div>
  </section>
  `);

  document.getElementById('btnLoadSprints').addEventListener('click', loadSqlSprints);
  document.getElementById('btnLoadPreds').addEventListener('click', loadSqlPreds);
  document.getElementById('btnPredictSql').addEventListener('click', doSqlPredict);
}

async function loadSqlSprints() {
  const res = await fetch(`${API_BASE}/sql/sprints`);
  const rows = await res.json();
  if (!Array.isArray(rows)) {
    document.getElementById('sqlSprints').innerHTML = `<div class="muted">${rows.error || 'Error'}</div>`;
    return;
  }
  const html = rows.slice(0, 50).map(r => `
    <div class="card" style="margin-bottom:6px">
      <div><strong>ID ${r.id}</strong></div>
      <div class="muted">Comp: ${r.tareas_completadas} • Pend: ${r.tareas_pendientes} • Prob: ${r.problemas_reportados} • Likert: ${r.evaluacion_likert} • Estado: ${r.estado}</div>
    </div>
  `).join('') || '<div class="muted">Sin sprints</div>';
  document.getElementById('sqlSprints').innerHTML = html;
}

async function loadSqlPreds() {
  const res = await fetch(`${API_BASE}/sql/predicciones`);
  const rows = await res.json();
  if (!Array.isArray(rows)) {
    document.getElementById('sqlPreds').innerHTML = `<div class="muted">${rows.error || 'Error'}</div>`;
    return;
  }
  const html = rows.map(r => `
    <div class="card" style="margin-bottom:6px">
      <div><strong>Sprint ${r.sprint_id}</strong></div>
      <div class="muted">Retraso: ${(Number(r.probabilidad_retraso) * 100).toFixed(2)}% • ${r.recomendacion}</div>
    </div>
  `).join('') || '<div class="muted">Sin predicciones</div>';
  document.getElementById('sqlPreds').innerHTML = html;
}

async function doSqlPredict() {
  const body = {
    sprint_id: Number(document.getElementById('spId').value),
    tareas_completadas: Number(document.getElementById('spComp').value),
    tareas_pendientes: Number(document.getElementById('spPend').value),
    problemas_reportados: Number(document.getElementById('spProb').value),
    evaluacion_likert: Number(document.getElementById('spLikert').value)
  };
  const res = await fetch(`${API_BASE}/sql/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    document.getElementById('sqlPredictResult').innerHTML = `Probabilidad de retraso: ${(Number(data.probabilidad_retraso) * 100).toFixed(2)}% • ${data.recomendacion}`;
    loadSqlPreds();
  } else {
    document.getElementById('sqlPredictResult').innerHTML = data.error || 'Error';
  }
}

// --- Search helpers ---
let searchText = '';
function onSearch(e) {
  searchText = (e?.target?.value || '').toLowerCase();
  const active = document.querySelector('.tab.active')?.dataset.tab;
  if (active === 'areas') renderAreas();
}
function matchSearch(text) {
  if (!searchText) return true;
  return String(text || '').toLowerCase().includes(searchText);
}

// --- Aportaciones ---
async function renderAportaciones() {
  if (!state.token) {
    return view('<div class="card"><p>Inicia sesión para enviar aportaciones y autoevaluaciones.</p></div>');
  }
  const res = await fetch(`${API_BASE}/suggestions`);
  state.suggestions = await res.json();

  const isAdminLike = state.profile && ['admin','scrum_master','lider_area','lider_equipo'].includes(state.profile.role);

  view(`
  <div class="grid cols-2">
    <section class="card">
      <h3 class="section-title">Dudas y sugerencias</h3>
      <div class="row">
        <div><label>Título</label><input class="input" id="sTitle" /></div>
        <div>
          <label>Tipo</label>
          <select id="sType">
            <option value="duda">Duda</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="autoevaluacion">Autoevaluación</option>
          </select>
        </div>
      </div>
      <div><label>Contenido</label><textarea id="sContent"></textarea></div>
      <div style="margin-top:12px"><button class="btn" id="sSend">Enviar</button></div>
    </section>
    <section class="card">
      <h3 class="section-title">Historial</h3>
      <div id="sList"></div>
    </section>
  </div>
  `);

  document.getElementById('sSend').addEventListener('click', async () => {
    const body = {
      title: document.getElementById('sTitle').value,
      type: document.getElementById('sType').value,
      content: document.getElementById('sContent').value
    };
    const res = await fetch(`${API_BASE}/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      alert('Enviado');
      renderAportaciones();
    } else {
      const err = await res.json();
      alert(err.error || 'Error');
    }
  });

  // Renderizar historial con controles para administradores
  const listHtml = state.suggestions.map(s => {
    const adminControls = isAdminLike ? `
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="btn s-respond" data-id="${s.id}">Responder</button>
        <button class="btn s-accept" data-id="${s.id}">Aceptar</button>
        <button class="btn s-reject" data-id="${s.id}">Rechazar</button>
        <button class="btn s-edit" data-id="${s.id}">Editar</button>
      </div>
    ` : '';

    return `
      <div class="card s-item" data-id="${s.id}" style="margin-bottom:8px">
        <div class="row"><strong>${s.title || '(sin título)'}</strong><span class="muted">${s.type}</span></div>
        <div class="muted">${s.content}</div>
        <div class="muted">Estado: ${s.status || 'pendiente'}</div>
        ${s.response ? `<div style="margin-top:6px"><strong>Respuesta:</strong> <div class="muted">${s.response}</div></div>` : ''}
        ${adminControls}
      </div>
    `;
  }).join('');

  document.getElementById('sList').innerHTML = listHtml || '<div class="muted">Sin aportaciones</div>';

  // Delegación de eventos para acciones administrativas sobre sugerencias
  const sListEl = document.getElementById('sList');
  if (sListEl) {
    sListEl.addEventListener('click', async (ev) => {
      const respondBtn = ev.target.closest('.s-respond');
      const acceptBtn = ev.target.closest('.s-accept');
      const rejectBtn = ev.target.closest('.s-reject');
      const editBtn = ev.target.closest('.s-edit');

      if (respondBtn) {
        const id = respondBtn.dataset.id;
        const txt = prompt('Escribe la respuesta:');
        if (!txt) return;
        await updateSuggestion(id, { response: txt, status: 'respondido' });
        renderAportaciones();
      } else if (acceptBtn) {
        const id = acceptBtn.dataset.id;
        if (!confirm('¿Aceptar esta sugerencia?')) return;
        await updateSuggestion(id, { status: 'aceptada' });
        renderAportaciones();
      } else if (rejectBtn) {
        const id = rejectBtn.dataset.id;
        const reason = prompt('Motivo de rechazo (opcional):');
        await updateSuggestion(id, { status: 'rechazada', response: reason || '' });
        renderAportaciones();
      } else if (editBtn) {
        const id = editBtn.dataset.id;
        const item = state.suggestions.find(x => String(x.id) === String(id));
        if (!item) return;
        const newTitle = prompt('Editar título', item.title || '');
        const newContent = prompt('Editar contenido', item.content || '');
        if (newTitle == null || newContent == null) return;
        await updateSuggestion(id, { title: newTitle, content: newContent });
        renderAportaciones();
      }
    });
  }
}

// Helper to update a suggestion (admin actions)
async function updateSuggestion(id, data) {
  if (!state.token) { alert('Debes iniciar sesión'); return; }
  try {
    const res = await fetch(`${API_BASE}/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error actualizando sugerencia');
    }
    const updated = await res.json();
    state.suggestions = state.suggestions.map(s => String(s.id) === String(updated.id) ? updated : s);
    alert('Sugerencia actualizada');
  } catch (err) {
    console.error('updateSuggestion', err);
    alert(err.message || 'Error');
  }
}

// --- Perfil ---
async function renderPerfil() {
  if (!state.token) {
    return view('<div class="card"><p>Inicia sesión para ver tu perfil.</p></div>');
  }
  const res = await fetch(`${API_BASE}/profiles/me`, { headers: { 'Authorization': `Bearer ${state.token}` } });
  const me = await res.json();
  state.profile = me;
  const subsections = `
    <details open>
      <summary>Mis actividades</summary>
      <div class="muted">Aún sin actividades registradas.</div>
    </details>
    <details>
      <summary>Calendario</summary>
      <div class="muted">Aún sin calendarización.</div>
    </details>
    <details>
      <summary>Equipo de trabajo</summary>
      <div class="muted">Aún sin integrantes asignados.</div>
    </details>
  `;
  view(`
  <div class="grid cols-2">
    <section class="card">
      <div class="row">
        <img src="${me.photoUrl || 'https://via.placeholder.com/96'}" alt="foto" style="width:96px;height:96px;border-radius:12px;object-fit:cover" />
        <div>
          <h3 style="margin:0">${me.name}</h3>
          <div class="muted">${me.position} • ${me.seniorityYears} años</div>
          <div class="muted">Área: ${me.areaId} • Rol: ${me.role}</div>
          <div class="muted">Contacto: ${me.email || ''}</div>
          <small class="muted">Para modificar, contactar a RH.</small>
        </div>
      </div>
    </section>
    <section class="card">
      <h3 class="section-title">Secciones</h3>
      ${subsections}
    </section>
  </div>
  `);
}
