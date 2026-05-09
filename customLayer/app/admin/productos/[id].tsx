import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { styles } from '../../../styles/adminDetalleProducto/adminDetalleProducto.styles';
import Toast from 'react-native-toast-message';

/**
 * Pantalla de administración para editar un producto existente.
 * Permite modificar los datos generales (nombre, precio), los estados booleanos 
 * (visibilidad, disponibilidad, personalización) y gestionar de forma avanzada 
 * los "Modelos" o variantes asociadas al producto, permitiendo crearlos, editarlos o eliminarlos en bloque.
 * * @returns Componente interactivo para la gestión profunda de un producto.
 */
export default function DetalleProductoAdmin() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [form, setForm] = useState({ nombre: '', precio: 0.0, precio_personalizacion: 0.0, deshabilitado: false, oculto: false, personalizable: false });
    const [modelos, setModelos] = useState<any[]>([]);
    const [nuevosModelos, setNuevosModelos] = useState<any[]>([]);
    const [seleccionados, setSeleccionados] = useState<string[]>([]);

    useEffect(() => { cargarProducto(); }, [id]);

    const triggerToast = (mensaje: string, tipo = 'success') => {
        Toast.show({ type: tipo, text1: mensaje });
    };

    /**
     * Recupera la información del producto actual desde la API, incluyendo sus variantes/modelos.
     * Rellena el estado del formulario con los datos obtenidos.
     */
    const cargarProducto = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/productos/${id}?incluir_ocultos=true`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
            const datos = await res.json();
            setForm({
                nombre: datos.nombre,
                precio: datos.precio,
                precio_personalizacion: datos.precio_personalizacion || 0.0,
                deshabilitado: datos.deshabilitado,
                oculto: datos.oculto,
                personalizable: datos.personalizable
            });
            setModelos(datos.modelos || []);
            setCargando(false);
        }
    };

    /**
     * Guarda los cambios aplicados en la sección de "Información General" y "Configuración".
     * Realiza una petición PATCH a la API con los nuevos datos.
     */
    const guardarDatosPrincipales = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/productos/${id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            triggerToast("Producto actualizado correctamente");
        } else {
            triggerToast("Error al actualizar el producto", "error");
        }
    };

    /**
     * Agrega o quita el identificador de un modelo al array de elementos seleccionados,
     * utilizado para el borrado múltiple.
     * * @param idMod - Identificador único del modelo de producto.
     */
    const toggleSeleccion = (idMod: string) => {
        setSeleccionados(prev => prev.includes(idMod) ? prev.filter(i => i !== idMod) : [...prev, idMod]);
    };

    /**
     * Elimina de la base de datos todos los modelos que han sido marcados/seleccionados.
     * Usa peticiones concurrentes para mejorar el rendimiento de red.
     */
    const borrarModelos = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const resultados = await Promise.all(seleccionados.map(async (mid) => {
                return fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/modelos/${mid}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
            }));
            if (resultados.every(r => r.ok)) {
                triggerToast("Modelos eliminados");
                setSeleccionados([]);
                cargarProducto();
            }
        } catch (e) {
            triggerToast("Error de conexión", "error");
        }
    };

    /**
     * Abre la galería, procesa la imagen seleccionada y la sube a Supabase.
     * Puede actualizar la imagen de un modelo ya existente o de un modelo en fase de creación.
     * * @param idx - Índice de la fila del modelo que se está editando.
     * @param esNuevo - Indicador booleano (true si la fila pertenece al array de `nuevosModelos`).
     */
    const subirImagen = async (idx: number, esNuevo: boolean) => {
        const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, base64: true, quality: 0.8 });
        if (!result.canceled && result.assets[0].base64) {
            const fileName = `mod_${Date.now()}.png`;
            const { error } = await supabase.storage.from('fotos_productos').upload(fileName, decode(result.assets[0].base64), { contentType: 'image/png' });
            if (error) return triggerToast("Error al subir la imagen", "error");

            const { data: { publicUrl } } = supabase.storage.from('fotos_productos').getPublicUrl(fileName);
            if (esNuevo) {
                const n = [...nuevosModelos]; n[idx].imagen = publicUrl; setNuevosModelos(n);
            } else {
                const m = [...modelos]; m[idx].imagen = publicUrl; setModelos(m);
            }
        }
    };

    /**
     * Guarda en la base de datos los cambios de nombre y/o imagen 
     * realizados a un modelo ya existente.
     * * @param idx - Índice del modelo en el array `modelos` local.
     */
    const guardarModelo = async (idx: number) => {
        const { data: { session } } = await supabase.auth.getSession();
        const mod = modelos[idx];
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/modelos/${mod.id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: mod.nombre, imagen: mod.imagen })
        });
        if (res.ok) triggerToast("Modelo guardado");
    };

    /**
     * Crea un nuevo registro de modelo asociado a este producto en la base de datos.
     * * @param idx - Índice del modelo en el array temporal `nuevosModelos`.
     */
    const crearModelo = async (idx: number) => {
        const mod = nuevosModelos[idx];
        if (!mod.nombre || !mod.imagen) {
            triggerToast("Añade un nombre y una imagen", "error");
            return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/productos/${id}/modelos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(mod)
        });
        if (res.ok) {
            triggerToast("Modelo añadido con éxito");
            setNuevosModelos(nuevosModelos.filter((_, i) => i !== idx));
            cargarProducto();
        }
    };

    if (cargando) return <View style={styles.contenedorCarga}><ActivityIndicator size="large" color="#3b82f6" /></View>;

    return (
        <View style={styles.pantalla}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Pressable style={styles.btnVolverWrapper} onPress={() => router.back()}>
                    <Text style={styles.btnVolver}>⬅ Volver al catálogo</Text>
                </Pressable>

                {/* INFORMACION GENERAL */}
                <View style={styles.tarjeta}>
                    <Text style={styles.tituloSeccion}>Información General</Text>

                    <View style={styles.filaInputs}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre del Producto</Text>
                            <TextInput style={styles.input} value={form.nombre} onChangeText={t => setForm({ ...form, nombre: t })} />
                        </View>
                        <View style={[styles.inputGroup, { flex: 0.4 }]}>
                            <Text style={styles.label}>Precio (€)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={form.precio.toString()} onChangeText={t => setForm({ ...form, precio: parseFloat(t) || 0 })} />
                        </View>
                    </View>

                    <Text style={[styles.tituloSeccion, { marginTop: 10 }]}>Configuración</Text>

                    <View style={styles.contenedorSwitches}>
                        <View style={styles.switchBox}>
                            <Text style={styles.labelSwitch}>Personalizable</Text>
                            <Pressable
                                style={[styles.btnToggleSwitch, form.personalizable ? styles.btnOn : styles.btnOff]}
                                onPress={() => setForm({ ...form, personalizable: !form.personalizable })}
                            >
                                <Text style={[styles.txtSwitch, form.personalizable ? styles.txtOn : styles.txtOff]}>
                                    {form.personalizable ? "Sí" : "No"}
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.switchBox}>
                            <Text style={styles.labelSwitch}>Visibilidad</Text>
                            <Pressable
                                style={[styles.btnToggleSwitch, !form.oculto ? styles.btnOn : styles.btnOffWarning]}
                                onPress={() => setForm({ ...form, oculto: !form.oculto })}
                            >
                                <Text style={[styles.txtSwitch, !form.oculto ? styles.txtOn : styles.txtOffWarning]}>
                                    {!form.oculto ? "Visible" : "Oculto"}
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.switchBox}>
                            <Text style={styles.labelSwitch}>Estado</Text>
                            <Pressable
                                style={[styles.btnToggleSwitch, !form.deshabilitado ? styles.btnOn : styles.btnOffDanger]}
                                onPress={() => setForm({ ...form, deshabilitado: !form.deshabilitado })}
                            >
                                <Text style={[styles.txtSwitch, !form.deshabilitado ? styles.txtOn : styles.txtOffDanger]}>
                                    {!form.deshabilitado ? "Activo" : "Deshabilitado"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {form.personalizable && (
                        <View style={[styles.inputGroup, { marginBottom: 20 }]}>
                            <Text style={styles.label}>Precio Extra por Personalización (€)</Text>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                value={form.precio_personalizacion.toString()} 
                                onChangeText={t => setForm({...form, precio_personalizacion: parseFloat(t) || 0})} 
                            />
                        </View>
                    )}

                    <Pressable style={styles.btnGuardarMain} onPress={guardarDatosPrincipales}>
                        <Text style={styles.txtBtnGuardarMain}>Guardar Cambios</Text>
                    </Pressable>
                </View>

                {/* MODELOS */}
                <View style={styles.tarjeta}>
                    <View style={styles.cabeceraModelos}>
                        <Text style={styles.tituloSeccion}>Modelos del Producto ({modelos.length + nuevosModelos.length})</Text>
                        <View style={styles.contenedorAcciones}>
                            {seleccionados.length > 0 && (
                                <Pressable style={[styles.btnAccion, { backgroundColor: '#fee2e2' }]} onPress={borrarModelos}>
                                    <Text style={[styles.txtAccion, { color: '#dc2626' }]}>Eliminar ({seleccionados.length})</Text>
                                </Pressable>
                            )}
                            <Pressable style={styles.btnAccion} onPress={() => setNuevosModelos([{ nombre: '', imagen: '' }, ...nuevosModelos])}>
                                <Text style={styles.txtAccion}>+ Añadir Modelo</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.tabla}>
                        <View style={styles.cabeceraTabla}>
                            <View style={styles.checkbox} />
                            <Text style={[styles.cabeceraTabla, { width: 90 }]}>Imagen</Text>
                            <Text style={[styles.cabeceraTabla, { flex: 1 }]}>Nombre del Modelo</Text>
                            <Text style={[styles.cabeceraTabla, { width: 80, textAlign: 'center' }]}>Acción</Text>
                        </View>

                        {/* Filas de modelos nuevos */}
                        {nuevosModelos.map((nm, idx) => (
                            <View key={`new-${idx}`} style={[styles.fila, { backgroundColor: '#f0fdf4' }]}>
                                <View style={styles.checkbox} />
                                <Pressable onPress={() => subirImagen(idx, true)} style={styles.imgCol}>
                                    {nm.imagen ? <Image source={{ uri: nm.imagen }} style={styles.imagen} /> : <View style={styles.placeholder}><Text style={{ fontSize: 10, color: '#64748b' }}>Subir</Text></View>}
                                </Pressable>
                                <TextInput style={styles.inputTabla} placeholder="Escribe un nombre..." value={nm.nombre} onChangeText={t => { const n = [...nuevosModelos]; n[idx].nombre = t; setNuevosModelos(n); }} />
                                <Pressable style={styles.btnFilaCrear} onPress={() => crearModelo(idx)}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>CREAR</Text>
                                </Pressable>
                            </View>
                        ))}

                        {/* Filas de modelos existentes */}
                        {modelos.map((m, idx) => (
                            <View key={m.id} style={[styles.fila, seleccionados.includes(m.id) && { backgroundColor: '#eff6ff' }]}>
                                <Pressable onPress={() => toggleSeleccion(m.id)} style={styles.checkbox}>
                                    <View style={[styles.checkOuter, seleccionados.includes(m.id) && { borderColor: '#3b82f6', backgroundColor: '#3b82f6' }]}>
                                        {seleccionados.includes(m.id) && <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: -2 }}>✓</Text>}
                                    </View>
                                </Pressable>
                                <Pressable onPress={() => subirImagen(idx, false)} style={styles.imgCol}>
                                    <Image source={{ uri: m.imagen }} style={styles.imagen} />
                                </Pressable>
                                <TextInput style={styles.inputTabla} value={m.nombre} onChangeText={t => { const n = [...modelos]; n[idx].nombre = t; setModelos(n); }} />
                                <Pressable style={styles.btnFilaGuardar} onPress={() => guardarModelo(idx)}>
                                    <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12,textAlign: 'center' }}>GUARDAR</Text>
                                </Pressable>
                            </View>
                        ))}

                        {modelos.length === 0 && nuevosModelos.length === 0 && (
                            <Text style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No hay modelos. Añade uno para empezar.</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}