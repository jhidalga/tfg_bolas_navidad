import { View, Text, ScrollView, Pressable } from 'react-native';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { styles as estilosEscritorio } from '../styles/login/login.styles';
import { styles as estilosMovil } from '../styles/login/login.styles.movil';
import { useEstilos } from '../lib/responsive';
import { useRouter } from "expo-router";
import Footer from '../componentes/footer';
import FormLogin from '../componentes/formLogin';

/**
 * Pantalla principal de inicio de sesión.
 * Gestiona la autenticación de usuarios mediante Supabase y la validación
 * de campos. Redirige a la pantalla de inicio tras un login exitoso.
 * * @returns Componente ScrollView que contiene el formulario de inicio de sesión y el pie de página.
 */
export default function Login() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();

    // Al llegar desde el enlace del correo de verificacion
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (h.get('type') === 'signup' || h.get('access_token')) {
            Toast.show({ type: 'success', text1: 'Correo verificado', text2: 'Ya puedes iniciar sesión.', visibilityTime: 6000 });
        } else if (h.get('error')) {
            Toast.show({ type: 'error', text1: 'El enlace no vale', text2: 'Puede haber caducado. Regístrate otra vez o avísanos.', visibilityTime: 7000 });
        }
        if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Inicia sesión</Text>

                    <FormLogin />

                    <Pressable style={styles.botonVolver} onPress={() => router.push('/')}>
                        <Text style={styles.textoBotonVolver}>Volver</Text>
                    </Pressable>
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}
