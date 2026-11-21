import React, { useState, useCallback } from 'react';
import PrecioOferta from '../componentes/precioOferta';
import { Ionicons } from '@expo/vector-icons';
import { useConfirmar } from '../componentes/confirmar';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import Navbar from '@/componentes/navbar';
import { styles as estilosEscritorio } from '../styles/carrito/carrito.styles';
import { styles as estilosMovil } from '../styles/carrito/carrito.styles.movil';
import { useEstilos } from '../lib/responsive';
import { supabase } from '../lib/supabase';

/**
 * Estructura de datos que representa un producto añadido al carrito.
 */
export interface ItemCarrito {
    /** Identificador único del registro en el carrito */
    id: string; 
    /** Identificador del producto genérico */
    producto_id: string;
    /** Identificador de la variante/modelo específico */
    modelo_id: string;
    /** Color seleccionado por el usuario */
    color: string;
    /** Texto de personalización (o 'Sin texto' si no se aplica) */
    personalizacion: string; 
    /** Datos anidados del modelo (nombre e imagen visual) */
    modelos: {
        nombre: string;
        imagen: string;
    };
    /** Datos anidados del producto (nombre y precios) */
    productos: {
        nombre: string;
        precio: number;
        precio_personalizacion?: number;
    };
    /** Cantidad de unidades solicitadas de este mismo producto */
    cantidad: number;
}

/**
 * Pantalla del Carrito de la Compra.
 * Permite al usuario visualizar los productos añadidos, revisar las personalizaciones,
 * ver el desglose de precios, eliminar productos no deseados y confirmar el pedido (Checkout).
 * * @returns Componente principal que renderiza la vista del carrito.
 */
export default function PantallaCarrito() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const insets = useSafeAreaInsets();
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [cargando, setCargando] = useState(true);
    const apiUrl = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

    useFocusEffect(
        useCallback(() => {
            cargarCarrito();
        }, [])
    );

    /**
     * Obtiene los productos del carrito del usuario autenticado conectándose a la API.
     * Actualiza el estado local con la respuesta o detiene la carga si no hay sesión activa.
     */
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

    /**
     * Elimina un producto específico del carrito a través de la API.
     * Si la operación es exitosa, lo retira visualmente de la lista local y muestra un aviso.
     * * @param id - Identificador único del registro en el carrito a eliminar.
     */
    const { confirmar, dialogo } = useConfirmar();

    const eliminarProducto = async (id: string) => {
        if (!(await confirmar('¿Quitar esta bola del carrito?', 'Quitar'))) return;
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

    /**
     * Calcula el precio unitario final de un artículo en el carrito.
     * Devuelve el precio base del producto. La personalización no tiene coste extra.
     * * @param item - Objeto con los datos del artículo en el carrito.
     * @returns Precio total por unidad (formato numérico).
     */
    const calcularPrecioItem = (item: ItemCarrito) => {
        // La personalización no se cobra aparte
        return Number(item.productos.precio);
    };

    const totalCarrito = carrito.reduce((suma, item) => suma + (calcularPrecioItem(item) * item.cantidad), 0);

    /**
     * Procesa la compra de los artículos actuales del carrito.
     * Envía la petición de 'checkout' a la API con el total calculado.
     * Si el pedido se crea correctamente, vacía el carrito local y muestra el ID del pedido.
     */
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
            {dialogo}
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
                                    <Text style={styles.textoDetalle}>Cantidad: <Text style={styles.textoNegrita}>{item.cantidad}</Text></Text>
                                    <Text style={styles.textoDetalle}>Color: <Text style={styles.textoNegrita}>{item.color}</Text></Text>
                                    
                                    {item.personalizacion !== 'Sin texto' && (
                                        <Text style={styles.textoPersonalizacion}> "{item.personalizacion}"</Text>
                                    )}
                                </View>
                                <View style={styles.accionesContenedor}>
                                    <PrecioOferta valor={calcularPrecioItem(item) * item.cantidad} estilo={styles.precioProducto} etiqueta={false} />
                                    
                                    <TouchableOpacity 
                                        style={styles.botonEliminar} 
                                        onPress={() => eliminarProducto(item.id)}
                                        accessibilityLabel="Quitar del carrito"
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#dc2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListFooterComponent={() => (
                            <View style={styles.footerResumen}>
                                <View style={{ marginBottom: 15 }}><PrecioOferta valor={totalCarrito} prefijo="Total:" estilo={[styles.textoTotal, { marginBottom: 0 }]} /></View>
                                <TouchableOpacity style={styles.botonPagar} onPress={crearPedido}>
                                    <Text style={styles.textoBotonPagar}>Realizar pedido</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}