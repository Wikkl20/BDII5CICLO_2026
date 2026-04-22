// ============================================
// APP - CARGAR TRABAJOS DINÁMICAMENTE
// ============================================

function getSupabase() {
  return window.SB || window.supabase;
}

// ---- ESTADO GLOBAL DEL USUARIO ----
let _cachedUser = null;

async function getCurrentUserCached() {
  if (_cachedUser) return _cachedUser;
  _cachedUser = await getCurrentUser();
  return _cachedUser;
}

// ============================================
// TAB: MIS TRABAJOS
// Muestra trabajos del admin con botones Ver / Editar / Eliminar
// ============================================
async function loadMyJobs() {
  const supabase = getSupabase();
  const container = document.getElementById('my-jobs-list');
  if (!container || !supabase) {
    if (container) container.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
    return;
  }

  const user = await getCurrentUserCached();
  if (!user) {
    container.innerHTML = '<div class="text-center text-muted">Inicia sesión para ver tus trabajos</div>';
    return;
  }

  const { data, error } = await supabase
    .from('trabajos')
    .select('*')
    .eq('user_id', user.id)
    .order('unidad', { ascending: true })
    .order('semana', { ascending: true });

  if (error) {
    container.innerHTML = '<div class="alert alert-error">Error al cargar trabajos</div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No tienes trabajos subidos aún</div>';
    return;
  }

  container.innerHTML = data.map(job => `
    <div class="job-item" id="job-row-${job.id}">
      <div class="job-info">
        <span class="job-title">${job.titulo || 'Sin título'}</span>
        <span class="job-meta">Unidad ${job.unidad} · Semana ${job.semana} · ${formatDate(job.created_at)}</span>
      </div>
      <div class="job-actions">
        <a href="${job.archivo_url || job.enlace_url || '#'}" target="_blank"
           class="btn btn-outline btn-icon" title="Ver trabajo">↗</a>
        <button onclick="openEditModal('${job.id}','${escStr(job.titulo)}',${job.unidad},${job.semana},'${escStr(job.archivo_url||'')}','${escStr(job.enlace_url||'')}','${job.tipo||'archivo'}')"
                class="btn-icon btn-icon-edit" title="Editar">✎</button>
        <button onclick="deleteJob('${job.id}')"
                class="btn-icon btn-icon-danger" title="Eliminar">✕</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// TAB: VER PORTAFOLIO
// Muestra todos los trabajos agrupados por unidad
// El admin ve además el botón Editar en cada actividad
// ============================================
async function loadAllJobs() {
  const supabase = getSupabase();
  const container = document.getElementById('all-jobs-list');
  if (!container || !supabase) {
    if (container) container.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
    return;
  }

  // Determinar si el usuario actual es admin
  const user = await getCurrentUserCached();
  const esAdmin = user?.rol === 'admin';

  const { data, error } = await supabase
    .from('trabajos')
    .select('*')
    .order('unidad', { ascending: true })
    .order('semana', { ascending: true });

  if (error) {
    container.innerHTML = '<div class="alert alert-error">Error al cargar trabajos</div>';
    return;
  }

  const units = {};
  (data || []).forEach(job => {
    if (!units[job.unidad]) units[job.unidad] = [];
    units[job.unidad].push(job);
  });

  const unitNames  = { 1: 'Fundamentos', 2: 'Modelo E-R', 3: 'SQL', 4: 'Admin' };
  const unitRanges = { 1: 'Semanas 1–4', 2: 'Semanas 5–8', 3: 'Semanas 9–12', 4: 'Semanas 13–16' };

  if (Object.keys(units).length === 0) {
    container.innerHTML = '<div class="empty-state">No hay trabajos disponibles aún</div>';
    return;
  }

  let html = '';
  for (const [unidad, jobs] of Object.entries(units)) {
    html += `
      <div class="unit-section">
        <div class="unit-header">
          <div class="unit-icon-large">${unidad}</div>
          <div class="unit-info">
            <h3>Unidad ${unidad} – ${unitNames[unidad]}</h3>
            <p class="text-sm text-muted">${unitRanges[unidad]}</p>
          </div>
        </div>
        <div class="unit-jobs">
          ${jobs.map(job => `
            <div class="unit-job">
              <span class="unit-job-title">S${job.semana}: ${job.titulo || 'Sin título'}</span>
              <div class="unit-job-actions">
                <a href="${job.archivo_url || job.enlace_url || '#'}"
                   target="_blank" class="unit-job-link">Ver →</a>
                ${esAdmin ? `
                  <button onclick="openEditModal('${job.id}','${escStr(job.titulo)}',${job.unidad},${job.semana},'${escStr(job.archivo_url||'')}','${escStr(job.enlace_url||'')}','${job.tipo||'archivo'}')"
                          class="unit-job-edit" title="Editar">✎ Editar</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ============================================
// MODAL DE EDICIÓN
// Se abre tanto desde "Mis Trabajos" como desde "Ver Portafolio"
// y también desde unidad.html cuando el admin está logueado
// ============================================
function openEditModal(id, titulo, unidad, semana, archivoUrl, enlaceUrl, tipo) {
  // Si el modal no existe en este HTML, crearlo dinámicamente
  if (!document.getElementById('edit-modal-overlay')) {
    buildEditModalDOM();
  }

  // Poblar el formulario con los datos del trabajo
  document.getElementById('edit-job-id').value     = id;
  document.getElementById('edit-titulo').value     = titulo;
  document.getElementById('edit-unidad').value     = unidad;
  updateEditWeekOptions(unidad, semana);
  document.getElementById('edit-tipo-' + tipo).checked = true;

  document.getElementById('edit-archivo-actual').textContent =
    archivoUrl ? '📄 ' + (archivoUrl.split('/').pop() || 'archivo actual') : 'Sin archivo';
  document.getElementById('edit-enlace').value = enlaceUrl || '';

  toggleEditSections(tipo);
  document.getElementById('edit-modal-overlay').classList.remove('hidden');
}

function buildEditModalDOM() {
  const overlay = document.createElement('div');
  overlay.id = 'edit-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeEditModal(); };

  overlay.innerHTML = `
    <div class="modal-content" style="max-width:520px">
      <div class="modal-header">
        <h3>Editar Trabajo</h3>
        <button class="modal-close" onclick="closeEditModal()">×</button>
      </div>
      <div class="modal-body">
        <form id="edit-form">
          <input type="hidden" id="edit-job-id">

          <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" id="edit-titulo" class="form-input"
                   placeholder="Nombre del trabajo" required>
          </div>

          <div class="form-group">
            <label class="form-label">Unidad</label>
            <select id="edit-unidad" class="form-select" required
                    onchange="updateEditWeekOptions(this.value, null)">
              <option value="1">Unidad 1 – Fundamentos (Sem 1–4)</option>
              <option value="2">Unidad 2 – Modelo E-R (Sem 5–8)</option>
              <option value="3">Unidad 3 – SQL (Sem 9–12)</option>
              <option value="4">Unidad 4 – Admin (Sem 13–16)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Semana</label>
            <select id="edit-semana" class="form-select" required></select>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de entrega</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2">
                <input type="radio" name="edit-tipo" id="edit-tipo-archivo"
                       value="archivo" onchange="toggleEditSections('archivo')">
                <span>Archivo</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="radio" name="edit-tipo" id="edit-tipo-enlace"
                       value="enlace" onchange="toggleEditSections('enlace')">
                <span>Enlace</span>
              </label>
            </div>
          </div>

          <!-- Sección archivo -->
          <div id="edit-file-section" class="form-group">
            <label class="form-label">Archivo actual</label>
            <p id="edit-archivo-actual" class="text-sm text-muted" style="margin-bottom:.5rem"></p>
            <label class="form-label">Reemplazar archivo (opcional)</label>
            <div class="upload-dropzone" onclick="document.getElementById('edit-archivo').click()">
              <input type="file" id="edit-archivo" class="hidden"
                     accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                     onchange="handleEditFileSelect(this)">
              <p class="upload-text">Haz clic para cambiar archivo</p>
              <p class="upload-subtext">PDF, Word, Excel, PowerPoint, ZIP (max 10MB)</p>
            </div>
            <div id="edit-file-preview" class="hidden mt-4"></div>
          </div>

          <!-- Sección enlace -->
          <div id="edit-link-section" class="form-group hidden">
            <label class="form-label">URL del enlace</label>
            <input type="url" id="edit-enlace" class="form-input" placeholder="https://...">
          </div>

          <div id="edit-error"   class="alert alert-error   hidden"></div>
          <div id="edit-success" class="alert alert-success hidden"></div>

          <div class="flex gap-2" style="margin-top:1rem">
            <button type="button" onclick="closeEditModal()"
                    class="btn btn-outline" style="flex:1">Cancelar</button>
            <button type="submit" id="edit-submit-btn"
                    class="btn btn-primary" style="flex:2">
              <span>Guardar cambios</span>
              <div class="spinner hidden"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Listener del formulario de edición
  document.getElementById('edit-form').addEventListener('submit', submitEditJob);
}

function closeEditModal() {
  const overlay = document.getElementById('edit-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function toggleEditSections(tipo) {
  const fileSection = document.getElementById('edit-file-section');
  const linkSection = document.getElementById('edit-link-section');
  if (!fileSection || !linkSection) return;
  fileSection.classList.toggle('hidden', tipo !== 'archivo');
  linkSection.classList.toggle('hidden', tipo !== 'enlace');
}

function updateEditWeekOptions(unidad, semanaActual) {
  const select = document.getElementById('edit-semana');
  if (!select) return;

  const ranges = { 1: [1,4], 2: [5,8], 3: [9,12], 4: [13,16] };
  const [start, end] = ranges[parseInt(unidad)] || [1,4];

  select.innerHTML = '';
  for (let i = start; i <= end; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Semana ${i}`;
    if (semanaActual && parseInt(semanaActual) === i) opt.selected = true;
    select.appendChild(opt);
  }
}

let editSelectedFile = null;

function handleEditFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  editSelectedFile = file;
  const preview = document.getElementById('edit-file-preview');
  preview.innerHTML = `
    <div class="flex items-center justify-between p-3"
         style="background:var(--secondary);border-radius:.5rem">
      <span class="text-sm">${file.name}</span>
      <button type="button" onclick="editSelectedFile=null;this.parentElement.parentElement.classList.add('hidden')"
              class="btn-icon btn-icon-danger">✕</button>
    </div>
  `;
  preview.classList.remove('hidden');
}

async function submitEditJob(e) {
  e.preventDefault();

  const id       = document.getElementById('edit-job-id').value;
  const titulo   = document.getElementById('edit-titulo').value.trim();
  const unidad   = parseInt(document.getElementById('edit-unidad').value);
  const semana   = parseInt(document.getElementById('edit-semana').value);
  const tipo     = document.querySelector('input[name="edit-tipo"]:checked').value;
  const enlace   = document.getElementById('edit-enlace').value.trim();

  const btn     = document.getElementById('edit-submit-btn');
  const errDiv  = document.getElementById('edit-error');
  const okDiv   = document.getElementById('edit-success');

  btn.classList.add('btn-loading');
  btn.querySelector('span').classList.add('hidden');
  btn.querySelector('.spinner').classList.remove('hidden');
  errDiv.classList.add('hidden');
  okDiv.classList.add('hidden');

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Sin conexión a la base de datos');

    const updates = { titulo, unidad, semana, tipo };

    if (tipo === 'enlace') {
      if (!enlace) throw new Error('Ingresa una URL de enlace');
      updates.enlace_url  = enlace;
      updates.archivo_url = null;
      updates.archivo_nombre = null;
    } else if (tipo === 'archivo' && editSelectedFile) {
      // Subir nuevo archivo si se seleccionó uno
      const user = await getCurrentUserCached();
      const ext      = editSelectedFile.name.split('.').pop();
      const fileName = `trabajos/${user.id}/${unidad}-${semana}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('trabajos').upload(fileName, editSelectedFile);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('trabajos').getPublicUrl(fileName);

      updates.archivo_url    = urlData.publicUrl;
      updates.archivo_nombre = editSelectedFile.name;
      updates.enlace_url     = null;
    }

    const { error } = await supabase.from('trabajos').update(updates).eq('id', id);
    if (error) throw error;

    okDiv.textContent = '¡Trabajo actualizado correctamente!';
    okDiv.classList.remove('hidden');

    editSelectedFile = null;

    // Refrescar las listas
    if (typeof loadMyJobs  === 'function') loadMyJobs();
    if (typeof loadAllJobs === 'function') loadAllJobs();

    setTimeout(() => closeEditModal(), 1200);
  } catch (err) {
    errDiv.textContent = err.message || 'Error al guardar cambios';
    errDiv.classList.remove('hidden');
  } finally {
    btn.classList.remove('btn-loading');
    btn.querySelector('span').classList.remove('hidden');
    btn.querySelector('.spinner').classList.add('hidden');
  }
}

// ============================================
// ELIMINAR TRABAJO
// ============================================
async function deleteJob(id) {
  if (!confirm('¿Seguro que quieres eliminar este trabajo? Esta acción no se puede deshacer.')) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('trabajos').delete().eq('id', id);
    if (error) throw error;

    showToast('Trabajo eliminado correctamente');
    loadMyJobs();
    loadAllJobs();
  } catch (err) {
    showToast(err.message || 'Error al eliminar', 'error');
  }
}

// ============================================
// UTILIDADES
// ============================================
function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Escapa comillas simples para usarlas en atributos HTML onclick
function escStr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showToast(message, type = 'success') {
  const div = document.createElement('div');
  div.className = `alert ${type === 'error' ? 'alert-error' : 'alert-success'}`;
  div.textContent = message;
  div.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;min-width:220px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme',
    document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}


// ============================================
// BUSCADOR EN "VER PORTAFOLIO"
// Filtra los trabajos ya renderizados en el DOM
// ============================================
function filtrarPortafolio(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.unit-job').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
  // Ocultar secciones de unidad si todas sus filas están ocultas
  document.querySelectorAll('.unit-section').forEach(section => {
    const visible = [...section.querySelectorAll('.unit-job')]
      .some(j => j.style.display !== 'none');
    section.style.display = visible ? '' : 'none';
  });
}

// ============================================
// GESTIÓN DE USUARIOS (solo admin)
// Carga perfiles pendientes de aprobación
// ============================================
async function loadUserManagement() {
  const supabase = getSupabase();
  const container = document.getElementById('users-list');
  if (!container || !supabase) return;

  container.innerHTML = '<div class="text-center text-muted">Cargando usuarios...</div>';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay usuarios registrados</div>';
      return;
    }

    container.innerHTML = data.map(u => `
      <div class="job-item" id="user-row-${u.id}">
        <div class="job-info">
          <span class="job-title">${u.nombre_completo || u.email || 'Sin nombre'}</span>
          <span class="job-meta">
            ${u.email || ''} ·
            <span class="role-badge ${u.rol === 'admin' ? 'role-admin' : 'role-user'}">
              ${u.rol === 'admin' ? 'Admin' : 'Estudiante'}
            </span> ·
            <span class="status-badge ${u.aprobado ? 'status-ok' : 'status-pending'}">
              ${u.aprobado ? '✓ Aprobado' : '⏳ Pendiente'}
            </span>
          </span>
        </div>
        <div class="job-actions">
          ${!u.aprobado ? `
            <button onclick="toggleUserApproval('${u.id}', true)"
                    class="btn btn-sm btn-primary" title="Aprobar acceso">Aprobar</button>
          ` : `
            <button onclick="toggleUserApproval('${u.id}', false)"
                    class="btn btn-sm btn-outline" title="Revocar acceso">Revocar</button>
          `}
          ${u.rol !== 'admin' ? `
            <button onclick="setUserRole('${u.id}', 'admin')"
                    class="btn-icon btn-icon-edit" title="Hacer admin">★</button>
          ` : `
            <button onclick="setUserRole('${u.id}', 'estudiante')"
                    class="btn-icon btn-icon-edit" title="Quitar admin" style="opacity:.5">★</button>
          `}
        </div>
      </div>
    `).join('');

  } catch(err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function toggleUserApproval(userId, aprobar) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ aprobado: aprobar })
      .eq('id', userId);
    if (error) throw error;
    showToast(aprobar ? 'Usuario aprobado ✓' : 'Acceso revocado');
    loadUserManagement();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function setUserRole(userId, rol) {
  const supabase = getSupabase();
  if (!supabase) return;
  if (!confirm(`¿Cambiar el rol a "${rol}"?`)) return;
  try {
    const { error } = await supabase
      .from('profiles').update({ rol }).eq('id', userId);
    if (error) throw error;
    showToast('Rol actualizado');
    loadUserManagement();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// CONTADORES DE TRABAJOS POR TAB
// ============================================
async function updateJobCounts() {
  const supabase = getSupabase();
  if (!supabase) return;
  const user = await getCurrentUserCached();
  if (!user) return;

  // Mis trabajos
  const { count: myCount } = await supabase
    .from('trabajos').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Todos
  const { count: allCount } = await supabase
    .from('trabajos').select('id', { count: 'exact', head: true });

  const tabBtns = document.querySelectorAll('.tab');
  if (tabBtns[0] && myCount  != null) tabBtns[0].textContent = `Mis Trabajos (${myCount})`;
  if (tabBtns[2] && allCount != null) tabBtns[2].textContent = `Ver Portafolio (${allCount})`;
}
