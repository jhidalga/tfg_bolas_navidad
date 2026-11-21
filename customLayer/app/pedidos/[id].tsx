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

    useEffect(() => {
        /**
         * Recupera desde la API la información completa del pedido actual.
         * Utiliza el ID obtenido de los parámetros de la URL y requiere 
         * que el usuario tenga una sesión activa.
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

    if (cargando) return <View style={{ flex: 1 }}><Navbar /><Text style={[styles.mensajeEstado, t.msg]}>Cargando pedido...</Text></View>;
    if (!datos) return (
        <View style={{ flex: 1 }}>
            <Navbar />
            <Text style={[styles.mensajeEstado, t.msg]}>No se ha podido cargar el pedido. Puede que no exista.</Text>
            <Pressable onPress={() => router.replace('/pedidos')} style={[styles.btnVolver, t.btn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color={tc("#3b1a12")} /><Text style={[styles.txtVolver, t.txtVolver]}>Ir a mis pedidos</Text></View>
            </Pressable>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
        <Navbar />
        <ScrollView style={[styles.contenedor, t.contenedor]} contentContainerStyle={{ width: '100%', maxWidth: 900, alignSelf: 'center' }}>
            <Pressable onPress={() => router.back()} style={[styles.btnVolver, t.btn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color={tc("#3b1a12")} /><Text style={[styles.txtVolver, t.txtVolver]}>Volver</Text></View>
            </Pressable>

            <Text style={[styles.titulo, t.titulo]}>Detalles del Pedido #{datos.pedido.id.slice(0,8).toUpperCase()}</Text>
            <Text style={[styles.totalInfo, t.total]}>Importe Total: {euros(datos.pedido.total)}</Text>

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
                        </View>
                    </View>
                );
            })}
        </ScrollView>
        </View>
    );
}