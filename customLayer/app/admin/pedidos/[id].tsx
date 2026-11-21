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

            <Text style={styles.titulo}>Detalles del Pedido #{datos.pedido.id.slice(0,8).toUpperCase()}</Text>
            <Text style={styles.totalInfo}>Importe Total: {euros(datos.pedido.total)}</Text>

            <Pressable
                style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start', marginVertical: 10 }}
                onPress={() => descargar3mf(null, `pedido_${String(datos.pedido.id).slice(0, 8)}_3mf.zip`)}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar todos los 3MF (zip)</Text>
            </Pressable>

            <Text style={styles.subtitulo}>Productos:</Text>
            
            {datos.productos && datos.productos.map((prod: any, index: number) => {
                const modeloAsociado = prod.productos?.modelos?.find((m: any) => m.nombre === prod.modelo);
                const imagenUri = modeloAsociado?.imagen;

                return (
                    <View key={index} style={styles.tarjetaProducto}>
                        {imagenUri ? (
                            <Image source={{ uri: imagenUri }} style={styles.imagenProducto} />
                        ) : (
                            <View style={styles.placeholderImagen} />
                        )}
                        
                        <View style={styles.infoProducto}>
                            <Text style={styles.nombre}>{prod.productos.nombre}</Text>
                            <Text style={styles.txtNormalSecundario}>Modelo: <Text style={styles.txtBold}>{prod.modelo}</Text></Text>
                            <Text style={styles.txtNormalSecundario}>Color: <Text style={styles.txtBold}>{prod.color}</Text></Text>
                            <Text style={styles.txtNormalSecundario}>Cantidad: <Text style={styles.txtBold}>{prod.cantidad || 1}</Text></Text>
                            <Text style={styles.txtNormalSecundario}>Precio unitario: <Text style={styles.txtBold}>{euros(prod.precio_unitario)}</Text></Text>
                            
                            {prod.personalizacion && prod.personalizacion !== 'Sin texto' ? (
                                <View style={styles.badgePersonalizado}>
                                    <Text style={styles.txtBadge}>Personalización: "{prod.personalizacion}"</Text>
                                </View>
                            ) : (
                                <Text style={styles.txtNormal}>Sin personalizar</Text>
                            )}

                            {prod.personalizacion && prod.personalizacion !== 'Sin texto' ? (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={styles.txtNormalSecundario}>Así saldrá el 3D:</Text>
                                    <Image
                                        source={{ uri: `${API}/api/preview?modelo=${encodeURIComponent(prod.modelo)}&nombre=${encodeURIComponent(prod.personalizacion)}` }}
                                        style={{ width: 200, height: 200, backgroundColor: '#fff', borderRadius: 8, marginTop: 6 }}
                                        resizeMode="contain"
                                    />
                                    <Pressable
                                        style={{ backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' }}
                                        onPress={() => descargar3mf(prod.id, `${String(prod.modelo).replace(/[^A-Za-z0-9]+/g, '_')}_${String(prod.personalizacion).replace(/[^A-Za-z0-9]+/g, '_')}.3mf`)}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Descargar 3MF</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}