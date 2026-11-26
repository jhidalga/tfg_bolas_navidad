import { etiquetaPedido } from '../../../lib/etiquetaPedido';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { traducirError } from '../../../lib/errores';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles as estilosEscritorio } from '../../../styles/adminDetallePedido/adminDetallePedido.styles';
import { styles as estilosMovil } from '../../../styles/adminDetallePedido/adminDetallePedido.styles.movil';
import { useEstilos } from '../../../lib/responsive';
import { euros } from '../../../lib/formato';

/**
 * Pantalla de administración para ver los detalles de un pedido específico.
 * Recupera la información completa de la transacción a través de la API usando 
 * el identificador (ID) de la URL. Muestra el importe total y una lista con 
 * el desglose de los productos comprados (modelo, color, cantidad, precio unitario y personalización).
 * * @returns Componente que renderiza la vista detallada del pedido para el administrador.
 */
export default function DetallesPedidoAdmin() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const { id } = useLocalSearchParams(); 
    const router = useRouter();
    const [datos, setDatos] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        /**
         * Realiza una petición a la API para obtener los datos asociados al pedido actual.
         * Requiere que el usuario administrador tenga una sesión activa en Supabase.
         * Si la respuesta es exitosa, guarda los datos (información del pedido y productos) en el estado local.
         */
        const cargarDetalle = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            try {
                const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/pedidos/${id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                
                if (respuesta.ok) {
                    const json = await respuesta.json();
                    setDatos(json);
                }
            } catch (error) {
            } finally {
                setCargando(false);
            }
        };

        cargarDetalle();
    }, [id]);

    const API = process.env.EXPO_PUBLIC_API_URL || '';

    // Cuantas bolas de una linea ya estan impresas. Con la ultima del pedido, el pedido pasa a Completado.
    const cambiarHechas = async (prod: any, nuevas: number) => {
        const max = prod.cantidad || 1;
        const n = Math.max(0, Math.min(nuevas, max));
        const antes = prod.hechas || 0;
        const poner = (v: number, estado?: string) => setDatos((d: any) => ({
            ...d,
            pedido: estado ? { ...d.pedido, estado } : d.pedido,
            productos: d.productos.map((x: any) => x.id === prod.id ? { ...x, hechas: v } : x),
        }));
        poner(n);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API}/api/admin/lineas/${prod.id}/hechas`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ hechas: n }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
                poner(antes);
                Toast.show({ type: 'error', text1: traducirError(d.detail, 'No se pudo guardar') });
                return;
            }
            if (d.estado_pedido === 'Completado' && datos.pedido.estado !== 'Completado') {
                poner(n, 'Completado');
                Toast.show({ type: 'success', text1: 'Pedido completado', text2: 'Ya están hechas todas las bolas' });
            }
        } catch {
            poner(antes);
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    /**
     * Descarga un 3MF (una bola) o el zip de todo el pedido. Solo en la version web.
     * El archivo se genera al vuelo con el nombre que puso el cliente.
     */
    const descargar3mf = async (detalleId: string | null, nombreArchivo: string) => {
        if (Platform.OS !== 'web') {
            Toast.show({ type: 'info', text1: 'La descarga del 3MF solo funciona en la versión web' });
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const consulta = detalleId ? `?detalle=${encodeURIComponent(detalleId)}` : '';
            const res = await fetch(`${API}/api/admin/pedidos/${id}/3mf${consulta}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo generar el 3MF', text2: traducirError(e.detail, '') });
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = nombreArchivo; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        }
    };

    if (cargando) return <Text style={styles.mensajeEstado}>Cargando pedido...</Text>;
    if (!datos) return <Text style={styles.mensajeEstado}>Error al cargar el pedido (o no existe)</Text>;

    return (
        <ScrollView style={styles.contenedor}>
            <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#475569" /><Text style={styles.txtVolver}>Volver</Text></View>
            </Pressable>

            <Text style={styles.titulo}>Pedido de {etiquetaPedido(datos.usuario || datos.pedido.usuarios, datos.pedido.id, datos.numero)}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: -8, marginBottom: 12 }}>#{datos.pedido.id.slice(0,8).toUpperCase()}</Text>
            {datos.pedido.user_id ? (
                <Pressable
                    style={{ backgroundColor: '#eff6ff', borderColor: '#2563eb', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 }}
                    onPress={() => router.push(`/admin/usuarios/${datos.pedido.user_id}` as any)}
                >
                    <Text style={{ color: '#1d4ed8', fontWeight: 'bold' }}>Ver perfil de {(datos.usuario || datos.pedido.usuarios)?.nombre || 'usuario'}</Text>
                </Pressable>
            ) : null}
            <Text style={styles.totalInfo}>Importe Total: {euros(datos.pedido.total)}</Text>

            {datos.pedido.nota ? (
                <View style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 8 }}>
                    <Text style={{ fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>Nota del cliente</Text>
                    <Text style={{ color: '#78350f' }}>{datos.pedido.nota}</Text>
                </View>
            ) : null}

            <Pressable
                style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginVertical: 10 }}
                onPress={() => descargar3mf(null, `pedido_${String(datos.pedido.id).slice(0, 8)}_3mf.zip`)}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar todos los 3MF (zip)</Text>
            </Pressable>

            <Text style={styles.subtitulo}>Productos:</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {datos.productos && datos.productos.map((prod: any, index: number) => {
                const nombrada = !!prod.personalizacion && prod.personalizacion !== 'Sin texto';
                const hecha = (prod.hechas || 0) >= (prod.cantidad || 1);

                return (
                    <View key={index} style={{ flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, width: 380, maxWidth: '100%' }}>
                        {nombrada ? (
                            <Image
                                source={{ uri: `${API}/api/preview?modelo=${encodeURIComponent(prod.modelo)}&nombre=${encodeURIComponent(prod.personalizacion)}` }}
                                style={{ width: 110, height: 110, backgroundColor: '#fff', borderRadius: 8 }}
                                resizeMode="contain"
                            />
                        ) : null}

                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{prod.productos.nombre}</Text>
                            <Text style={styles.txtNormalSecundario}>{prod.modelo} · <Text style={styles.txtBold}>{prod.color}</Text></Text>
                            <Text style={styles.txtNormalSecundario}>Cantidad <Text style={styles.txtBold}>{prod.cantidad || 1}</Text> · <Text style={styles.txtBold}>{euros(prod.precio_unitario)}</Text></Text>

                            {nombrada ? (
                                <View style={styles.badgePersonalizado}>
                                    <Text style={styles.txtBadge}>"{prod.personalizacion}"</Text>
                                </View>
                            ) : (
                                <Text style={styles.txtNormal}>Sin personalizar</Text>
                            )}

                            {nombrada ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                    <Pressable
                                        onPress={() => cambiarHechas(prod, hecha ? 0 : (prod.cantidad || 1))}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: hecha }}
                                        accessibilityLabel="Bola hecha"
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    >
                                        <Ionicons name={hecha ? 'checkbox' : 'square-outline'} size={22} color={hecha ? '#15803d' : '#94a3b8'} />
                                        <Text style={styles.txtNormalSecundario}>Hecha</Text>
                                    </Pressable>
                                    {(prod.hechas || 0) > 0 && !hecha ? (
                                        <Text style={styles.txtNormalSecundario}>{prod.hechas} de {prod.cantidad}</Text>
                                    ) : null}
                                    <Pressable
                                        style={{ backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
                                        onPress={() => descargar3mf(prod.id, `${String(prod.modelo).replace(/[^A-Za-z0-9]+/g, '_')}_${String(prod.personalizacion).replace(/[^A-Za-z0-9]+/g, '_')}.3mf`)}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>3MF</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                    </View>
                );
            })}
            </View>
        </ScrollView>
    );
}