import { View, Text, Pressable, Image } from 'react-native'; 
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from '../styles/navbar/navbar.styles';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let cachedEsAdmin: boolean | null = null;

/**
 * Componente visual que representa la barra de navegación superior (Navbar).
 * Gestiona la navegación principal de la aplicación, la comprobación del rol del usuario 
 * en tiempo real y muestra dinámicamente el botón de administración si corresponde.
 * * @returns Componente View que contiene el logotipo y los iconos de navegación.
 */
export default function Navbar() {
    const router = useRouter();
    const [esAdmin, setEsAdmin] = useState(cachedEsAdmin || false);
    const insets = useSafeAreaInsets();

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

    /**
     * Realiza una petición segura a la API para verificar si el usuario autenticado
     * tiene privilegios de administrador.
     * Si la petición es exitosa, actualiza la caché global y el estado local del componente.
     */
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
    
    useFocusEffect(
        useCallback(() => {
            const recuperarRol = async () => {
                try {
                    const rolGuardado = await AsyncStorage.getItem('esAdminPersistente');
                    if (rolGuardado !== null) {
                        setEsAdmin(rolGuardado === 'true');
                    } else {
                        comprobarRolAPI();
                    }
                } catch (e) {
                    console.error("Error leyendo AsyncStorage");
                }
            };
            
            recuperarRol();
        }, [])
    );

    /**
     * Finaliza la sesión del usuario en Supabase, limpia la caché de administrador
     * y redirige de vuelta a la pantalla de Login.
     */
    async function cerrarSesion() {
        cachedEsAdmin = null;
        await AsyncStorage.removeItem('esAdminPersistente'); 
        await supabase.auth.signOut();
        router.replace('/login');
    }

    return (
        <View style={[
            styles.contenedor, 
            { paddingBottom: Math.max(insets.bottom, 15) } 
        ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../assets/images/icon.png')} style={{ width: 30, height: 30, marginBottom: -5 }} resizeMode="contain" />
                <Text style={styles.logo}>Custom Layers</Text>
            </View>
            <View style={styles.enlaces}>
                <Pressable style={styles.boton} onPress={() => router.push('../inicio')}>
                    <Ionicons name="home" size={24} color="#475569" />
                </Pressable>
                
                <Pressable style={styles.boton} onPress={() => router.push('../carrito')}>
                    <Ionicons name="cart" size={24} color="#475569" />
                </Pressable>
                
                <Pressable style={styles.boton} onPress={() => router.push('../pedidos')}>
                    <FontAwesome5 name="box-open" size={22} color="#475569" />
                </Pressable>

                <Pressable style={styles.boton} onPress={() => router.push('../perfil')}>
                    <FontAwesome name="user-circle" size={24} color="#475569" />
                </Pressable>

                {esAdmin && (
                    <Pressable style={styles.botonAdmin} onPress={() => router.push('../admin')}>
                        <FontAwesome name="cogs" size={20} color="#ffffff" />
                    </Pressable>
                )}

                <Pressable style={styles.botonSalir} onPress={cerrarSesion}>
                    <Ionicons name="log-out-outline" size={26} color="#dc2626" />
                </Pressable>
            </View>
        </View>
    );
}