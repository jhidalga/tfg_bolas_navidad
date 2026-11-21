import { Platform } from 'react-native';

/**
 * Temas de la web. Las pantallas estan pensadas con los colores de Navidad; cada tema
 * cambia esos colores por los suyos, asi un tema nuevo es solo una paleta mas.
 */
export type NombreTema = 'normal' | 'navidad' | 'sanvalentin';

export type Tema = {
    nombre: NombreTema;
    etiqueta: string;
    /** Nombre de la tienda en la barra, el pie y la portada. */
    marca: string;
    descripcion: string;
    /** Color de Navidad -> color de este tema. Lo que no este aqui se queda igual. */
    mapa: Record<string, string>;
    /** Fondo de la pagina (CSS). */
    fondo: string;
    /** Decoraciones que lleva este tema. */
    luces: boolean;
    bienvenida: 'adornos' | 'corazones' | null;
    letrero: 'abeto' | 'corazones' | 'plano';
    nieve: 'copos' | 'corazones';
    /** Colores para la vista previa del panel admin. */
    muestra: { fondo: string; tarjeta: string; acento: string; texto: string };
};

const NAVIDAD: Tema = {
    nombre: 'navidad', etiqueta: 'Navidad', marca: 'Adornos navideños', descripcion: 'Noche dorada: burdeos, crema y dorado, con luces, nieve y adornos.',
    mapa: {},
    fondo: '#3d0b0f radial-gradient(ellipse at 50% 0,#7a1d20 0%,#4a0f12 55%,#2e070a 100%) fixed',
    luces: true, bienvenida: 'adornos', letrero: 'abeto', nieve: 'copos',
    muestra: { fondo: '#4a0f12', tarjeta: '#fbf1de', acento: '#a52a2a', texto: '#3b1a12' },
};

const NORMAL: Tema = {
    nombre: 'normal', etiqueta: 'Normal', marca: 'Adornos personalizados', descripcion: 'La web base: limpia, clara y con azul. Sin adornos.',
    mapa: {
        '#a52a2a': '#2563eb', '#e3cfa5': '#e2e8f0', '#fbf1de': '#ffffff', '#efdfc3': '#f1f5f9', '#f3e6cc': '#f8fafc',
        '#3b1a12': '#1e293b', '#7a5a48': '#64748b', '#f1cf8a': '#334155', '#e6c27a': '#3b82f6', '#fff7ea': '#0f172a',
        '#4a0f12': '#ffffff', '#3d0b0f': '#f1f5f9', '#ff8f85': '#dc2626', '#f1c9c0': '#bfdbfe', '#b8862b': '#d97706',
        '#2f7a46': '#16a34a', '#1d4a2e': '#e0ecff',
        'rgba(230,194,122,': 'rgba(37,99,235,',
    },
    fondo: '#f1f5f9',
    luces: false, bienvenida: null, letrero: 'plano', nieve: 'copos',
    muestra: { fondo: '#f1f5f9', tarjeta: '#ffffff', acento: '#2563eb', texto: '#1e293b' },
};

const SANVALENTIN: Tema = {
    nombre: 'sanvalentin', etiqueta: 'San Valentín', marca: 'Adornos de San Valentín', descripcion: 'Vino y rosa: tonos rosados y corazones que caen y cuelgan.',
    mapa: {
        '#a52a2a': '#d6336c', '#e3cfa5': '#f5c2d2', '#fbf1de': '#fff1f5', '#efdfc3': '#fde4ec', '#f3e6cc': '#ffe9f0',
        '#3b1a12': '#4a1a2c', '#7a5a48': '#8a5068', '#f1cf8a': '#ffc2d4', '#e6c27a': '#ff8fab', '#fff7ea': '#fff0f4',
        '#4a0f12': '#7a1840', '#3d0b0f': '#4d0e2a', '#ff8f85': '#ff9bb3', '#f1c9c0': '#f8c8d8', '#b8862b': '#e0568a',
        '#2f7a46': '#c2255c', '#1d4a2e': '#8f1d4d',
        'rgba(230,194,122,': 'rgba(255,143,171,',
    },
    fondo: '#4d0e2a radial-gradient(ellipse at 50% 0,#a12456 0%,#6b1640 55%,#3a0a22 100%) fixed',
    luces: false, bienvenida: 'corazones', letrero: 'corazones', nieve: 'corazones',
    muestra: { fondo: '#6b1640', tarjeta: '#fff1f5', acento: '#d6336c', texto: '#4a1a2c' },
};

