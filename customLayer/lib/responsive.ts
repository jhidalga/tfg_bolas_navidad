import { Platform, useWindowDimensions } from 'react-native';
import { tcEstilos } from './tema';

/** A partir de este ancho (px) se usa el diseño de escritorio en la web. */
export const ANCHO_ESCRITORIO = 1100;

/**
 * True si es un teléfono usando la web. Mira el tamaño real de la pantalla del aparato,
 * así también funciona cuando el navegador del móvil pide la "versión de escritorio"
 * y le da a la web un ancho falso de unos 980 px.
 */
function esTelefonoWeb(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !window.screen) return false;
    const lado = Math.min(window.screen.width, window.screen.height);
    return (navigator.maxTouchPoints || 0) > 0 && lado <= 500;
}

/** True en la web si hay que usar el diseño de móvil. En la app nativa siempre es false. */
export function useEsMovilWeb(): boolean {
    const { width } = useWindowDimensions();
    if (Platform.OS !== 'web') return false;
    return width < ANCHO_ESCRITORIO || esTelefonoWeb();
}

/**
 * En la web con pantalla ancha usa los estilos de escritorio (.web).
 * En el móvil, o en un navegador estrecho, usa los estilos de móvil.
 */
export function useEstilos<T>(escritorio: T, movil: any): T {
    const esMovilWeb = useEsMovilWeb();
    return tcEstilos(Platform.OS === 'web' && !esMovilWeb ? escritorio : (movil as T));
}
