import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import Navbar from '@/componentes/navbar';
import { styles } from '../styles/carrito/carrito.styles';
import { supabase } from '../lib/supabase';

interface ItemCarrito {
    id: string; 
    producto_id: string;
    modelo_id: string;
    color: string;
    personalizacion: string; 
    modelos: {
        nombre: string;
        imagen: string;
    };
    productos: {
        nombre: string;
        precio: number;
    };
}

export default function PantallaCarrito() {
    const insets = useSafeAreaInsets();
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [cargando, setCargando] = useState(true);
    const apiUrl = 'http://192.168.0.25:8000/api';

    useFocusEffect(
        useCallback(() => {
            cargarCarrito();
        }, [])
    );

    const cargarCarrito = async () => {
        setCargando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setCargando(false);
                return;
            }
            const response = await fetch(`${apiUrl}/carrito`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCarrito(data);
            }
        } catch (error) {
            console.error("Error al cargar el carrito:", error);
        } finally {
            setCargando(false);
        }
    };

    const eliminarProducto = async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const response = await fetch(`${apiUrl}/carrito/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (response.ok) {
                setCarrito((prevCarrito) => prevCarrito.filter(item => item.id !== id));
                Toast.show({
                    type: 'success',
                    text1: 'Eliminado',
                    text2: 'Producto retirado del carrito.'
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo eliminar el producto.'
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Problema de conexión al eliminar.'
            });
        }
    };

    const totalCarrito = carrito.reduce((suma, item) => suma + Number(item.productos.precio), 0);

    const crearPedido = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Toast.show({
                    type: 'error',
                    text1: 'Atención',
                    text2: 'Debes iniciar sesión para realizar un pedido.'
                });
                return;
            } else {
                const response = await fetch(`${apiUrl}/pedidos/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ total: totalCarrito })
                });
                if (response.ok) {
                    const data = await response.json();
                    Toast.show({
                        type: 'success',
                        text1: '¡Pedido creado con éxito!',
                        text2: `ID del pedido: ${data.pedido_id}`
                    });
                    setCarrito([]);
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Error al crear el pedido.'
                    });
                }
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo conectar con el servidor.'
            });
        }
    };

    return (
        <View style={styles.pagina}>
            <Navbar />
            <View style={[styles.contenedorPrincipal, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={styles.tituloCentral}>Tu Carrito ({carrito.length})</Text>
                {cargando ? (
                    <View style={styles.cargandoContenedor}>
                        <ActivityIndicator size="large" color="#3f37c9" />
                        <Text style={{ marginTop: 10, color: '#666' }}>Cargando carrito...</Text>
                    </View>
                ) : carrito.length === 0 ? (
                    <Text style={styles.textoVacio}>Tu carrito está vacío.</Text>
                ) : (
                    <FlatList
                        data={carrito}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.tarjetaProducto}>
                                <Image
                                    source={{ uri: item.modelos?.imagen }}
                                    style={styles.imagenProducto}
                                />
                                
                                <View style={styles.infoContenedor}>
                                    <Text style={styles.nombreProducto}>{item.productos.nombre}</Text>
                                    <Text style={styles.textoDetalle}>
                                        Modelo: <Text style={styles.textoNegrita}>
                                            {(item.modelos?.nombre.toLowerCase() === 'base' || item.modelos?.nombre.toLowerCase() === 'unico') ? 'base' : item.modelos?.nombre}
                                        </Text>
                                    </Text>
                                    <Text style={styles.textoDetalle}>Color: <Text style={styles.textoNegrita}>{item.color}</Text></Text>
                                    
                                    {item.personalizacion !== 'Sin texto' && (
                                        <Text style={styles.textoPersonalizacion}>✨ "{item.personalizacion}"</Text>
                                    )}
                                </View>
                                <View style={styles.accionesContenedor}>
                                    <Text style={styles.precioProducto}>{item.productos.precio} €</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.botonEliminar} 
                                        onPress={() => eliminarProducto(item.id)}
                                    >
                                        <Text style={styles.textoEliminar}>Eliminar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListFooterComponent={() => (
                            <View style={styles.footerResumen}>
                                <Text style={styles.textoTotal}>Total: {totalCarrito.toFixed(2)} €</Text>
                                <TouchableOpacity style={styles.botonPagar} onPress={crearPedido}>
                                    <Text style={styles.textoBotonPagar}>Pedir</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}