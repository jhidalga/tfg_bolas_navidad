import { View, Text, Pressable, Image } from 'react-native'; 
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { styles as estilosEscritorio } from '../styles/navbar/navbar.styles';
import { styles as estilosMovil } from '../styles/navbar/navbar.styles.movil';
import { useEstilos } from '../lib/responsive';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alCambiarCarrito } from '../lib/contadorCarrito';
import { tc, temaActual } from '../lib/tema';

let cachedEsAdmin: boolean | null = null;

/**
 * Componente visual que representa la barra de navegación superior (Navbar).
 * Gestiona la navegación principal de la aplicación, la comprobación del rol del usuario 
 * en tiempo real y muestra dinámicamente el botón de administración si corresponde.
 * * @returns Componente View que contiene el logotipo y los iconos de navegación.
 */
/**
 * Finaliza la sesión del usuario en Supabase, limpia la caché de administrador
 * y redirige de vuelta a la pantalla de Login. Se usa desde los ajustes de la cuenta.
 */
export async function cerrarSesionUsuario(router: { replace: (ruta: any) => void }) {
    cachedEsAdmin = null;
    await AsyncStorage.removeItem('esAdminPersistente');
    await supabase.auth.signOut();
    router.replace('/login');
}

export default function Navbar() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [esAdmin, setEsAdmin] = useState(cachedEsAdmin || false);
    const insets = useSafeAreaInsets();
    const [enCarrito, setEnCarrito] = useState(0);

    async function contarCarrito() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) { setEnCarrito(0); return; }
            const r = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/carrito`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!r.ok) return;
            const filas = await r.json();
            setEnCarrito(Array.isArray(filas) ? filas.reduce((t: number, f: any) => t + (Number(f.cantidad) || 1), 0) : 0);
        } catch (e) {
            // sin conexión: se deja el número anterior
        }
    }

    useEffect(() => {
        contarCarrito();
        return alCambiarCarrito(contarCarrito);
    }, []);

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

    return (
        <View style={[
            styles.contenedor, 
            { paddingBottom: Math.max(insets.bottom, 15) } 
        ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={require('../assets/images/favicon.png')} style={{ width: 30, height: 30, marginBottom: -5 }} resizeMode="contain" />
                <Text style={styles.logo}>{temaActual.marca}</Text>
            </View>
            <View style={styles.enlaces}>
                <Pressable style={styles.boton} onPress={() => router.push('../inicio')}>
                    <Ionicons name="home" size={24} color={tc("#f1cf8a")} />
                </Pressable>
                
                <Pressable style={styles.boton} onPress={() => router.push('../carrito')}>
                    <View>
                        <Ionicons name="cart" size={24} color={tc("#f1cf8a")} />
                        {enCarrito > 0 && (
                            <View style={{ position: 'absolute', top: -6, right: -9, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: tc('#dc2626'), alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{enCarrito > 99 ? '99+' : enCarrito}</Text>
                            </View>
                        )}
                    </View>
                </Pressable>
                
                <Pressable style={styles.boton} onPress={() => router.push('../pedidos')}>
                    <FontAwesome5 name="box-open" size={22} color={tc("#f1cf8a")} />
                </Pressable>

                <Pressable style={styles.boton} onPress={() => router.push('../perfil')}>
                    <FontAwesome name="user-circle" size={24} color={tc("#f1cf8a")} />
                </Pressable>

                {esAdmin && (
                    <Pressable style={styles.botonAdmin} onPress={() => router.push('../admin')}>
                        <FontAwesome name="cogs" size={20} color={tc("#ffffff")} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}