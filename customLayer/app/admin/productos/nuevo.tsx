import { View, Text, TextInput, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { styles } from '../../../styles/adminNuevoProducto/adminNuevoProducto.styles';
import Toast from 'react-native-toast-message';

export default function NuevoProductoAdmin() {
    const router = useRouter();
    const [subiendo, setSubiendo] = useState(false);
    
    const [form, setForm] = useState({
        nombre: '', descripcion: '', precio: 0.0, personalizable: false, colores: [""], imagen:""
    });

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

    const crearProducto = async () => {
        if (!form.nombre || !form.precio || !form.imagen) {
            mostrarAlerta("Atención", "Nombre, precio e imagen son obligatorios.");
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const { imagen, ...datosProducto } = form;
        
        try {
            const resProd = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/productos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(datosProducto)
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
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                <Text style={styles.txtVolver}>⬅ Cancelar</Text>
            </Pressable>
            
            <Text style={styles.titulo}>Nuevo Producto</Text>
            
            <Text style={styles.label}>Nombre *</Text>
            <TextInput style={styles.input} value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} />
            
            <Text style={styles.label}>Precio (€) *</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={form.precio.toString()} onChangeText={t => setForm({...form, precio: parseFloat(t) || 0})} />
            
            <Pressable style={{ backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, marginVertical: 20 }} onPress={seleccionarYSubirImagen}>
                <Text style={{ color: 'white', textAlign: 'center' }}>{subiendo ? "Subiendo..." : " Subir Imagen"}</Text>
            </Pressable>
            
            {form.imagen ? <Image source={{ uri: form.imagen }} style={{ width: 100, height: 100, alignSelf: 'center', marginBottom: 20 }} /> : null}
            
            <Pressable style={{ backgroundColor: '#10b981', padding: 15, borderRadius: 10 }} onPress={crearProducto}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Guardar Producto</Text>
            </Pressable>
        </ScrollView>
    );
}