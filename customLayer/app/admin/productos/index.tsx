import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminProductos/adminProductos.styles';

export default function AdminProductos() {
    const router = useRouter();
    const [productos, setProductos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarProductos();
    }, []);

    const cargarProductos = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('http://192.168.0.25:8000/api/productos?incluir_ocultos=true', {
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

    if (cargando) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#3b82f6" />;

    return (
        <ScrollView style={styles.contenedor} contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: 15 }}>
                <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>⬅ Volver</Text>
            </Pressable>
            
            <View style={styles.cabecera}>
                <Text style={styles.titulo}>Gestión de Catálogo</Text>
                <Pressable style={styles.btnNuevo} onPress={() => router.push('/admin/productos/nuevo')}>
                    <Text style={styles.txtNuevo}>+ Nuevo Producto</Text>
                </Pressable>
            </View>

            <View style={styles.tabla}>
                <View style={styles.filaCabecera}>
                    <Text style={[styles.col, { flex: 0.5 }]}>Foto</Text>
                    <Text style={[styles.col, { flex: 2 }]}>Producto</Text>
                    <Text style={[styles.col, { flex: 1 }]}>Precio</Text>
                    <Text style={[styles.col, { flex: 1 }]}>Visibilidad</Text>
                    <Text style={[styles.col, { flex: 1 }]}>Estado</Text>
                </View>

                {productos.map((prod) => (
                    <Pressable
                        key={prod.id}
                        style={styles.fila}
                        onPress={() => router.push(`/admin/productos/${prod.id}`)}
                    >
                        <View style={[styles.col, { flex: 0.5 }]}>
                            <Image
                                source={{ uri: prod.modelos?.[0]?.imagen }}
                                style={styles.miniImg}
                            />
                        </View>
                        
                        <View style={[styles.col, { flex: 2 }]}>
                            <Text style={styles.txtNombre}>{prod.nombre}</Text>
                            <Text style={styles.txtSub}>{prod.modelos?.length || 0} modelos</Text>
                        </View>
                        
                        <Text style={[styles.col, { flex: 1, fontWeight: 'bold' }]}>{prod.precio} €</Text>
                        
                        <View style={[styles.col, { flex: 1 }]}>
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

                        <View style={[styles.col, { flex: 1 }]}>
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
                    </Pressable>
                ))}
            </View>
        </ScrollView>
    );
}