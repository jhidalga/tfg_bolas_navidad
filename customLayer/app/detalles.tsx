import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { styles as estilosEscritorio } from '../styles/detalles/detalles.styles';
import { styles as estilosMovil } from '../styles/detalles/detalles.styles.movil';
import { useEstilos } from '../lib/responsive';
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
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const { id } = useLocalSearchParams();
    const [producto, setProducto] = useState<any>(null);
    const [cargando, setCargando] = useState(true);
    const [agregando, setAgregando] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    
    const insets = useSafeAreaInsets();
    const { width, height } = Dimensions.get('window');
    const esHorizontal = width > height;
    
    // Cada bola puede ser de un modelo distinto: un modelo por bola
    const [modeloBase, setModeloBase] = useState('');
    const [modelosSel, setModelosSel] = useState<string[]>(['']);
    const [color, setColor] = useState('');
    // Un nombre por cada bola: con cantidad 4 hay 4 campos
    const [personalizaciones, setPersonalizaciones] = useState<string[]>(['']);
    const [activo, setActivo] = useState(0);
    const textoActivo = personalizaciones[activo] ?? '';
    const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
    const [cargandoPrevia, setCargandoPrevia] = useState(false);

    useEffect(() => {
        const cargarDetalles = async () => {
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProducto(data);
                    const primero = data.modelos?.[0]?.id || '';
                    setModeloBase(primero);
                    setModelosSel((prev) => prev.map((m) => m || primero));
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

    useEffect(() => {
        setPersonalizaciones((prev) => Array.from({ length: cantidad }, (_, i) => prev[i] ?? ''));
        setModelosSel((prev) => Array.from({ length: cantidad }, (_, i) => prev[i] || prev[prev.length - 1] || modeloBase));
        setActivo((a) => Math.min(a, cantidad - 1));
    }, [cantidad]);

    const cambiarNombre = (i: number, valor: string) => {
        setPersonalizaciones((prev) => prev.map((t, k) => (k === i ? valor : t)));
    };

    const cambiarModelo = (i: number, valor: string) => {
        setModelosSel((prev) => prev.map((m, k) => (k === i ? valor : m)));
        setActivo(i);
    };

    const modelo = modelosSel[activo] || modeloBase;
    const nombreModelo = producto?.modelos?.find((m: any) => m.id === modelo)?.nombre;

    // Vista previa en vivo: espera 500 ms desde la ultima tecla y pide la imagen a la API
    useEffect(() => {
        const texto = textoActivo.trim();
        if (!producto?.personalizable || !texto || !nombreModelo) {
            setVistaPrevia(null);
            setCargandoPrevia(false);
            return;
        }
        setCargandoPrevia(true);
        const espera = setTimeout(() => {
            const base = `${process.env.EXPO_PUBLIC_API_URL || ''}/api/preview`;
            setVistaPrevia(`${base}?modelo=${encodeURIComponent(nombreModelo)}&nombre=${encodeURIComponent(texto)}`);
        }, 500);
        return () => clearTimeout(espera);
    }, [textoActivo, nombreModelo, producto]);

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

    // La personalizacion no se cobra aparte: el precio es el de la bola por la cantidad
    const precioTotal = (producto.precio * cantidad).toFixed(2);

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

            const apiUrl = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;
            let fallos = 0;
            // Cada bola es una figura distinta: un elemento del carrito por bola, con su nombre
            for (let i = 0; i < cantidad; i++) {
                const modeloBola = producto.modelos?.find((m: any) => m.id === (modelosSel[i] || modeloBase));
                const itemCarrito = {
                    producto_id: producto.id,
                    modelo_id: modeloBola?.id || modeloBase,
                    modelo: modeloBola?.nombre || 'Unico',
                    color: color || 'Unico',
                    personalizacion: (personalizaciones[i] || '').trim() || 'Sin texto',
                    cantidad: 1
                };
                const response = await fetch(`${apiUrl}/carrito`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(itemCarrito)
                });
                if (!response.ok) fallos++;
            }

            if (fallos === 0) {
                Toast.show({
                    type: 'success',
                    text1: '¡Añadido!',
                    text2: cantidad > 1 ? `${cantidad} bolas añadidas al carrito.` : 'Producto añadido al carrito correctamente.'
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
                    { paddingBottom: insets.bottom + 110 },
                    esHorizontal && styles.contenedorHorizontal
                ]}>
                    <View style={[styles.bloqueImagen, esHorizontal && styles.bloqueImagenHorizontal]}>
                        <Image 
                            source={{ uri: vistaPrevia || imagenAMostrar }} 
                            style={styles.imagenPrincipal} 
                            resizeMode={vistaPrevia ? 'contain' : 'cover'}
                            onLoadEnd={() => setCargandoPrevia(false)}
                            onError={() => setVistaPrevia(null)}
                        />
                        {cargandoPrevia && (
                            <View style={{ position: 'absolute', top: 12, right: 12 }}>
                                <ActivityIndicator size="small" color="#3b82f6" />
                            </View>
                        )}
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
                            {Array.from({ length: cantidad }, (_, i) => (
                                <View key={i} style={[styles.opcionContainer, cantidad > 1 && { padding: 12, borderWidth: 1, borderColor: i === activo ? '#3b82f6' : '#e5e7eb', borderRadius: 10 }]}>
                                    {cantidad > 1 && <Text style={styles.tituloOpcion}>Bola {i + 1}</Text>}
                                    {producto.modelos && producto.modelos.length > 0 && (
                                        <>
                                            <Text style={styles.tituloOpcion}>Seleccionar Modelo</Text>
                                            <View style={styles.pickerCard}>
                                                <Picker
                                                    selectedValue={modelosSel[i] || modeloBase}
                                                    onValueChange={(val) => cambiarModelo(i, val)}
                                                    style={styles.picker}
                                                >
                                                    {producto.modelos.map((m: any) => (
                                                        <Picker.Item key={m.id} label={m.nombre} value={m.id} />
                                                    ))}
                                                </Picker>
                                            </View>
                                        </>
                                    )}
                                    {producto.personalizable && (
                                        <>
                                            <Text style={[styles.tituloOpcion, { marginTop: 8 }]}>Personalización</Text>
                                            <TextInput
                                                style={styles.inputPersonalizado}
                                                placeholder={cantidad > 1 ? `Nombre de la bola ${i + 1}...` : 'Escribe el nombre o frase aquí...'}
                                                value={personalizaciones[i] ?? ''}
                                                onChangeText={(v) => cambiarNombre(i, v)}
                                                onFocus={() => setActivo(i)}
                                                placeholderTextColor="#adb5bd"
                                            />
                                        </>
                                    )}
                                </View>
                            ))}
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