// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

// Credenciales de Supabase
const SUPABASE_URL = 'https://bdhskkzjefzgujfelvzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaHNra3pqZWZ6Z3VqZmVsdnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTcxNjYsImV4cCI6MjA5MTY5MzE2Nn0.CkLJfPBoaS82ncskMgeUJsXx5Yzz8fFuvufDpLwPwxg';

// ============================================
// CONFIGURACIÓN DEL CURSO
// ============================================

const CURSO_CONFIG = {
  nombre: 'Base de Datos II',
  ciclo: 'V Ciclo',
  anio: 2026,
  universidad: 'Universidad Peruana Los Andes',
  docente: 'Ing. Bejarano',
  integrantes: ['Casimiro', 'Laura', 'Kimberly'],
  unidades: [
    { id: 1, nombre: 'Fundamentos', semanas: [1, 2, 3, 4] },
    { id: 2, nombre: 'Modelo E-R', semanas: [5, 6, 7, 8] },
    { id: 3, nombre: 'SQL', semanas: [9, 10, 11, 12] },
    { id: 4, nombre: 'Admin', semanas: [13, 14, 15, 16] }
  ]
};

// ============================================
// INICIALIZAR SUPABASE (se llama desde HTML)
// ============================================

window.initSupabase = function() {
  if (typeof supabase !== 'undefined') {
    window.SB = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    window.supabase = window.SB;
    console.log('✅ Supabase inicializado');
  }
};