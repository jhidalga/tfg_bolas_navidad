import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminDetallePedido/adminDetallePedido.styles';

export default function DetallesPedidoAdmin() {
    const { id } = useLocalSearchParams(); 
    const router = useRouter();
    const [datos, setDatos] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
         /* busca la informacion del pedido usando su id */ 
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
                console.error(error);
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

            <Text style={styles.titulo}>Detalles del Pedido #{datos.pedido.id}</Text>
            <Text style={styles.totalInfo}>Importe Total: {datos.pedido.total}€</Text>

            <Text style={styles.subtitulo}>Detalles:</Text>
            
            {datos.productos && datos.productos.map((prod: any, index: number) => (
                <View key={index} style={styles.tarjetaProducto}>
                    <View style={styles.infoProducto}>
                        <Text style={styles.nombre}>Producto: {prod.productos.nombre}</Text>
                        <Text>Modelo: {prod.modelo}</Text>
                        <Text>Color: {prod.color}</Text>
                        <Text>Precio unitario: {prod.precio_unitario}€</Text>
                        
                        {prod.personalizacion ? (
                            <View style={styles.badgePersonalizado}>
                                <Text style={styles.txtBadge}>Personalizacion: "{prod.personalizacion}"</Text>
                            </View>
                        ) : (
                            <Text style={styles.txtNormal}>Sin personalizar</Text>
                        )}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}