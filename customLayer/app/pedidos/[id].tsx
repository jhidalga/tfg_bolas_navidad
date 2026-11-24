import { etiquetaPedido } from '../../lib/etiquetaPedido';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { styles as estilosEscritorio } from '../../styles/adminDetallePedido/adminDetallePedido.styles';
import { styles as estilosMovil } from '../../styles/adminDetallePedido/adminDetallePedido.styles.movil';
import { useEstilos } from '../../lib/responsive';
import { euros } from '../../lib/formato';
import Navbar from '@/componentes/navbar';
import { tc } from '../../lib/tema';
import Toast from 'react-native-toast-message';
import { useConfirmar } from '../../componentes/confirmar';

/**
 * Pantalla de detalles de un pedido específico.
 * Muestra la información completa de una transacción usando su identificador único (ID).
 * Desglosa el importe total y muestra una lista con la información detallada de cada 
 * producto comprado (modelo, color, cantidad, precio unitario y personalización).
 * * @returns Componente principal que renderiza la vista de detalles del pedido.
 */
// Colores de Navidad solo para esta pantalla de cliente (los estilos se comparten con el admin)
const t = {
    contenedor: { backgroundColor: 'transparent' },
    btn: { backgroundColor: tc('#fbf1de') },
    txtVolver: { color: tc('#3b1a12') },
    titulo: { color: tc('#fff7ea') },
    total: { color: tc('#f1cf8a') },
    sub: { color: tc('#fff7ea') },
    msg: { color: tc('#e3cfa5') },
    tarjeta: { backgroundColor: tc('#fbf1de') },
};

