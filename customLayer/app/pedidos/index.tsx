import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Navbar from '../../componentes/navbar'; 
import { supabase } from '../../lib/supabase';
import { styles } from '../../styles/pedidos/pedidos.styles';

export default function MisPedidos() {
    const router = useRouter();
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarMisPedidos();
    }, []);

    const cargarMisPedidos = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.replace('/login');
                return;
            }

            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/pedidos/usuario`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                setPedidos(datos);
            }
        } catch (error) {
            console.error("Error al cargar pedidos:", error);
        } finally {
            setCargando(false);
        }
    };

    const getEstilosBadge = (estado: string) => {
        switch (estado) {
            case 'Cancelado': return { bg: styles.bgRojo, txt: styles.txtRojo };
            case 'Completado': return { bg: styles.bgAzul, txt: styles.txtAzul };
            case 'Entregado': return { bg: styles.bgVerde, txt: styles.txtVerde };
            default: return { bg: styles.bgAmbar, txt: styles.txtAmbar }; // Pendiente
        }
    };

    return (
        <View style={styles.contenedorPantalla}>
            <Navbar />
            
            <View style={styles.cabeceraPrincipal}>
                <Text style={styles.tituloHeader}>Mis Pedidos</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {cargando ? (
                    <View style={styles.estadoVacio}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text style={styles.txtEstadoVacio}>Cargando tus pedidos...</Text>
                    </View>
                ) : pedidos.length === 0 ? (
                    <View style={styles.estadoVacio}>
                        <Text style={styles.txtEstadoVacio}>Aún no has realizado ningún pedido.</Text>
                    </View>
                ) : (
                    <View style={styles.gridTarjetas}>
                        {pedidos.map(pedido => {
                            const badge = getEstilosBadge(pedido.estado);
                            return (
                                <View key={pedido.id} style={styles.tarjeta}>
                                    <Pressable 
                                        style={styles.tarjetaInfo}
                                        onPress={() => router.push(`/pedidos/${pedido.id}` as any)}
                                    >
                                        <View style={styles.filaTop}>
                                            <Text style={styles.idPedido}>#{pedido.id.slice(0, 8).toUpperCase()}</Text>
                                            <View style={[styles.badgeEstado, badge.bg]}>
                                                <Text style={[styles.txtBadgeEstado, badge.txt]}>
                                                    {pedido.estado}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.datosCliente}>
                                            <Text style={styles.txtDato}>
                                                Fecha: {new Date(pedido.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        
                                        <Text style={styles.precioTotal}>{pedido.total} €</Text>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
