import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { traducirError } from '../lib/errores';
import { styles as estilosEscritorio } from '../styles/login/login.styles';
import { styles as estilosMovil } from '../styles/login/login.styles.movil';
import { useEstilos } from '../lib/responsive';
import { tc } from '../lib/tema';
import Footer from '../componentes/footer';

/**
 * Pantalla a la que lleva el enlace del correo de "contraseña olvidada".
 * Lee la sesión del enlace y deja elegir una contraseña nueva.
 */
export default function NuevaClave() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [estado, setEstado] = useState<'comprobando' | 'listo' | 'invalido'>('comprobando');
    const [clave, setClave] = useState('');
    const [clave2, setClave2] = useState('');
    const [ver, setVer] = useState(false);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const url = new URL(window.location.href);
                const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
                const code = url.searchParams.get('code');
                const acceso = hash.get('access_token');
                const refresco = hash.get('refresh_token');
                let ok = false;
                if (acceso && refresco) {
                    const { error } = await supabase.auth.setSession({ access_token: acceso, refresh_token: refresco });
                    ok = !error;
                } else if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    ok = !error;
                } else {
                    // Sin datos en la URL: vale si ya hay una sesion recien creada
                    const { data } = await supabase.auth.getSession();
                    ok = !!data.session && hash.get('type') !== 'error';
                }
                // Se limpia la URL para que el enlace no quede a la vista
                window.history.replaceState(null, '', window.location.pathname);
                setEstado(ok ? 'listo' : 'invalido');
            } catch (e) {
                setEstado('invalido');
            }
        })();
    }, []);

    async function guardar() {
        if (cargando) return;
        const nueva = clave.trim();
        if (nueva.length < 8) {
            Toast.show({ type: 'error', text1: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        if (nueva !== clave2.trim()) {
            Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden.' });
            return;
        }
        setCargando(true);
        const { error } = await supabase.auth.updateUser({ password: nueva });
        setCargando(false);
        if (error) {
            Toast.show({ type: 'error', text1: 'No se pudo cambiar', text2: traducirError(error.message) });
            return;
        }
        Toast.show({ type: 'success', text1: 'Contraseña cambiada' });
        router.replace('/inicio');
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Contraseña nueva</Text>
                    {estado === 'comprobando' && <Text style={styles.avisoRecuperacion}>Comprobando el enlace...</Text>}
                    {estado === 'invalido' && (
                        <View>
                            <Text style={styles.avisoRecuperacion} accessibilityLabel="Enlace no válido">
                                Este enlace ya no vale. Puede haber caducado o ya se usó. Pide uno nuevo.
                            </Text>
                            <Pressable style={styles.botonLogin} onPress={() => router.replace('/recuperar')}>
                                <Text style={styles.textoBoton}>Pedir otro enlace</Text>
                            </Pressable>
                        </View>
                    )}
                    {estado === 'listo' && (
                        <View>
                            <Text style={styles.etiqueta}>Contraseña nueva</Text>
                            <TextInput style={styles.input} value={clave} onChangeText={setClave} placeholder='Mínimo 8 caracteres'
                                secureTextEntry={!ver} autoCapitalize='none' accessibilityLabel='Contraseña nueva' />
                            <Text style={styles.etiqueta}>Repite la contraseña</Text>
                            <TextInput style={styles.input} value={clave2} onChangeText={setClave2} placeholder='Repite la contraseña'
                                secureTextEntry={!ver} autoCapitalize='none' onSubmitEditing={guardar} accessibilityLabel='Repite la contraseña' />
                            <Pressable onPress={() => setVer(!ver)} style={{ marginTop: -12, marginBottom: 16 }}>
                                <Text style={{ color: tc('#a52a2a'), fontWeight: '600', fontSize: 13 }}>{ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
                            </Pressable>
                            <Pressable style={[styles.botonLogin, cargando && { opacity: 0.7 }]} onPress={guardar} disabled={cargando}>
                                <Text style={styles.textoBoton}>{cargando ? 'Guardando...' : 'Guardar contraseña'}</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}
