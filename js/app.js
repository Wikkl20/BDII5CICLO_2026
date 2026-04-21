// ============================================
// APP - CARGAR TRABAJOS DINÁMICAMENTE
// ============================================

function getSupabase() {
  return window.SB || window.supabase;
}

// Cargar trabajos del usuario actual
async function loadMyJobs() {
  const supabase = getSupabase();
  const container = document.getElementById('my-jobs-list');
  if (!container || !supabase) {
    if (container) container.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="text-center text-muted">Inicia sesión para ver tus trabajos</div>';
    return;
  }

  const { data, error } = await supabase
    .from('trabajos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<div class="alert alert-error">Error al cargar trabajos</div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No tienes trabajos subidos</div>';
    return;
  }

  container.innerHTML = data.map(job => `
    <div class="job-item">
      <div class="job-info">
        <span class="job-title">${job.titulo || 'Sin título'}</span>
        <span class="job-meta">U${job.unidad} - Semana ${job.semana} • ${formatDate(job.created_at)}</span>
      </div>
      <div class="job-actions">
        <a href="${job.archivo_url || job.enlace_url || '#'}" target="_blank" class="btn btn-outline btn-icon" title="Ver">↗</a>
        <button onclick="deleteJob('${job.id}')" class="btn-icon btn-icon-danger" title="Eliminar">✕</button>
      </div>
    </div>
  `).join('');
}

// Cargar todos los trabajos
async function loadAllJobs() {
  const supabase = getSupabase();
  const container = document.getElementById('all-jobs-list');
  if (!container || !supabase) {
    if (container) container.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
    return;
  }

  const { data, error } = await supabase
    .from('trabajos_con_usuario')
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

  const unitNames = { 1: 'Fundamentos', 2: 'Modelo E-R', 3: 'SQL', 4: 'Admin' };
  const unitRanges = { 1: 'Semanas 1-4', 2: 'Semanas 5-8', 3: 'Semanas 9-12', 4: 'Semanas 13-16' };

  let html = '';
  for (const [unidad, jobs] of Object.entries(units)) {
    html += `
      <div class="unit-section">
        <div class="unit-header">
          <div class="unit-icon-large">${unidad}</div>
          <div class="unit-info">
            <h3>Unidad ${unidad} - ${unitNames[unidad]}</h3>
            <p class="text-sm text-muted">${unitRanges[unidad]}</p>
          </div>
        </div>
        <div class="unit-jobs">
          ${jobs.map(job => `
            <div class="unit-job">
              <span class="unit-job-title">S${job.semana}: ${job.titulo || 'Sin título'}</span>
              <a href="${job.archivo_url || job.enlace_url || '#'}" target="_blank" class="unit-job-link">Ver →</a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html || '<div class="empty-state">No hay trabajos disponibles</div>';
}

// Formatear fecha
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Eliminar trabajo
async function deleteJob(id) {
  if (!confirm('¿Eliminar este trabajo?')) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('trabajos').delete().eq('id', id);
    if (error) throw error;

    showToast('Trabajo eliminado');
    loadMyJobs();
    loadAllJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toast
function showToast(message, type = 'success') {
  const div = document.createElement('div');
  div.className = `alert ${type === 'error' ? 'alert-error' : 'alert-success'}`;
  div.textContent = message;
  div.style.position = 'fixed';
  div.style.bottom = '1.5rem';
  div.style.right = '1.5rem';
  div.style.zIndex = '1000';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// Theme
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}