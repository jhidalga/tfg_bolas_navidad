import { View, Text, Pressable } from 'react-native';
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../styles/navbar/navbar.styles';

export default function Navbar() {
    const router = useRouter();
    const [esAdmin, setEsAdmin] = useState(false);

    useEffect(() => {
        async function comprobarRolAPI() {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.access_token) {
                try {
                    const respuesta = await fetch('http://127.0.0.1:8000/api/usuarios/perfil', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (respuesta.ok) {
                        const datosUsuario = await respuesta.json();
                        if (datosUsuario.administrador) {
                            setEsAdmin(true);
                        }
                    }
                } catch (error) {
                    console.error("Error al conectar con la API");
                }
            }
        }
        comprobarRolAPI();
    }, []);

    async function cerrarSesion() {
        await supabase.auth.signOut();
        router.replace('/login');
    }

    return (
        <View style={styles.contenedor}>
            <View>
                <Text style={styles.logo}>Custom Layers</Text>
            </View>

            <View style={styles.enlaces}>
                <Pressable style={styles.boton} onPress={() => router.push('../inicio')}>
                    <Text style={styles.textoBoton}>Inicio</Text>
                </Pressable>

                {esAdmin && (
                    <Pressable style={styles.botonAdmin} onPress={() => router.push('../admin')}>
                        <Text style={styles.textoAdmin}>Panel Admin</Text>
                    </Pressable>
                )}

                <Pressable style={styles.botonSalir} onPress={cerrarSesion}>
                    <Text style={styles.textoSalir}>Cerrar Sesión</Text>
                </Pressable>
            </View>
        </View>
    );
}