export const TEMAS: Record<NombreTema, Tema> = { normal: NORMAL, navidad: NAVIDAD, sanvalentin: SANVALENTIN };
export const ORDEN_TEMAS: NombreTema[] = ['normal', 'navidad', 'sanvalentin'];

const CLAVE = 'tema_web';
const CLAVE_OFERTAS = 'ofertas_web';
const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

function leerGuardado(): NombreTema {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const v = window.localStorage.getItem(CLAVE) as NombreTema | null;
            if (v && TEMAS[v]) return v;
        }
    } catch { /* sin almacenamiento */ }
    return 'navidad';
}

/** Ofertas de la web: si estan apagadas, ningun producto enseña precio tachado ni la etiqueta. */
function leerOfertas(): boolean {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage.getItem(CLAVE_OFERTAS) !== 'no';
    } catch { /* sin almacenamiento */ }
    return true;
}
export const ofertasActivas: boolean = leerOfertas();

/** Tema activo. Se lee al cargar la web, asi los colores ya son los buenos desde el primer pintado. */
export let temaActual: Tema = TEMAS[leerGuardado()];

/** Pasa un color de Navidad al del tema activo (los colores sueltos tambien: rgba de dorado, etc). */
export function tc<T>(valor: T): T {
    if (typeof valor !== 'string' || temaActual.nombre === 'navidad') return valor;
    const v = valor as string;
    const m = temaActual.mapa;
    const directo = m[v.toLowerCase()];
    if (directo) return directo as any;
    for (const prefijo of Object.keys(m)) {
        if (prefijo.startsWith('rgba') && v.startsWith(prefijo)) return (m[prefijo] + v.slice(prefijo.length)) as any;
    }
    return valor;
}

/** Cambia los colores de un objeto de estilos entero (lo que devuelve StyleSheet.create). */
export function tcEstilos<T>(estilos: T): T {
    if (temaActual.nombre === 'navidad') return estilos;
    const cache = (tcEstilos as any)._c as WeakMap<object, any> || ((tcEstilos as any)._c = new WeakMap());
    const previo = cache.get(estilos as any);
    if (previo && previo.t === temaActual.nombre) return previo.v;
    const rec = (x: any): any => {
        if (typeof x === 'string') return tc(x);
        if (Array.isArray(x)) return x.map(rec);
        if (x && typeof x === 'object') {
            const o: any = {};
            for (const k of Object.keys(x)) o[k] = rec(x[k]);
            return o;
        }
        return x;
    };
    const v = rec(estilos);
    cache.set(estilos as any, { t: temaActual.nombre, v });
    return v;
}

/**
 * Pregunta al servidor que tema esta activo. Si es distinto del guardado, lo guarda y
 * recarga la pagina una vez para que se vea entero con el tema nuevo.
 */
export async function sincronizarTema(): Promise<void> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
        const res = await fetch(`${API_URL}/tema`);
        if (!res.ok) return;
        const { tema, ofertas } = await res.json();
        const ofertasServidor = ofertas !== false;
        let recargar = false;
        if (TEMAS[tema as NombreTema] && tema !== temaActual.nombre) { window.localStorage.setItem(CLAVE, tema); recargar = true; }
        if (ofertasServidor !== ofertasActivas) { window.localStorage.setItem(CLAVE_OFERTAS, ofertasServidor ? 'si' : 'no'); recargar = true; }
        if (recargar) window.location.reload();
    } catch { /* sin conexion: se queda el que habia */ }
}

/** Para el panel admin: guarda el tema elegido en este navegador y recarga. */
export function aplicarTemaLocal(nombre: NombreTema) {
    try { window.localStorage.setItem(CLAVE, nombre); } catch { /* nada */ }
    window.location.reload();
}

/** Para el panel admin: guarda en este navegador si las ofertas estan activas y recarga. */
export function aplicarOfertasLocal(activas: boolean) {
    try { window.localStorage.setItem(CLAVE_OFERTAS, activas ? 'si' : 'no'); } catch { /* nada */ }
    window.location.reload();
}
