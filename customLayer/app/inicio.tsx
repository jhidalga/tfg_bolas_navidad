import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import Footer from '../componentes/footer';
import Navbar from '@/componentes/navbar';
import Grid from '@/componentes/gridProductos';
import Filtros from '@/componentes/filtros';
import { styles } from '../styles/inicio/Inicio.styles';

export default function Inicio() {
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    
    const [nombre, setNombre] = useState('');
    const [personalizable, setPersonalizable] = useState(false);
    
    const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
    const [filtroPrecioMax, setFiltroPrecioMax] = useState('');
    const [minMax, setMinMax] = useState({ min: 0, max: 0 });

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos`);
                const data = await response.json();
                setProductos(data);
                
                if (data.length > 0) {
                    const precios = data.map((p: any) => p.precio);
                    const min = Math.min(...precios);
                    const max = Math.max(...precios);
                    setMinMax({ min, max });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setCargando(false);
            }
        };
        fetchProductos();
    }, []);

    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            const matchNombre = p.nombre.toLowerCase().includes(nombre.toLowerCase());
            const matchPers = personalizable ? p.personalizable === true : true;

            const minNum = filtroPrecioMin ? parseFloat(filtroPrecioMin) : minMax.min;
            const maxNum = filtroPrecioMax ? parseFloat(filtroPrecioMax) : minMax.max;
            
            const matchPrecio = p.precio >= minNum && p.precio <= maxNum;
            
            return matchNombre && matchPers && matchPrecio;
        });
    }, [productos, nombre, personalizable, filtroPrecioMin, filtroPrecioMax, minMax]);

    return (
        <View style={styles.contenedorPrincipal}>
            <Navbar />
            <ScrollView contentContainerStyle={styles.contenidoScroll} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingTop: 40 }}>
                    
                    {!cargando && (
                        <Filtros 
                            nombre={nombre} 
                            setNombre={setNombre}
                            personalizable={personalizable} 
                            setPersonalizable={setPersonalizable}
                            precioMin={filtroPrecioMin} 
                            setPrecioMin={setFiltroPrecioMin}
                            precioMax={filtroPrecioMax} 
                            setPrecioMax={setFiltroPrecioMax}
                            minMax={minMax}
                        />
                    )}
                    
                    <View style={{ flex: 1 }}>
                        {cargando ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : (
                            <Grid productos={productosFiltrados} />
                        )}
                    </View>
                </View>
                <Footer />
            </ScrollView>
        </View>
    );
}