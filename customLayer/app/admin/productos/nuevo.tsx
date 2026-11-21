import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { styles as estilosEscritorio } from '../../../styles/adminNuevoProducto/adminNuevoProducto.styles';
import { styles as estilosMovil } from '../../../styles/adminNuevoProducto/adminNuevoProducto.styles.movil';
import { useEstilos } from '../../../lib/responsive';
import Toast from 'react-native-toast-message';

/**
 * Pantalla de administración para la creación de un nuevo producto.
 * Gestiona un formulario que recopila los datos generales, la configuración 
 * de personalización, las variantes de color y la subida de una imagen inicial 
 * que actuará como modelo base del producto.
 * * @returns Componente que renderiza el formulario de creación de productos.
 */
export default function NuevoProductoAdmin() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [subiendo, setSubiendo] = useState(false);
    
    const [form, setForm] = useState({
        nombre: '', 
        descripcion: '', 
        precio: '', 
        precio_personalizacion: '',
        personalizable: false, 
        en_oferta: true,
        precio_anterior: '',
        imagen: ""
    });
    const [coloresTexto, setColoresTexto] = useState("");

    /**
     * Muestra una notificación emergente (Toast) y opcionalmente retrocede a la pantalla anterior.
     * * @param titulo - Título de la notificación.
     * @param mensaje - Cuerpo del mensaje descriptivo.
     * @param irAtras - Si es `true`, ejecuta `router.back()` al ocultarse la alerta.
     */
    const mostrarAlerta = (titulo: string, mensaje: string, irAtras = false) => {
        Toast.show({
            type: titulo.toLowerCase().includes('error') ? 'error' : 'success',
            text1: titulo,
            text2: mensaje,
            onHide: () => {
                if (irAtras) router.back();
            }
        });
    };

    /**
     * Abre la galería del dispositivo para seleccionar una imagen, la comprime, 
     * la convierte de Base64 a ArrayBuffer y la sube al bucket 'fotos_productos' en Supabase.
     */
    const seleccionarYSubirImagen = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, base64: true, quality: 0.8,
        });
        
        if (!result.canceled && result.assets[0].base64) {
            setSubiendo(true);
            try {
                const fileName = `prod_${Date.now()}.png`;
                const { error } = await supabase.storage.from('fotos_productos').upload(fileName, decode(result.assets[0].base64), { contentType: 'image/png' });
                if (error) throw error;
                
                const { data: { publicUrl } } = supabase.storage.from('fotos_productos').getPublicUrl(fileName);
                setForm({ ...form, imagen: publicUrl });
                mostrarAlerta("Imagen subida", "La imagen se ha cargado correctamente.");
            } catch (error) {
                mostrarAlerta("Error", "No se pudo subir la imagen.");
            } finally {
                setSubiendo(false);
            }
        }
    };

    /**
     * Valida los datos introducidos en el formulario y envía la petición a la API 
     * para crear el producto.
     */
    const crearProducto = async () => {
        if (!form.nombre || !form.precio || !form.imagen) {
            mostrarAlerta("Atención", "Nombre, precio e imagen son obligatorios.");
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        const arrayColores = coloresTexto.split(',').map(c => c.trim()).filter(c => c !== '');
        
        const payloadProducto = {
            nombre: form.nombre,
            descripcion: form.descripcion,
            precio: parseFloat(form.precio) || 0,
            precio_personalizacion: parseFloat(form.precio_personalizacion) || 0,
            personalizable: form.personalizable,
            en_oferta: form.en_oferta,
            precio_anterior: parseFloat(form.precio_anterior) || 0,
            colores: arrayColores
        };
        
        try {
            const resProd = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/productos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadProducto)
            });

            if (resProd.ok) {
                const productoCreado = await resProd.json();
                
                await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/productos/${productoCreado.id}/modelos`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: 'Base', imagen: form.imagen })
                });
                
                mostrarAlerta("Éxito", "Producto creado correctamente.", true);
            }
        } catch (error) {
            mostrarAlerta("Error", "Error al conectar con el servidor.");
        }
    };

    return (
        <View style={styles.pantalla}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Pressable style={styles.btnVolverWrapper} onPress={() => router.back()}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#3b82f6" /><Text style={styles.btnVolver}>Volver al catálogo</Text></View>
                </Pressable>

                <Text style={styles.tituloHeader}>Crear Nuevo Producto</Text>
                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Información General</Text>
                    
                    <View style={styles.filaInputs}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre del Producto *</Text>
                            <TextInput style={styles.input} value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} placeholder="Ej: Llavero 3D" />
                        </View>
                        <View style={[styles.inputGroup, styles.grupoPrecio]}>
                            <Text style={styles.label}>Precio (€) *</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                value={form.precio} 
                                onChangeText={t => setForm({...form, precio: t.replace(',', '.')})} 
                                placeholder="Ej: 15.50"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Descripción (Opcional)</Text>
                        <TextInput style={[styles.input, styles.inputMultiline]} multiline numberOfLines={3} value={form.descripcion} onChangeText={t => setForm({...form, descripcion: t})} placeholder="Detalles del producto..." />
                    </View>

                    <View style={[styles.inputGroup, { marginTop: 15 }]}>
                        <Text style={styles.label}>Colores disponibles (separados por coma)</Text>
                        <TextInput style={styles.input} value={coloresTexto} onChangeText={setColoresTexto} placeholder="Ej: Rojo, Azul, Verde, Negro" />
                    </View>
                </View>

                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Configuración</Text>
                    <View style={styles.switchBox}>
                        <Text style={styles.labelSwitch}>¿Permite texto personalizado?</Text>
                        <Pressable 
                            style={[styles.btnToggleSwitch, form.personalizable ? styles.btnOn : styles.btnOff]}
                            onPress={() => setForm({...form, personalizable: !form.personalizable})}
                        >
                            <Text style={[ form.personalizable ? styles.txtOn : styles.txtOff]}>
                                {form.personalizable ? "Sí" : "No"}
                            </Text>
                        </Pressable>
                    </View>
                    <View style={[styles.switchBox, { marginTop: 12 }]}>
                        <Text style={styles.labelSwitch}>¿En oferta?</Text>
                        <Pressable
                            style={[styles.btnToggleSwitch, form.en_oferta ? styles.btnOn : styles.btnOff]}
                            onPress={() => setForm({...form, en_oferta: !form.en_oferta})}
                        >
                            <Text style={[ form.en_oferta ? styles.txtOn : styles.txtOff]}>{form.en_oferta ? "Sí" : "No"}</Text>
                        </Pressable>
                    </View>
                    {form.en_oferta && (
                        <View style={[styles.inputGroup, { marginTop: 12 }]}>
                            <Text style={styles.label}>Precio de antes (€)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={form.precio_anterior}
                                onChangeText={t => setForm({...form, precio_anterior: t.replace(',', '.')})}
                                placeholder="Vacío: se enseña el doble del precio actual" />
                        </View>
                    )}
                </View>

                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Imagen del Modelo Base *</Text>
                    
                    <View style={styles.contenedorImagen}>
                        {form.imagen ? (
                            <Image source={{ uri: form.imagen }} style={styles.previewImagen} />
                        ) : (
                            <View style={styles.placeholderImagen}>
                                <Text style={{ color: '#94a3b8' }}>Sin imagen</Text>
                            </View>
                        )}
                        
                        <Pressable style={styles.btnSubirImagen} onPress={seleccionarYSubirImagen} disabled={subiendo}>
                            {subiendo ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Seleccionar Imagen</Text>
                            )}
                        </Pressable>
                    </View>
                </View>

                <Pressable style={styles.btnGuardarMain} onPress={crearProducto}>
                    <Text style={styles.txtBtnGuardarMain}>Crear Producto</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}