export default function DetallesPedidoAdmin() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const { id } = useLocalSearchParams(); 
    const router = useRouter();
    const [datos, setDatos] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [anulando, setAnulando] = useState(false);
    const { confirmar, dialogo } = useConfirmar();

    useEffect(() => {
        /**
         * Recupera desde la API la información completa del pedido actual.
         * Utiliza el ID obtenido de los parámetros de la URL y requiere 
         * que el usuario tenga una sesión activa.
         */
        const cargarDetalle = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
                return;
            }
            
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

    /** Anula el pedido si sigue Pendiente. La API vuelve a comprobarlo. */
    const anular = async () => {
        if (!(await confirmar('¿Seguro que quieres anular este pedido? No se puede deshacer.', 'Anular pedido'))) return;
        await anularSinPreguntar();
    };

    const anularSinPreguntar = async () => {
        setAnulando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/login'); return; }
            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/pedidos/${id}/anular`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (respuesta.ok) {
                setDatos((d: any) => ({ ...d, pedido: { ...d.pedido, estado: 'Cancelado' } }));
                Toast.show({ type: 'success', text1: 'Pedido anulado' });
            } else {
                const e = await respuesta.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo anular', text2: e.detail || 'Inténtalo de nuevo.' });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setAnulando(false);
        }
    };

    /** Quita una bola. Si es la última, se anula el pedido entero. */
    const quitar = async (prod: any) => {
        const varias = Number(prod.cantidad || 1) > 1;
        const ultima = !varias && (datos.productos || []).length <= 1;
        const mensaje = ultima
            ? 'Es la última bola del pedido. Si la quitas, el pedido se anula. ¿Seguro?'
            : varias ? `¿Seguro que quieres quitar 1 unidad de ${prod.modelo}${prod.personalizacion && prod.personalizacion !== 'Sin texto' ? ' "' + prod.personalizacion + '"' : ''}?`
            : `¿Seguro que quieres quitar ${prod.modelo}${prod.personalizacion && prod.personalizacion !== 'Sin texto' ? ' "' + prod.personalizacion + '"' : ''} del pedido?`;
        if (!(await confirmar(mensaje, ultima ? 'Anular pedido' : 'Quitar'))) return;
        if (ultima) { await anularSinPreguntar(); return; }
        setAnulando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/login'); return; }
            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/pedidos/${id}/detalles/${prod.id}/quitar`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (respuesta.ok) {
                const r = await respuesta.json();
                setDatos((d: any) => ({ ...d, pedido: { ...d.pedido, estado: r.estado || d.pedido.estado, total: r.total ?? d.pedido.total }, productos: varias ? d.productos.map((x: any) => x.id === prod.id ? { ...x, cantidad: Number(x.cantidad || 1) - 1 } : x) : d.productos.filter((x: any) => x.id !== prod.id) }));
                Toast.show({ type: 'success', text1: varias ? 'Unidad quitada' : 'Bola quitada' });
            } else {
                const e = await respuesta.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo quitar', text2: e.detail || 'Inténtalo de nuevo.' });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setAnulando(false);
        }
    };

    if (cargando) return <View style={{ flex: 1 }}><Navbar /><Text style={[styles.mensajeEstado, t.msg]}>Cargando pedido...</Text></View>;
    if (!datos) return (
        <View style={{ flex: 1 }}>
            <Navbar />
            <Text style={[styles.mensajeEstado, t.msg]}>No se ha podido cargar el pedido. Puede que no exista o que no sea tuyo.</Text>
            <Pressable onPress={() => router.replace('/pedidos')} style={[styles.btnVolver, t.btn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color={tc("#3b1a12")} /><Text style={[styles.txtVolver, t.txtVolver]}>Ir a mis pedidos</Text></View>
            </Pressable>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
        <Navbar />
        <ScrollView style={[styles.contenedor, t.contenedor]} contentContainerStyle={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
            <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/pedidos'); }} style={[styles.btnVolver, t.btn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color={tc("#3b1a12")} /><Text style={[styles.txtVolver, t.txtVolver]}>Volver</Text></View>
            </Pressable>

            <Text style={[styles.titulo, t.titulo]}>Pedido de {etiquetaPedido(datos.usuario || datos.pedido.usuarios, datos.pedido.id, datos.numero)}</Text>
            <Text style={[styles.totalInfo, t.total]}>Importe Total: {euros(datos.pedido.total)}</Text>

            <View style={{ backgroundColor: tc('#fbf1de'), borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 14 }}>
                <Text style={{ fontWeight: 'bold', color: tc('#3b1a12'), fontSize: 16 }}>Estado: {datos.pedido.estado}</Text>
                {datos.pedido.estado === 'Pendiente' && !datos.pedido.pagado ? (
                    <>
                        <Text style={{ color: tc('#6b4a3a'), marginTop: 6 }}>Puedes anular el pedido mientras esté Pendiente. Cuando se complete ya no se podrá.</Text>
                        <Pressable onPress={() => !anulando && anular()} style={{ backgroundColor: tc('#a52a2a'), paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, opacity: anulando ? 0.6 : 1 }}>
                            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{anulando ? 'Anulando...' : 'Anular pedido'}</Text>
                        </Pressable>
                    </>
                ) : (
                    <Text style={{ color: tc('#6b4a3a'), marginTop: 6 }}>
                        {datos.pedido.estado === 'Completado' ? 'Tu pedido ya está completado e impreso, no se puede anular.'
                            : datos.pedido.estado === 'Entregado' ? 'Tu pedido ya está entregado, no se puede anular.'
                            : datos.pedido.estado === 'Cancelado' ? 'Este pedido está anulado.'
                            : datos.pedido.pagado ? 'Este pedido ya está pagado, no se puede anular.'
                            : 'Este pedido ya no se puede anular.'}
                    </Text>
                )}
            </View>

            <Text style={[styles.subtitulo, t.sub]}>Productos:</Text>
            
            {datos.productos && datos.productos.map((prod: any, index: number) => {
                const modeloAsociado = prod.productos?.modelos?.find((m: any) => m.nombre === prod.modelo);
                const imagenUri = modeloAsociado?.imagen;

                return (
                    <View key={index} style={[styles.tarjetaProducto, t.tarjeta]}>
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
                            {datos.pedido.estado === 'Pendiente' && !datos.pedido.pagado && (
                                <Pressable onPress={() => !anulando && quitar(prod)} style={{ alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: tc('#a52a2a'), borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, opacity: anulando ? 0.6 : 1 }}>
                                    <Text style={{ color: tc('#a52a2a'), fontWeight: 'bold', fontSize: 13 }}>{Number(prod.cantidad || 1) > 1 ? 'Quitar 1 unidad' : 'Quitar del pedido'}</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                );
            })}
        </ScrollView>
        {dialogo}
        </View>
    );
}