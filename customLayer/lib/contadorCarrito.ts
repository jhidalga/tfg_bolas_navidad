// Aviso sencillo para que la barra de navegación vuelva a contar el carrito
const oyentes = new Set<() => void>();

export function alCambiarCarrito(fn: () => void) {
    oyentes.add(fn);
    return () => { oyentes.delete(fn); };
}

export function avisarCarrito() {
    oyentes.forEach((fn) => fn());
}
