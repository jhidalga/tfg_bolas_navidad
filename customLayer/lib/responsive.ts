import { Platform, useWindowDimensions } from 'react-native';

/** A partir de este ancho (px) se usa el diseño de escritorio en la web. */
export const ANCHO_ESCRITORIO = 900;

/**
 * En la web con pantalla ancha usa los estilos de escritorio (.web).
 * En el móvil, o en un navegador estrecho, usa los estilos de móvil.
 */
export function useEstilos<T>(escritorio: T, movil: any): T {
    const { width } = useWindowDimensions();
    return Platform.OS === 'web' && width >= ANCHO_ESCRITORIO ? escritorio : (movil as T);
}
