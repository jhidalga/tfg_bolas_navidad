import { View, useWindowDimensions } from 'react-native';
import Card from './cardProductos';
import { styles as estilosEscritorio } from '../styles/grid/grid.styles';
import { styles as estilosMovil } from '../styles/grid/grid.styles.movil';
import { useEstilos, useEsMovilWeb } from '../lib/responsive';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';

/**
 * Propiedades para el componente Grid.
 */
export interface GridProps {
    /** * Lista de productos a renderizar en la cuadrícula. 
     * Cada producto debe contener información básica como id, nombre, precio, 
     * y opcionalmente modelos y colores disponibles.
     */
    productos: any[];
}

/**
 * Componente visual que organiza y muestra una lista de productos en formato de cuadrícula (Grid).
 * Renderiza múltiples componentes `CardProducto` y gestiona la navegación hacia
 * la vista de detalles al pulsar sobre uno de ellos.
 * * Si un producto está deshabilitado, bloquea la navegación y muestra un mensaje emergente (Toast).
 * * @param props - Propiedades del componente definidas en {@link GridProps}
 * @returns Componente View contenedor de la cuadrícula de productos.
 */
export default function Grid({ productos }: GridProps) {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const esMovilWeb = useEsMovilWeb();
    // En pantallas medianas con diseño de movil se reparten en 2 o 3 columnas
    const columnas = !esMovilWeb || width < 600 ? 1 : width < 900 ? 2 : 3;

    return (
        <View style={styles.grid}>
            {productos.map((item) => {
                const imagenVisual = item.modelos && item.modelos.length > 0 ? item.modelos[0].imagen : null;
                return (
                    <View key={item.id} style={[styles.cardWrapper, columnas > 1 && { width: `${100 / columnas}%`, paddingHorizontal: 8 }]}>
                        <Card 
                            titulo={item.nombre} 
                            imagenUrl={imagenVisual}
                            precio={item.precio?.toString()}
                            personalizable={item.personalizable}
                            cantidadModelos={item.modelos ? item.modelos.length : 0}
                            cantidadColores={item.colores ? item.colores.length : 0}
                            deshabilitado={item.deshabilitado}
                            onPress={() => {
                                if (item.deshabilitado) {
                                    Toast.show({
                                        type: 'error',
                                        text1: 'No disponible',
                                        text2: 'Este producto no está disponible temporalmente.'
                                    });
                                } else {
                                    router.push({ pathname: '/detalles', params: { id: item.id } });
                                }
                            }}
                        />
                    </View>
                );
            })}
        </View>
    );
}