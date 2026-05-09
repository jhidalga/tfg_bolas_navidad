import { View, Text, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { styles } from '../../styles/adminLayout/adminLayout.styles';
import Toast from 'react-native-toast-message';
import FontAwesome5 from '@expo/vector-icons/build/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';

/**
 * Componente Layout de seguridad y navegación para la sección de Administración.
 * Se encarga de verificar antes de renderizar cualquier vista interna si el usuario 
 * conectado posee privilegios de administrador. También proporciona la estructura 
 * visual de la barra lateral (Sidebar) para navegar entre Pedidos, Productos y Usuarios.
 * * @returns Componente envolvente (Wrapper) que protege y estructura el panel de control.
 */
export default function AdminLayout() {
    const router = useRouter();
    const segments = useSegments() as string[];
    const [verificando, setVerificando] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    const esRutaPedidos = segments.length === 1 || segments[1] === 'index';
    const esRutaProductos = segments.includes('productos');
    const esRutaUsuarios = segments.includes('usuarios');

    useEffect(() => {
        /**
         * Petición de seguridad a la API para validar el rol del usuario.
         * Si no hay sesión o el usuario no es administrador, intercepta la navegación 
         * y expulsa al usuario a la pantalla de login o inicio.
         */
        const verificarRol = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.replace('/login');
                return;
            }
            
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
            <View style={styles.headerMovil}>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Ionicons name="menu" size={32} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.tituloMovil}>Administración</Text>
            </View>

            {menuVisible && (
                <TouchableOpacity style={styles.fondoOscuro} onPress={() => setMenuVisible(false)} />
            )}

            <View style={[styles.sidebar, !menuVisible && styles.sidebarOculto]}>
                <Text style={styles.logo}>PANEL ADMIN</Text>
                
                <View style={styles.menu}>
                    <Pressable 
                        style={[styles.opcion, esRutaPedidos && styles.activa]} 
                        onPress={() => { setMenuVisible(false); router.push('/admin' as any); }}
                    >
                        <Text style={[styles.texto, esRutaPedidos && styles.textoActivo]}><FontAwesome5 name="box" size={24} color="white" /> Pedidos</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.opcion, esRutaProductos && styles.activa]} 
                        onPress={() => { setMenuVisible(false); router.push('/admin/productos' as any); }}
                    >
                        <Text style={[styles.texto, esRutaProductos && styles.textoActivo]}><FontAwesome5 name="boxes" size={24} color="white" /> Productos</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.opcion, esRutaUsuarios && styles.activa]} 
                        onPress={() => { setMenuVisible(false); router.push('/admin/usuarios' as any); }}
                    >
                        <Text style={[styles.texto, esRutaUsuarios && styles.textoActivo]}><FontAwesome5 name="users" size={24} color="white" /> Usuarios</Text>
                    </Pressable>
                </View>
                
                <Pressable style={styles.btnVolver} onPress={() => { setMenuVisible(false); router.replace('/inicio' as any); }}>
                    <Text style={styles.textoVolver}>  Tienda</Text>
                </Pressable>
            </View>
            
            <View style={styles.contenido}>
                <Slot />
            </View>
            
            <Toast position='top' topOffset={40} />
        </View>
    );
}