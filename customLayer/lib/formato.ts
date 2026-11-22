/** Precio en formato español: 1,00 € */
export const euros = (n: number | string | null | undefined) =>
    `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;

/** Fecha en formato español: 17/11/2026 */
export const fechaCorta = (valor: string | number | Date | null | undefined) => {
    const f = new Date(valor as any);
    if (isNaN(f.getTime())) return '';
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** "1 modelo" o "3 modelos" */
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y'];

/**
 * Pone un nombre con la primera letra de cada palabra en mayúscula y el resto en minúscula.
 * Las partículas como "de" o "del" quedan en minúscula, salvo si van al principio.
 * Ejemplo: "ángel GARCÍA de la torre" pasa a "Ángel García de la Torre".
 */
export function normalizarNombre(texto: string): string {
    return texto
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((p, i) => (i > 0 && PARTICULAS.includes(p) ? p : p.replace(/(^|[-'])(\p{L})/gu, (_m, sep, l) => sep + l.toUpperCase())))
        .join(' ');
}
