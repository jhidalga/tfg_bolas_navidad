import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Navbar, { cerrarSesionUsuario } from '../componentes/navbar';
import FormLogin from '../componentes/formLogin';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { styles as estilosEscritorio } from '../styles/perfil/perfil.styles.web';
import { styles as estilosMovil } from '../styles/perfil/perfil.styles.movil';
import { useEstilos } from '../lib/responsive';
import { tc } from '../lib/tema';

/**
 * Pantalla de visualización y edición del Perfil de Usuario.
 * Permite al usuario logueado consultar sus datos personales (nombre, email, curso, rol)
 * y modificar aquellos que sean editables mediante peticiones a la API.
 * * @returns Componente principal que renderiza la vista del perfil.
 */
export default function MiPerfil() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    const [usuario, setUsuario] = useState<any>(null);
    const [sinSesion, setSinSesion] = useState(false);
    
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
            if (!session) { setSinSesion(true); return; }
            setSinSesion(false);

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
                    <ActivityIndicator size="large" color={tc("#e6c27a")} />
                </View>
            ) : sinSesion ? (
                <ScrollView contentContainerStyle={styles.scrollCentral}>
                    <View style={styles.tarjetaPerfil}>
                        <Text style={styles.titulo}>Inicia sesión</Text>
                        <Text style={[styles.label, { marginBottom: 14 }]}>Entra con tu cuenta para ver y editar tu perfil.</Text>
                        <FormLogin alEntrar={() => { setCargando(true); cargarPerfil(); }} />
                    </View>
                </ScrollView>
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

                        <View style={{ marginTop: 26, paddingTop: 18, borderTopWidth: 1, borderTopColor: tc('#e3cfa5') }}>
                            <Text style={[styles.label, { marginBottom: 10 }]}>Sesión</Text>
                            <Pressable
                                onPress={() => cerrarSesionUsuario(router)}
                                accessibilityRole="button"
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: tc('#dc2626'), backgroundColor: 'transparent' }}
                            >
                                <Ionicons name="log-out-outline" size={20} color={tc("#dc2626")} />
                                <Text style={{ color: tc('#dc2626'), fontWeight: '700', fontSize: 15 }}>Cerrar sesión</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}