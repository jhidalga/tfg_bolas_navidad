/** Palabras que se saltan al sacar las letras de un apellido compuesto (de la Cruz, del Río...). */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'da', 'do', 'di', 'van', 'von']);

/** Pasa a minúsculas, quita tildes y la ñ pasa a n. Deja solo letras a-z y espacios. */
function limpiar(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Primeras 3 letras del primer trozo del apellido que no sea una partícula. */
function tresLetras(apellido: string): string {
    const palabras = limpiar(apellido).split(' ').filter(Boolean);
    const buena = palabras.find((p) => !PARTICULAS.has(p)) ?? palabras[0] ?? '';
    return buena.slice(0, 3);
}

/**
 * Principio que debe llevar el correo de un alumno:
 * primera letra del nombre + 3 letras del primer apellido + 3 del segundo.
 * Ejemplo: Juan José, de la Cruz, Amarillo -> jcruama
 */
export function prefijoCorreoAlumno(nombre: string, apellido1: string, apellido2: string): string {
    const inicial = limpiar(nombre).charAt(0);
    return inicial + tresLetras(apellido1) + tresLetras(apellido2);
}

export const DOMINIO_ALUMNOS = '@g.educaand.es';

/**
 * Devuelve el texto del error, o null si el correo vale.
 * Alumnos: debe ser @g.educaand.es y empezar por el prefijo.
 * Profesores: vale cualquier correo con formato correcto.
 */
export function validarCorreo(correo: string, esProfesor: boolean, nombre: string, apellido1: string, apellido2: string): string | null {
    const c = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return 'Introduce un correo electrónico válido';
    if (esProfesor) return null;
    if (!c.endsWith(DOMINIO_ALUMNOS)) return `El correo de alumno debe acabar en ${DOMINIO_ALUMNOS}`;
    const usuario = c.slice(0, -DOMINIO_ALUMNOS.length);
    const prefijo = prefijoCorreoAlumno(nombre, apellido1, apellido2);
    if (!usuario.startsWith(prefijo)) return `Tu correo debe empezar por ${prefijo} y acabar en ${DOMINIO_ALUMNOS}`;
    return null;
}
