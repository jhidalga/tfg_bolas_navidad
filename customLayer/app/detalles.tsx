import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { styles } from '../styles/detalles/detalles.styles';
import Navbar from '@/componentes/navbar';
import { supabase } from '../lib/supabase';

/**
 * Pantalla de detalles de un producto específico.
 * Recupera el identificador del producto mediante parámetros de ruta (Expo Router)
 * y obtiene su información detallada desde la API. 
 * Permite al usuario interactuar seleccionando el modelo, el color, la cantidad 
 * y añadiendo un texto de personalización antes de agregarlo al carrito.
 * * @returns Componente principal que renderiza la vista de detalles del producto.
 */
export default function DetallesProducto() {
    const { id } = useLocalSearchParams();
    const [producto, setProducto] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [agregando, setAgregando] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    
    const insets = useSafeAreaInsets();
    const { width, height } = Dimensions.get('window');
    const esHorizontal = width > height;
    
    const [modelo, setModelo] = useState('');
    const [color, setColor] = useState('');
    const [personalizacion, setPersonalizacion] = useState('');

    useEffect(() => {
        const cargarDetalles = async () => {
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProducto(data);
                    setModelo(data.modelos?.[0]?.id || '');
                    setColor(data.colores?.[0] || '');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setCargando(false);
            }
        };
        if (id) {
            cargarDetalles();
        }
    }, [id]);

    if (cargando) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                <Navbar />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </View>
        );
    }

    if (!producto) return null;

    const modeloSeleccionado = producto.modelos?.find((m: any) => m.id === modelo);
    const imagenAMostrar = modeloSeleccionado?.imagen;

    const extraPersonalizacion = (producto.personalizable && personalizacion.trim() !== '') ? (producto.precio_personalizacion || 0) : 0;
    const precioTotal = (producto.precio + extraPersonalizacion).toFixed(2);

    /**
     * Procesa la adición del producto configurado al carrito.
     * Verifica que el usuario tenga sesión iniciada, construye el objeto de datos
     * con el modelo, color, cantidad y personalización elegida, y lo envía a la API.
     * Muestra notificaciones (Toast) con el resultado de la operación.
     */
    const agregarAlCarrito = async () => {
        try {
            setAgregando(true);
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                Toast.show({
                    type: 'error',
                    text1: 'Atención',
                    text2: 'Debes iniciar sesión para añadir productos al carrito.'
                });
                setAgregando(false);
                return;
            }

            const itemCarrito = {
                producto_id: producto.id,
                modelo_id: modelo,
                modelo: modeloSeleccionado?.nombre || 'Unico',
                color: color || 'Unico',
                personalizacion: personalizacion || 'Sin texto',
                cantidad: cantidad
            };

            const apiUrl = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;
            const response = await fetch(`${apiUrl}/carrito`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemCarrito)
            });

            if (response.ok) {
                Toast.show({
                    type: 'success',
                    text1: '¡Añadido!',
                    text2: 'Producto añadido al carrito correctamente.'
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Error al añadir al carrito.'
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error de red',
                text2: 'No se pudo conectar con el servidor.'
            });
        } finally {
            setAgregando(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <Navbar />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[
                    styles.contenedor, 
                    { paddingBottom: insets.bottom + 40 },
                    esHorizontal && styles.contenedorHorizontal
                ]}>
                    <View style={[styles.bloqueImagen, esHorizontal && styles.bloqueImagenHorizontal]}>
                        <Image 
                            source={{ uri: imagenAMostrar }} 
                            style={styles.imagenPrincipal} 
                            resizeMode="cover"
                        />
                    </View>
                    <View style={[styles.bloqueInfo, esHorizontal && styles.bloqueInfoHorizontal]}>
                        <View style={styles.cabeceraInfo}>
                            <Text style={styles.nombreProducto}>{producto.nombre}</Text>
                            <View style={styles.contenedorPrecio}>
                                <Text style={styles.precioValor}>{precioTotal} €</Text>
                            </View>
                        </View>
                        
                        {producto.descripcion ? (
                            <Text style={styles.descripcion}>{producto.descripcion}</Text>
                        ) : null}

                        <View style={styles.divisor} />
                        <View style={styles.seccionOpciones}>
                            {producto.modelos && producto.modelos.length > 0 && (
                                <View style={styles.opcionContainer}>
                                    <Text style={styles.tituloOpcion}>Seleccionar Modelo</Text>
                                    <View style={styles.pickerCard}>
                                        <Picker
                                            selectedValue={modelo}
                                            onValueChange={(val) => setModelo(val)}
                                            style={styles.picker}
                                        >
                                            {producto.modelos.map((m: any) => (
                                                <Picker.Item key={m.id} label={m.nombre} value={m.id} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            )}
                            {producto.colores && producto.colores.length > 0 && (
                                <View style={styles.opcionContainer}>
                                    <Text style={styles.tituloOpcion}>Color disponible</Text>
                                    <View style={styles.pickerCard}>
                                        <Picker
                                            selectedValue={color}
                                            onValueChange={(val) => setColor(val)}
                                            style={styles.picker}
                                        >
                                            {producto.colores.map((c: string) => (
                                                <Picker.Item key={c} label={c} value={c} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            )}
                            {producto.personalizable && (
                                <View style={styles.opcionContainer}>
                                    <Text style={styles.tituloOpcion}>
                                        Personalización {producto.precio_personalizacion ? `(+${producto.precio_personalizacion}€)` : ''}
                                    </Text>
                                    <TextInput
                                        style={styles.inputPersonalizado}
                                        placeholder="Escribe el nombre o frase aquí..."
                                        value={personalizacion}
                                        onChangeText={setPersonalizacion}
                                        placeholderTextColor="#adb5bd"
                                    />
                                </View>
                            )}
                        </View>
                        <View style={styles.opcionContainer}>
                            <Text style={styles.tituloOpcion}>Cantidad</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 12, width: 120, overflow: 'hidden' }}>
                                <TouchableOpacity 
                                    style={{ padding: 15, backgroundColor: '#f8f9fa' }} 
                                    onPress={() => setCantidad(Math.max(1, cantidad - 1))}
                                >
                                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
                                </TouchableOpacity>
                                
                                <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>{cantidad}</Text>
                                
                                <TouchableOpacity 
                                    style={{ padding: 15, backgroundColor: '#f8f9fa' }} 
                                    onPress={() => setCantidad(cantidad + 1)}
                                >
                                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.contenedorAcciones}>
                            <TouchableOpacity 
                                style={[styles.botonCompra, agregando && { opacity: 0.7 }]} 
                                onPress={agregarAlCarrito}
                                disabled={agregando}
                            >
                                <Text style={styles.textoBoton}>
                                    {agregando ? 'Procesando...' : 'Añadir al carrito'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.notaPago}>
                            <Text style={styles.textoNota}>
                                Pago en efectivo al recoger o por adelantado al profesorado.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}