import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { styles } from '../../styles/adminLayout/adminLayout.styles';
import Toast from 'react-native-toast-message';

export default function AdminLayout() {
    const router = useRouter();
    const segments = useSegments() as string[];
    const [verificando, setVerificando] = useState(true);

    const esRutaPedidos = segments.length === 1 || segments[1] === 'index';
    const esRutaProductos = segments.includes('productos');
    const esRutaUsuarios = segments.includes('usuarios');

    useEffect(() => {
        const verificarRol = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.replace('/login');
                return;
            }

            try {
                const respuesta = await fetch('http://192.168.0.25:8000/api/usuarios/perfil', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (respuesta.ok) {
                    const datosUsuario = await respuesta.json();
                    if (datosUsuario.administrador === true) {
                        setVerificando(false);
                    } else {
                        router.replace('/inicio');
                    }
                } else {
                    router.replace('/inicio');
                }
            } catch (error) {
                router.replace('/inicio');
            }
        };

        verificarRol();
    }, []);

    if (verificando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.sidebar}>
                <Text style={styles.logo}>PANEL ADMINISTRADOR</Text>
                
                <View style={styles.menu}>
                    <Pressable 
                        style={[styles.opcion, esRutaPedidos && styles.activa]} 
                        onPress={() => router.push('/admin' as any)}
                    >
                        <Text style={[styles.texto, esRutaPedidos && styles.textoActivo]}>📦 Pedidos</Text>
                    </Pressable>

                    <Pressable 
                        style={[styles.opcion, esRutaProductos && styles.activa]} 
                        onPress={() => router.push('/admin/productos' as any)}
                    >
                        <Text style={[styles.texto, esRutaProductos && styles.textoActivo]}>🛒 Productos</Text>
                    </Pressable>

                    <Pressable 
                        style={[styles.opcion, esRutaUsuarios && styles.activa]} 
                        onPress={() => router.push('/admin/usuarios' as any)}
                    >
                        <Text style={[styles.texto, esRutaUsuarios && styles.textoActivo]}>👥 Usuarios</Text>
                    </Pressable>
                </View>

                <Pressable style={styles.btnVolver} onPress={() => router.replace('/inicio' as any)}>
                    <Text style={styles.textoVolver}>⬅ Tienda</Text>
                </Pressable>
            </View>

            <View style={styles.contenido}>
                <Slot />
            </View>

            <Toast position='top' topOffset={40} />
        </View>
    );
}