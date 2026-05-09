import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { styles } from '../styles/login/login.styles';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

/**
 * Pantalla de recuperación de contraseña.
 * Gestiona un flujo de dos pasos mediante Supabase:
 * 1. Solicitud de un código de recuperación (OTP) al correo institucional.
 * 2. Verificación del código y establecimiento de una nueva contraseña.
 * * @returns Componente que renderiza el formulario de recuperación de contraseña.
 */
export default function RecuperarPassword() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(false);

    /**
     * Solicita a Supabase el envío de un correo electrónico con un código 
     * de verificación (OTP) para restablecer la contraseña.
     * Si la petición tiene éxito, avanza el formulario al paso 2.
     */
    const enviarCodigo = async () => {
        if (!correo.trim()) return Toast.show({ type: 'error', text1: 'Introduce tu correo' });
        setCargando(true);
        
        const { error } = await supabase.auth.resetPasswordForEmail(correo.trim());
        
        setCargando(false);
        if (error) return Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        
        Toast.show({ type: 'success', text1: 'Código enviado a tu correo' });
        setPaso(2);
    };

    /**
     * Verifica el código OTP proporcionado por el usuario y, si es correcto,
     * actualiza la cuenta con la nueva contraseña introducida.
     * Si el proceso es exitoso, redirige al usuario a la pantalla de inicio de sesión.
     */
    const cambiarContrasena = async () => {
        if (!codigo.trim() || !nuevaContrasena.trim()) return Toast.show({ type: 'error', text1: 'Rellena todos los campos' });
        setCargando(true);
        const { error: errorOtp } = await supabase.auth.verifyOtp({
            email: correo.trim(),
            token: codigo.trim(),
            type: 'recovery'
        });

        if (errorOtp) {
            setCargando(false);
            return Toast.show({ type: 'error', text1: 'Código incorrecto' });
        }

        const { error: errorUpdate } = await supabase.auth.updateUser({
            password: nuevaContrasena.trim()
        });

        setCargando(false);

        if (errorUpdate) {
            return Toast.show({ type: 'error', text1: 'Error al cambiar contraseña' });
        }

        Toast.show({ type: 'success', text1: 'Contraseña actualizada', text2: 'Ya puedes iniciar sesión' });
        router.replace('/login');
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Recuperar Contraseña</Text>

                    {paso === 1 ? (
                        <>
                            <Text style={styles.etiqueta}>Email educativo</Text>
                            <TextInput
                                style={styles.input}
                                value={correo}
                                onChangeText={setCorreo}
                                placeholder='tuCorreo@g.educaand.es'
                                autoCapitalize='none'
                            />
                            <Pressable style={styles.botonLogin} onPress={enviarCodigo} disabled={cargando}>
                                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBoton}>Enviar Código</Text>}
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Text style={styles.etiqueta}>Código de 6 dígitos</Text>
                            <TextInput
                                style={styles.input}
                                value={codigo}
                                onChangeText={setCodigo}
                                placeholder='Ej: 123456'
                                keyboardType='numeric'
                            />
                            <Text style={styles.etiqueta}>Nueva Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                value={nuevaContrasena}
                                onChangeText={setNuevaContrasena}
                                placeholder='Tu nueva contraseña'
                                secureTextEntry
                            />
                            <Pressable style={styles.botonLogin} onPress={cambiarContrasena} disabled={cargando}>
                                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBoton}>Guardar Contraseña</Text>}
                            </Pressable>
                        </>
                    )}

                    <Pressable style={styles.botonVolver} onPress={() => router.back()}>
                        <Text style={styles.textoBotonVolver}>Volver al Login</Text>
                    </Pressable>
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}