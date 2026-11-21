import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles as estilosEscritorio } from '../../../styles/adminProductos/adminProductos.styles';
import { styles as estilosMovil } from '../../../styles/adminProductos/adminProductos.styles.movil';
import { useEstilos } from '../../../lib/responsive';
import { euros, plural } from '../../../lib/formato';
import { ofertasActivas, aplicarOfertasLocal } from '../../../lib/tema';
import Toast from 'react-native-toast-message';

/**
 * Pantalla principal de administración del Catálogo de Productos.
 * Muestra una lista paginada de todos los productos disponibles en la base de datos, 
 * incluyendo aquellos marcados como ocultos o deshabilitados. 
 * Permite buscar productos por nombre, acceder a sus detalles de edición y navegar 
 * hacia el formulario de creación de un nuevo producto.
 * * @returns Componente que renderiza el gestor de productos.
 */
export default function AdminProductos() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;
    const [ofertas, setOfertas] = useState<boolean>(ofertasActivas);
    const [guardandoOfertas, setGuardandoOfertas] = useState(false);

    /** Activa o quita las ofertas de toda la tienda. Cada producto tiene ademas su propio interruptor. */
    const cambiarOfertas = async () => {
        if (guardandoOfertas) return;
        setGuardandoOfertas(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/ofertas`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ activas: !ofertas }),
            });
            if (!res.ok) { Toast.show({ type: 'error', text1: 'No se pudo cambiar las ofertas' }); setGuardandoOfertas(false); return; }
            setOfertas(!ofertas);
            Toast.show({ type: 'success', text1: !ofertas ? 'Ofertas activadas' : 'Ofertas desactivadas' });
            setTimeout(() => aplicarOfertasLocal(!ofertas), 600);
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
            setGuardandoOfertas(false);
        }
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    /**
     * Obtiene la lista del catálogo completo de productos desde la API.
     * Se solicita explícitamente incluir los productos ocultos (`incluir_ocultos=true`)
     * para que los administradores puedan gestionarlos.
     */
    const cargarProductos = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos?incluir_ocultos=true`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const datos = await res.json();
                setProductos(datos);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    /**
     * Filtra la lista de productos en memoria basándose en el texto introducido
     * en la barra de búsqueda (evaluación parcial de nombre, case-insensitive).
     */
    const productosFiltrados = useMemo(() => {
        return productos.filter(p => 
            p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [productos, busqueda]);

    const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
    const productosPaginados = productosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina,
        paginaActual * itemsPorPagina
    );

    if (cargando) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <View style={styles.contenedor}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#475569" /><Text style={styles.txtVolver}>Volver</Text></View>
                </Pressable>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: '#1e293b', fontSize: 15 }}>Ofertas de la tienda</Text>
                        <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                            {ofertas ? 'Activas: se ven en los productos marcados como "En oferta".' : 'Apagadas: ningún producto enseña precio tachado ni etiqueta.'}
                        </Text>
                    </View>
                    <Pressable onPress={cambiarOfertas} disabled={guardandoOfertas}
                        style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: ofertas ? '#16a34a' : '#e2e8f0', opacity: guardandoOfertas ? 0.6 : 1 }}>
                        <Text style={{ fontWeight: '700', color: ofertas ? '#fff' : '#475569' }}>{ofertas ? 'Activas' : 'Apagadas'}</Text>
                    </Pressable>
                </View>

                <View style={styles.cabeceraContenedor}>
                    <Text style={styles.titulo}>Gestión de Catálogo</Text>
                    <View style={styles.cabeceraAcciones}>
                        <TextInput 
                            style={styles.inputBuscar}
                            placeholder="Buscar producto por nombre..."
                            placeholderTextColor="#94a3b8"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                        <Pressable style={styles.btnNuevoHeader} onPress={() => router.push('/admin/productos/nuevo')}>
                            <Text style={styles.txtNuevoHeader}>+ Nuevo Producto</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.tabla}>
                    <View style={styles.filaCabecera}>
                        <Text style={styles.colFotoHeader}>Foto</Text>
                        <View style={styles.colDetallesCabecera}>
                            <Text style={styles.colInfoCabecera}>Producto</Text>
                            <Text style={styles.colPrecioCabecera}>Precio</Text>
                            <Text style={styles.colBadgeCabecera}>Visibilidad</Text>
                            <Text style={styles.colBadgeCabecera}>Estado</Text>
                        </View>
                    </View>

                    {productosFiltrados.length === 0 ? (
                        <View style={styles.estadoVacio}>
                            <Text style={styles.txtEstadoVacio}>No se encontraron productos.</Text>
                        </View>
                    ) : (
                        productosPaginados.map((prod) => (
                            <Pressable
                                key={prod.id}
                                style={styles.fila}
                                onPress={() => router.push(`/admin/productos/${prod.id}`)}
                            >
                                <View style={styles.colFoto}>
                                    <Image
                                        source={{ uri: prod.modelos?.[0]?.imagen }}
                                        style={styles.miniImg}
                                    />
                                </View>
                                
                                <View style={styles.colDetalles}>
                                    <View style={styles.colInfo}>
                                        <Text style={styles.txtNombre}>{prod.nombre}</Text>
                                        <Text style={styles.txtSub}>{plural(prod.modelos?.length || 0, 'modelo', 'modelos')}</Text>
                                    </View>
                                    
                                    <Text style={styles.colPrecio}>{euros(prod.precio)}</Text>
                                    
                                    <View style={styles.contenedorBadges}>
                                        <View style={styles.colVisibilidad}>
                                            <View style={[
                                                styles.badge,
                                                { backgroundColor: prod.oculto ? '#fee2e2' : '#dcfce7' }
                                            ]}>
                                                <Text style={[
                                                    styles.txtBadge,
                                                    { color: prod.oculto ? '#991b1b' : '#166534' }
                                                ]}>
                                                    {prod.oculto ? 'Oculto' : 'Visible'}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.colEstado}>
                                            <View style={[
                                                styles.badge,
                                                { backgroundColor: prod.deshabilitado ? '#fef3c7' : '#dcfce7' }
                                            ]}>
                                                <Text style={[
                                                    styles.txtBadge,
                                                    { color: prod.deshabilitado ? '#d97706' : '#166534' }
                                                ]}>
                                                    {prod.deshabilitado ? 'Deshabilitado' : 'Activo'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                {totalPaginas > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 10, gap: 15 }}>
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
            </ScrollView>

            <Pressable style={styles.btnNuevoFlotante} onPress={() => router.push('/admin/productos/nuevo')}>
                <Text style={styles.txtNuevoFlotante}>+</Text>
            </Pressable>
        </View>
    );
}