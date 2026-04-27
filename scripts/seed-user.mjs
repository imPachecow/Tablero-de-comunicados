import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer .env manualmente
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
);

const supabase = createClient(
  env.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL    = 'docente@prueba.com';
const PASSWORD = 'docente123';

// Eliminar usuario anterior si existe (para poder re-ejecutar)
const { data: existingUsers } = await supabase.auth.admin.listUsers();
const existing = existingUsers?.users?.find(u => u.email === EMAIL);
if (existing) {
  await supabase.auth.admin.deleteUser(existing.id);
  console.log('Usuario anterior eliminado.');
}

// Crear usuario
const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});

if (error) {
  console.error('Error al crear usuario:', error.message);
  process.exit(1);
}

console.log('Usuario creado:', data.user.id);

// Actualizar perfil con rol teacher
const { error: profileError } = await supabase
  .from('profiles')
  .update({ role: 'teacher', full_name: 'Docente Prueba' })
  .eq('id', data.user.id);

if (profileError) {
  console.error('Error al actualizar perfil:', profileError.message);
  process.exit(1);
}

console.log('\n✅ Usuario de prueba listo:');
console.log('   Email:    ', EMAIL);
console.log('   Contraseña:', PASSWORD);
