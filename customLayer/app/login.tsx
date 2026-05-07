import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { styles } from '../styles/login/login.styles';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import { setEsAdminGlobal } from '../lib/supabase';

export default function Login() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [cargando, setCargando] = useState(false);

    async function comprobarCredenciales() {
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        if (!correoLimpio || !contrasenaLimpia) {
            alert('Por favor, rellena todos los campos.');
            return;
        }

        if (!correoLimpio.endsWith('@g.educaand.es') || correoLimpio === '@g.educaand.es') {
            alert('Debes introducir un usuario válido delante de @g.educaand.es');
            return;
        }

        setCargando(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: correoLimpio,
            password: contrasenaLimpia,
        });

        if (error) {
            setCargando(false);
            alert(error.message);
        } else if (data?.session) {
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                    headers: { 'Authorization': `Bearer ${data.session.access_token}` }
                });
                
                if (res.ok) {
                    const perfil = await res.json();
                    setEsAdminGlobal(perfil.administrador === true);
                }
            } catch (e) {
                console.error('Error al obtener el perfil del usuario:', e);
            }

            setCargando(false);
            router.replace('/inicio');
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Inicia sesion</Text>

                    <Text style={styles.etiqueta}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={correo}
                        onChangeText={setCorreo}
                        placeholder='tuCorreo@g.educaand.es'
                        autoCapitalize='none'
                    />

                    <Text style={styles.etiqueta}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={contrasena}
                        onChangeText={setContrasena}
                        placeholder='Introduce tu contraseña'
                        secureTextEntry
                    />

                    <Pressable style={styles.botonLogin} onPress={() => comprobarCredenciales()}>
                        <Text style={styles.textoBoton}>Iniciar Sesion</Text>
                    </Pressable>

                    <Pressable style={styles.botonVolver} onPress={() => router.push('/')}>
                        <Text style={styles.textoBotonVolver}>Volver</Text>
                    </Pressable>
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}