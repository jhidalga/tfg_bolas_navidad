import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminProductos/adminProductos.styles';

/**
 * Pantalla principal de administración del Catálogo de Productos.
 * Muestra una lista paginada de todos los productos disponibles en la base de datos, 
 * incluyendo aquellos marcados como ocultos o deshabilitados. 
 * Permite buscar productos por nombre, acceder a sus detalles de edición y navegar 
 * hacia el formulario de creación de un nuevo producto.
 * * @returns Componente que renderiza el gestor de productos.
 */
export default function AdminProductos() {
    const router = useRouter();
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;

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
                    <Text style={styles.txtVolver}>⬅ Volver</Text>
                </Pressable>
                
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
                                        <Text style={styles.txtSub}>{prod.modelos?.length || 0} modelos</Text>
                                    </View>
                                    
                                    <Text style={styles.colPrecio}>{prod.precio} €</Text>
                                    
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