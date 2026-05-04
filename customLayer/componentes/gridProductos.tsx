import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Card from './cardProductos';
import { styles } from '../styles/grid/grid.styles';
import Toast from 'react-native-toast-message';

export default function Grid() {
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos`);
                const data = await response.json();
                setProductos(data);
            } catch (error) {
                console.error(error);
            } finally {
                setCargando(false);
            }
        };
        fetchProductos();
    }, []);

    if (cargando) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loaderText}>Cargando catálogo...</Text>
            </View>
        );
    }

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