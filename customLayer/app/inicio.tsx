import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, Text, Pressable, Modal, TouchableOpacity } from 'react-native';
import Footer from '../componentes/footer';
import Navbar from '@/componentes/navbar';
import Grid from '@/componentes/gridProductos';
import Filtros from '@/componentes/filtros';
import { styles } from '../styles/inicio/Inicio.styles';
import { Ionicons } from '@expo/vector-icons';

export default function Inicio() {
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    
    const [nombre, setNombre] = useState('');
    const [personalizable, setPersonalizable] = useState(false);
    const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
    const [filtroPrecioMax, setFiltroPrecioMax] = useState('');
    const [minMax, setMinMax] = useState({ min: 0, max: 0 });
    
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;

    const [modalFiltros, setModalFiltros] = useState(false);

    useEffect(() => {
        setPaginaActual(1);
    }, [nombre, personalizable, filtroPrecioMin, filtroPrecioMax]);

    useEffect(() => {
        const fetchProductos = async () => {
            try {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setProductos(data);
                        if (data.length > 0) {
                            const precios = data.map((p: any) => p.precio || 0);
                            const min = Math.min(...precios);
                            const max = Math.max(...precios);
                            setMinMax({ min, max });
                        }
                    } else {
                        setProductos([]);
                    }
                } else {
                    setProductos([]);
                }
            } catch (error) {
                setProductos([]);
            } finally {
                setCargando(false);
            }
        };
        fetchProductos();
    }, []);

    const productosFiltrados = useMemo(() => {
        const arraySeguro = Array.isArray(productos) ? productos : [];
        return arraySeguro.filter(p => {
            const nombreSeguro = p.nombre || '';
            const matchNombre = nombreSeguro.toLowerCase().includes(nombre.toLowerCase());
            const matchPers = personalizable ? p.personalizable === true : true;
            const minNum = filtroPrecioMin ? parseFloat(filtroPrecioMin) : minMax.min;
            const maxNum = filtroPrecioMax ? parseFloat(filtroPrecioMax) : minMax.max;
            const precioSeguro = p.precio || 0;
            const matchPrecio = precioSeguro >= minNum && precioSeguro <= maxNum;
            
            return matchNombre && matchPers && matchPrecio;
        });
    }, [productos, nombre, personalizable, filtroPrecioMin, filtroPrecioMax, minMax]);

    const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
    const productosPaginados = productosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina, 
        paginaActual * itemsPorPagina
    );

    const renderFiltros = () => (
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
    );

    return (
        <View style={styles.contenedorPrincipal}>
            <Navbar />
            <ScrollView contentContainerStyle={styles.contenidoScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.layoutPrincipal}>
                    <View style={styles.sidebarDesktop}>
                        {!cargando && renderFiltros()}
                    </View>
                    
                    <View style={{ flex: 1 }}>
                        {cargando ? (
                            <ActivityIndicator size="large" color="#3b82f6" />
                        ) : (
                            <>
                                {productosPaginados.length === 0 ? (
                                    <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: '#64748b' }}>
                                        No se encontraron productos.
                                    </Text>
                                ) : (
                                    <Grid productos={productosPaginados} />
                                )}
                                
                                {totalPaginas > 1 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 15 }}>
                                        <Pressable 
                                            style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }, paginaActual === 1 ? { backgroundColor: '#cbd5e1' } : { backgroundColor: '#3b82f6' }]}
                                            disabled={paginaActual === 1}
                                            onPress={() => setPaginaActual(p => p - 1)}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Anterior</Text>
                                        </Pressable>

                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#475569' }}>
                                            Página {paginaActual} de {totalPaginas}
                                        </Text>

                                        <Pressable 
                                            style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }, paginaActual === totalPaginas ? { backgroundColor: '#cbd5e1' } : { backgroundColor: '#3b82f6' }]}
                                            disabled={paginaActual === totalPaginas}
                                            onPress={() => setPaginaActual(p => p + 1)}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Siguiente</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
                <Footer />
            </ScrollView>

            <Modal visible={modalFiltros} animationType="slide" transparent={true} onRequestClose={() => setModalFiltros(false)}>
                <View style={styles.modalFondo}>
                    <View style={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Filtros</Text>
                            <TouchableOpacity onPress={() => setModalFiltros(false)}>
                                <Ionicons name="close" size={28} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {renderFiltros()}
                            <TouchableOpacity style={styles.btnAplicarFiltros} onPress={() => setModalFiltros(false)}>
                                <Text style={styles.txtBtnAplicar}>Aplicar Filtros</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {!cargando && (
                <TouchableOpacity style={styles.btnFlotante} onPress={() => setModalFiltros(true)}>
                    <Ionicons name="options" size={26} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
}