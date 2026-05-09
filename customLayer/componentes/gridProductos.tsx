import { View } from 'react-native';
import Card from './cardProductos';
import { styles } from '../styles/grid/grid.styles';
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
    const router = useRouter();

    return (
        <View style={styles.grid}>
            {productos.map((item) => {
                const imagenVisual = item.modelos && item.modelos.length > 0 ? item.modelos[0].imagen : null;
                return (
                    <View key={item.id} style={styles.cardWrapper}>
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