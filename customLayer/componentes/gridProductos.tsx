import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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
    modelos: Modelo[];
}

export default function Grid() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando] = useState(true);

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
            <View style={[styles.grid, { justifyContent: 'center', alignItems: 'center', flex: 1, padding: 50 }]}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{ marginTop: 10, color: 'gray' }}>Cargando catálogo...</Text>
            </View>
        );
    }

    return (
        <View style={styles.grid}>
            {productos.map((item) => (
                <Card 
                    key={item.id} 
                    titulo={item.nombre} 
                    imagenUrl={item.imagen}
                    personalizable={item.personalizable}
                    cantidadModelos={item.modelos ? item.modelos.length : 0}
                    cantidadColores={item.colores ? item.colores.length : 0}
                />
            ))}
        </View>
    );
}