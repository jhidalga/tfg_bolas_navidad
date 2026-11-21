/**
 * Pasa a español los mensajes de error que vienen en ingles de Supabase o del servidor.
 * Si el mensaje ya esta en español se deja como esta.
 */
const TRADUCCIONES: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/invalid login credentials/i, () => 'Correo o contraseña incorrectos.'],
    [/email not confirmed/i, () => 'Aún no has confirmado tu correo. Revisa tu bandeja de entrada.'],
    [/user already registered|already been registered|already exists/i, () => 'Ese correo ya está registrado.'],
    [/password should be at least (\d+)/i, (m) => `La contraseña debe tener al menos ${m[1]} caracteres.`],
    [/new password should be different/i, () => 'La nueva contraseña debe ser distinta a la anterior.'],
    [/signup requires a valid password|password is required/i, () => 'Escribe una contraseña válida.'],
    [/unable to validate email|invalid format|invalid email/i, () => 'El correo no es válido.'],
    [/rate limit|only request this after|too many requests|over_.*_rate_limit/i, () => 'Demasiados intentos. Espera un poco y vuelve a probar.'],
    [/auth session missing|jwt expired|invalid jwt|invalid token|session.*(expired|not found)/i, () => 'Tu sesión ha caducado. Inicia sesión otra vez.'],
    [/failed to fetch|network request failed|networkerror|load failed|timeout/i, () => 'No hay conexión con el servidor. Inténtalo de nuevo.'],
    [/row-level security|permission denied|not authorized|forbidden/i, () => 'No tienes permisos para hacer esto.'],
    [/duplicate key|unique constraint/i, () => 'Ese dato ya existe.'],
    [/foreign key/i, () => 'No se puede borrar porque se está usando en otro sitio.'],
    [/signups? not allowed|signups? are disabled/i, () => 'Ahora mismo no se permiten registros nuevos.'],
];

const PALABRAS_INGLES = /\b(the|is|are|was|not|invalid|failed|error|should|must|already|exceeded|required|missing|expired|found|denied|permission|violates|constraint|relation|unable|cannot|could|please|try)\b/i;

export function traducirError(mensaje: unknown, porDefecto = 'Ha ocurrido un error. Inténtalo de nuevo.'): string {
    const texto = typeof mensaje === 'string' ? mensaje.trim() : '';
    if (!texto) return porDefecto;
    for (const [patron, fn] of TRADUCCIONES) {
        const m = texto.match(patron);
        if (m) return fn(m);
    }
    return PALABRAS_INGLES.test(texto) ? porDefecto : texto;
}
