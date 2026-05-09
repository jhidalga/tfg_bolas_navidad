import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminDetallePedido/adminDetallePedido.styles';

/**
 * Pantalla de administración para ver los detalles de un pedido específico.
 * Recupera la información completa de la transacción a través de la API usando 
 * el identificador (ID) de la URL. Muestra el importe total y una lista con 
 * el desglose de los productos comprados (modelo, color, cantidad, precio unitario y personalización).
 * * @returns Componente que renderiza la vista detallada del pedido para el administrador.
 */
export default function DetallesPedidoAdmin() {
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

    if (cargando) return <Text style={styles.mensajeEstado}>Cargando pedido...</Text>;
    if (!datos) return <Text style={styles.mensajeEstado}>Error al cargar el pedido (o no existe)</Text>;

    return (
        <ScrollView style={styles.contenedor}>
            <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                <Text style={styles.txtVolver}>⬅ Volver</Text>
            </Pressable>

            <Text style={styles.titulo}>Detalles del Pedido #{datos.pedido.id.slice(0,8).toUpperCase()}</Text>
            <Text style={styles.totalInfo}>Importe Total: {datos.pedido.total}€</Text>

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
                            <Text style={styles.txtNormalSecundario}>Precio unitario: <Text style={styles.txtBold}>{prod.precio_unitario}€</Text></Text>
                            
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
    );
}