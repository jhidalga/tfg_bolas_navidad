/**
 * Código de un pedido, todo junto: rferman-2dam-01
 *  - el correo de la persona sin el @ y lo que sigue (si lleva números se quedan)
 *  - curso o departamento en minúsculas sin símbolos (2º DAM pasa a 2dam)
 *  - número de pedido de esa persona, el 01 es el más antiguo
 * Si por un fallo no llega el correo se usa el código corto del pedido.
 */
const limpiar = (t: string) =>
    (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function etiquetaPedido(usuario: any, id: string, numero?: number | null): string {
    const correo = String(usuario?.email || '').split('@')[0].trim().toLowerCase();
    if (!correo) return '#' + String(id).slice(0, 8).toUpperCase();
    return [correo, limpiar(usuario?.curso || ''), numero ? String(numero).padStart(2, '0') : ''].filter(Boolean).join('-');
}
