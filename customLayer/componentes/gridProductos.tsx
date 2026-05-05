import { View } from 'react-native';
import Card from './cardProductos';
import { styles } from '../styles/grid/grid.styles';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';

interface GridProps {
    productos: any[];
}

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