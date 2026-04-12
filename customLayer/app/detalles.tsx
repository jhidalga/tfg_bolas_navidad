import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '../styles/detalles/detalles.styles';
import Navbar from '@/componentes/navbar';

export default function DetallesProducto() {
    const { productoData } = useLocalSearchParams();
    const producto = productoData ? JSON.parse(productoData as string) : null;
    
    const insets = useSafeAreaInsets();
    const { width, height } = Dimensions.get('window');
    const esHorizontal = width > height;

    const [modelo, setModelo] = useState(producto?.modelos?.[0]?.id || '');
    const [color, setColor] = useState(producto?.colores?.[0] || '');
    const [personalizacion, setPersonalizacion] = useState('');

    if (!producto) return null;

    const modeloSeleccionado = producto.modelos?.find((m: any) => m.id === modelo);
    const imagenAMostrar = modeloSeleccionado?.imagen || producto.imagen;

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Navbar />

            <ScrollView style={styles.pagina} contentContainerStyle={styles.contenidoScroll}>
                <View style={[
                    styles.contenedor, 
                    { paddingBottom: insets.bottom + 20 },
                    esHorizontal && styles.contenedorHorizontal
                ]}>
                    
                    <View style={[styles.bloqueImagen, esHorizontal && styles.bloqueImagenHorizontal]}>
                        <Image source={{ uri: imagenAMostrar }} style={styles.imagenPrincipal} />
                    </View>

                    <View style={[styles.bloqueInfo, esHorizontal && styles.bloqueInfoHorizontal]}>
                        <Text style={styles.labelCategoria}>Producto</Text>
                        <Text style={styles.nombreProducto}>{producto.nombre}</Text>
                        
                        <View style={styles.filaPrecio}>
                            <Text style={styles.moneda}>€</Text>
                            <Text style={styles.precioValor}>{producto.precio || '0'}</Text>
                        </View>

                        {producto.modelos && producto.modelos.length > 0 && (
                            <View style={styles.selectorContainer}>
                                <Text style={styles.labelSelector}>Modelo</Text>
                                <View style={styles.pickerWrapper}>
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
                            <View style={styles.selectorContainer}>
                                <Text style={styles.labelSelector}>Color</Text>
                                <View style={styles.pickerWrapper}>
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
                            <View style={styles.selectorContainer}>
                                <Text style={styles.labelSelector}>Personalización (Nombre, frase...)</Text>
                                <TextInput
                                    style={styles.inputPersonalizado}
                                    placeholder="Escribe aquí los detalles..."
                                    value={personalizacion}
                                    onChangeText={setPersonalizacion}
                                    placeholderTextColor="#999"
                                />
                            </View>
                        )}

                        <TouchableOpacity style={styles.botonCompra}>
                            <Text style={styles.textoBoton}>Añadir al carrito</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}