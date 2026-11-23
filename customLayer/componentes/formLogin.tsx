import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traducirError } from '../lib/errores';
import { supabase, setEsAdminGlobal } from '../lib/supabase';
import { styles as estilosEscritorio } from '../styles/login/login.styles';
import { styles as estilosMovil } from '../styles/login/login.styles.movil';
import { useEstilos } from '../lib/responsive';
import { tc } from '../lib/tema';

/**
 * Formulario de inicio de sesion: correo, contrasena (con boton para verla), aviso de
 * contrasena olvidada y enlace al registro. Lo usan la pantalla de login y el perfil
 * cuando no hay sesion iniciada.
 * @param alEntrar Que hacer tras iniciar sesion. Por defecto va al inicio.
 */
export default function FormLogin({ alEntrar }: { alEntrar?: () => void }) {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [verContrasena, setVerContrasena] = useState(false);
    const [cargando, setCargando] = useState(false);

    async function comprobarCredenciales() {
        if (cargando) return;
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        if (!correoLimpio || !contrasenaLimpia) {
            Toast.show({ type: 'error', text1: 'Por favor, rellena todos los campos.' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
            Toast.show({ type: 'error', text1: 'Introduce un correo electrónico válido' });
            return;
        }

        setCargando(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email: correoLimpio, password: contrasenaLimpia });

        if (error) {
            setCargando(false);
            Toast.show({ type: 'error', text1: 'Error', text2: traducirError(error.message) });
        } else if (data?.session) {
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                    headers: { 'Authorization': `Bearer ${data.session.access_token}` }
                });
                if (res.ok) {
                    const perfil = await res.json();
                    setEsAdminGlobal(perfil.administrador === true);
                    await AsyncStorage.setItem('esAdminPersistente', perfil.administrador === true ? 'true' : 'false');
                }
            } catch (e) {
                console.error('Error al obtener el perfil del usuario:', e);
            }
            setCargando(false);
            if (alEntrar) alEntrar(); else router.replace('/inicio');
        }
    }

    return (
        <View>
            <Text style={styles.etiqueta}>Email</Text>
            <TextInput
                style={styles.input}
                value={correo}
                onChangeText={setCorreo}
                placeholder='tuCorreo@ejemplo.com'
                autoCapitalize='none'
            />

            <Text style={styles.etiqueta}>Contraseña</Text>
            <TextInput
                style={styles.input}
                value={contrasena}
                onChangeText={setContrasena}
                placeholder='Introduce tu contraseña'
                secureTextEntry={!verContrasena}
                onSubmitEditing={() => comprobarCredenciales()}
            />
            <Pressable onPress={() => setVerContrasena(!verContrasena)} style={{ marginTop: -12, marginBottom: 16 }}>
                <Text style={{ color: tc('#a52a2a'), fontWeight: '600', fontSize: 13 }}>
                    {verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                </Text>
            </Pressable>

            <Pressable style={[styles.botonLogin, cargando && { opacity: 0.7 }]} onPress={() => comprobarCredenciales()} disabled={cargando}>
                <Text style={styles.textoBoton}>{cargando ? 'Entrando...' : 'Iniciar sesión'}</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/recuperar')} style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={{ color: tc('#a52a2a'), fontWeight: '700', fontSize: 14 }}>¿Has olvidado tu contraseña?</Text>
            </Pressable>

            <Pressable style={styles.botonVolver} onPress={() => router.push('/registro')}>
                <Text style={styles.textoBotonVolver}>¿No tienes cuenta? Regístrate</Text>
            </Pressable>
        </View>
    );
}
