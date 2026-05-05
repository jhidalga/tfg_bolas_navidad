import { View, Text, Pressable } from 'react-native';
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../styles/navbar/navbar.styles';

let cachedEsAdmin: boolean | null = null;

export default function Navbar() {
    const router = useRouter();
    const [esAdmin, setEsAdmin] = useState(cachedEsAdmin || false);

    useEffect(() => {
        if (cachedEsAdmin === null) {
            comprobarRolAPI();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                if (cachedEsAdmin === null) comprobarRolAPI();
            } else {
                cachedEsAdmin = false;
                setEsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function comprobarRolAPI() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            try {
                const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (respuesta.ok) {
                    const datosUsuario = await respuesta.json();
                    cachedEsAdmin = datosUsuario.administrador === true;
                    setEsAdmin(cachedEsAdmin);
                } else {
                    cachedEsAdmin = false;
                    setEsAdmin(false);
                }
            } catch (error) {
                console.error("Error al conectar con la API");
            }
        }
    }

    async function cerrarSesion() {
        cachedEsAdmin = null; 
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
                <Pressable style={styles.boton} onPress={() => router.push('../carrito')}>
                    <Text style={styles.textoBoton}>Carrito</Text>
                </Pressable>
                <Pressable style={styles.boton} onPress={() => router.push('../pedidos')}>
                    <Text style={styles.textoBoton}>Pedidos</Text>
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