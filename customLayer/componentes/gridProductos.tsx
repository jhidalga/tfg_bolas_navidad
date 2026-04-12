import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Card from './cardProductos';
import { styles } from '../styles/grid/grid.styles';

interface Modelo {
    id: string;
    nombre: string;
    imagen: string;
}

interface Producto {
    id: string;
    nombre: string;
    personalizable: boolean;
    colores: string[];
    imagen: string;
    precio: number;
    modelos: Modelo[];
}

export default function Grid() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const response = await fetch('http://192.168.0.25:8000/api/productos');
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
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loaderText}>Cargando catálogo...</Text>
            </View>
        );
    }

    return (
        <View style={styles.grid}>
            {productos.map((item) => (
                <View key={item.id} style={styles.cardWrapper}>
                    <Card 
                        titulo={item.nombre} 
                        imagenUrl={item.imagen}
                        precio={item.precio?.toString()}
                        personalizable={item.personalizable}
                        cantidadModelos={item.modelos ? item.modelos.length : 0}
                        cantidadColores={item.colores ? item.colores.length : 0}
                        onPress={() => router.push({
                            pathname: '/detalles',
                            params: { productoData: JSON.stringify(item) }
                        })}
                    />
                </View>
            ))}
        </View>
    );
}