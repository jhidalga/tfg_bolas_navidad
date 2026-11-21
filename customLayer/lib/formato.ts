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
