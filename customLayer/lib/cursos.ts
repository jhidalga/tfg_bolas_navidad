/** Departamentos y cursos que se pueden elegir al registrarse. Se usan también en los filtros del panel. */
export const DEPARTAMENTOS = ['Informática', 'Lengua', 'Educación Física', 'Dibujo', 'Música', 'Religión', 'Cultura Clásica', 'Geografía', 'Tecnología', 'Inglés', 'Matemáticas', 'Física y Química', 'Biología'];
const LETRAS = ['A', 'B', 'C', 'D'];
export const GRUPOS: Record<string, string[]> = {
    'ESO': [1, 2, 3, 4].flatMap((n) => LETRAS.map((l) => `${n}º ESO ${l}`)),
    'Bachillerato': [1, 2].flatMap((n) => ['A', 'B'].map((l) => `${n}º Bach ${l}`)),
    'SMR': ['1º SMR', '2º SMR'],
    'DAM': ['1º DAM', '2º DAM'],
};
/** Todos los cursos en una sola lista, en el orden del registro. */
export const TODOS_LOS_CURSOS = Object.values(GRUPOS).flat();
