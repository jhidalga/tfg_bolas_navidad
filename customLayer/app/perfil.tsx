import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Navbar from '../componentes/navbar';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { styles } from '../styles/perfil/perfil.styles.web';

/**
 * Pantalla de visualización y edición del Perfil de Usuario.
 * Permite al usuario logueado consultar sus datos personales (nombre, email, curso, rol)
 * y modificar aquellos que sean editables mediante peticiones a la API.
 * * @returns Componente principal que renderiza la vista del perfil.
 */
export default function MiPerfil() {
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    const [usuario, setUsuario] = useState<any>(null);
    
    const [form, setForm] = useState({ nombre: '', curso: '' });

    useEffect(() => {
        cargarPerfil();
    }, []);

    /**
     * Obtiene los datos del perfil del usuario actual desde la API.
     * Requiere que el usuario tenga una sesión activa en Supabase.
     * Actualiza el estado local con la información obtenida para mostrarla en la interfaz.
     */
    const cargarPerfil = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                setUsuario(datos);
                setForm({ nombre: datos.nombre || '', curso: datos.curso || '' });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error al cargar tu perfil' });
        } finally {
            setCargando(false);
        }
    };

    /**
     * Envía los datos actualizados del formulario (nombre y curso) a la API 
     * para modificar el perfil del usuario.
     * Realiza validaciones básicas antes del envío y muestra notificaciones 
     * (Toast) según el resultado de la operación.
     */
    const guardarCambios = async () => {
        if (!form.nombre.trim() || !form.curso.trim()) {
            Toast.show({ type: 'error', text1: 'El nombre y curso no pueden estar vacíos' });
            return;
        }

        setGuardando(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre: form.nombre, curso: form.curso })
            });

            if (respuesta.ok) {
                const resultado = await respuesta.json();
                setUsuario(resultado.data);
                setEditando(false);
                Toast.show({ type: 'success', text1: 'Perfil actualizado con éxito' });
            } else {
                Toast.show({ type: 'error', text1: 'Error al guardar los cambios' });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Problema de conexión' });
        } finally {
            setGuardando(false);
        }
    };

    /**
     * Cancela el modo de edición y restaura los valores del formulario 
     * a los datos originales del usuario obtenidos previamente.
     */
    const cancelarEdicion = () => {
        setForm({ nombre: usuario.nombre || '', curso: usuario.curso || '' });
        setEditando(false);
    };

    return (
        <View style={styles.contenedorPantalla}>
            <Navbar />
            
            {cargando ? (
                <View style={styles.contenedorCentral}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollCentral}>
                    <View style={styles.tarjetaPerfil}>
                        <Text style={styles.titulo}>Mi Perfil</Text>

                        <View style={styles.campoContainer}>
                            <Text style={styles.label}>Nombre completo</Text>
                            {editando ? (
                                <TextInput 
                                    style={styles.inputEditable}
                                    value={form.nombre}
                                    onChangeText={(t) => setForm({...form, nombre: t})}
                                    placeholder="Tu nombre"
                                />
                            ) : (
                                <Text style={styles.valorNormal}>{usuario?.nombre || 'No definido'}</Text>
                            )}
                        </View>

                        <View style={styles.campoContainer}>
                            <Text style={styles.label}>Correo Electrónico</Text>
                            <Text style={styles.valorBloqueado}>{usuario?.email}</Text>
                        </View>

                        <View style={styles.campoContainer}>
                            <Text style={styles.label}>Curso</Text>
                            {editando ? (
                                <TextInput 
                                    style={styles.inputEditable}
                                    value={form.curso}
                                    onChangeText={(t) => setForm({...form, curso: t})}
                                    placeholder="Ej: 1DAM"
                                    autoCapitalize="characters"
                                />
                            ) : (
                                <Text style={styles.valorNormal}>{usuario?.curso || 'No definido'}</Text>
                            )}
                        </View>

                        <View style={styles.campoContainer}>
                            <Text style={styles.label}>¿Es profesor?</Text>
                            <Text style={styles.valorBloqueado}>{usuario?.profesor ? "Sí" : "No"}</Text>
                        </View>

                        <View style={styles.contenedorBotones}>
                            {!editando ? (
                                <Pressable style={styles.btnModificar} onPress={() => setEditando(true)}>
                                    <Text style={styles.txtBtn}>Modificar Perfil</Text>
                                </Pressable>
                            ) : (
                                <>
                                    <Pressable 
                                        style={[styles.btnGuardar, guardando && { opacity: 0.7 }]} 
                                        onPress={guardarCambios}
                                        disabled={guardando}
                                    >
                                        <Text style={styles.txtBtn}>
                                            {guardando ? 'Guardando...' : 'Guardar Cambios'}
                                        </Text>
                                    </Pressable>
                                    
                                    <Pressable 
                                        style={styles.btnCancelar} 
                                        onPress={cancelarEdicion}
                                        disabled={guardando}
                                    >
                                        <Text style={styles.txtBtnCancelar}>Cancelar</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}