/**
 * Título de un pedido: Nombre completo · curso · número de pedido (01, 02...).
 * El 01 es el pedido más antiguo de esa persona.
 * Sin nombre se usa el código corto del pedido.
 */
export function etiquetaPedido(usuario: any, id: string, numero?: number | null): string {
    if (!usuario?.nombre) return '#' + String(id).slice(0, 8).toUpperCase();
    let texto = usuario.nombre + (usuario.curso ? ' · ' + usuario.curso : '');
    if (numero) texto += ' · ' + String(numero).padStart(2, '0');
    return texto;
}
