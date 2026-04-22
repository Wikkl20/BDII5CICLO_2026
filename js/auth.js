// ============================================
// AUTENTICACIÓN SUPABASE
// ============================================

// Inicializar auth y verificar sesión
async function initAuth() {
  const supabase = window.SB || window.supabase;
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.currentSession = session;

  supabase.auth.onAuthStateChange((event, session) => {
    window.currentSession = session;
    if (event === 'SIGNED_OUT') window.currentUser = null;
  });
}

// Obtener usuario actual
async function getCurrentUser() {
  const supabase = window.SB || window.supabase;
  if (!supabase) return null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Mi email siempre tiene rol de admin
    const tuEmail = 't01267f@ms.upla.edu.pe';
    const esMiEmail = session.user.email?.toLowerCase() === tuEmail;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      // Si no hay perfil, crear objeto básico
      return {
        id: session.user.id,
        email: session.user.email,
        nombre_completo: session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
        rol: esMiEmail ? 'admin' : 'estudiante' // Si es mi email, sempre es admin
      };
    }

    // Si es mi email, forzar admin
    if (esMiEmail) {
      data.rol = 'admin';
    }

    return data;
  } catch (e) {
    return null;
  }
}

// Cerrar sesión
async function logout() {
  const supabase = window.SB || window.supabase;
  if (!supabase) return;
  await supabase.auth.signOut();
}
