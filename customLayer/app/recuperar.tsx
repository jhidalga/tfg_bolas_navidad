import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { styles as estilosEscritorio } from '../styles/login/login.styles';
import { styles as estilosMovil } from '../styles/login/login.styles.movil';
import { useEstilos } from '../lib/responsive';
import { supabase } from '../lib/supabase';
import { traducirError } from '../lib/errores';
import Footer from '../componentes/footer';

/** Pide el correo y manda el enlace para poner una contraseña nueva. */
export default function RecuperarPassword() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    async function enviar() {
        const limpio = correo.trim();
        if (cargando) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
            Toast.show({ type: 'error', text1: 'Introduce un correo electrónico válido' });
            return;
        }
        setCargando(true);
        let fallo = '';
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/auth/recuperar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: limpio, redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/nueva-clave` : null }),
            });
            if (!res.ok) fallo = (await res.json().catch(() => ({}))).detail || 'No se pudo enviar el correo';
        } catch {
            fallo = 'Error de conexión';
        }
        setCargando(false);
        if (fallo) {
            Toast.show({ type: 'error', text1: 'Error', text2: traducirError(fallo) });
            return;
        }
        // Mismo mensaje exista o no el correo, para no dar pistas de quien tiene cuenta
        setEnviado(true);
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Recuperar contraseña</Text>
                    {enviado ? (
                        <Text style={styles.avisoRecuperacion} accessibilityLabel="Correo enviado">
                            Si ese correo tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva. Puede llegar a la carpeta de spam o correo no deseado, revísala. El enlace solo se puede usar una vez.
                        </Text>
                    ) : (
                        <View>
                            <Text style={styles.etiqueta}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={correo}
                                onChangeText={setCorreo}
                                placeholder='tuCorreo@ejemplo.com'
                                autoCapitalize='none'
                                keyboardType='email-address'
                                onSubmitEditing={enviar}
                            />
                            <Pressable style={[styles.botonLogin, cargando && { opacity: 0.7 }]} onPress={enviar} disabled={cargando}>
                                <Text style={styles.textoBoton}>{cargando ? 'Enviando...' : 'Enviar enlace'}</Text>
                            </Pressable>
                        </View>
                    )}
                    <Pressable style={styles.botonVolver} onPress={() => router.replace('/login')}>
                        <Text style={styles.textoBotonVolver}>Volver</Text>
                    </Pressable>
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}
