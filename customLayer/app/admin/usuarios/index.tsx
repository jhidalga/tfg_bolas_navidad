import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminUsuarios/adminUsuarios.styles';
import Toast from 'react-native-toast-message';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

/**
 * Pantalla de administración para la gestión de usuarios registrados.
 * Muestra una tabla con la información de todos los usuarios (nombre, email, curso, 
 * estado de profesor, cantidad de pedidos y rol actual). Permite buscar usuarios 
 * por nombre y alternar sus privilegios de administrador.
 * * @returns Componente que renderiza el gestor de usuarios.
 */
export default function GestorUsuariosAdmin() {
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;

    useEffect(() => { cargarUsuarios(); }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    /**
     * Muestra una notificación emergente (Toast) en pantalla.
     * * @param mensaje - Texto a mostrar en la notificación.
     * @param color - Color en formato HEX para determinar si es de éxito o error.
     */
    const triggerToast = (mensaje: string, color = '#3b82f6') => {
        const tipo = color === '#ef4444' ? 'error' : 'success';
        Toast.show({ type: tipo, text1: mensaje });
    };

    /**
     * Obtiene la lista completa de usuarios registrados desde la API.
     * Requiere que el solicitante tenga una sesión activa y privilegios de administrador.
     */
    const cargarUsuarios = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch(`${API_URL}/admin/usuarios`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsuarios(data);
            }
        } catch (error) {
            triggerToast("Error de carga", "#ef4444");
        } finally {
            setCargando(false);
        }
    };

    /**
     * Alterna los privilegios de administrador de un usuario específico.
     * Envía una petición PATCH a la API y, si es exitosa, actualiza el estado local.
     * * @param id - Identificador único del usuario a modificar.
     * @param estadoActual - El valor booleano actual del privilegio de administrador.
     */
    const toggleAdmin = async (id: string, estadoActual: boolean) => {
        const { data: { session } } = await supabase.auth.getSession();
        const nuevoEstado = !estadoActual;
        try {
            const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ administrador: nuevoEstado }) 
            });
            if (res.ok) {
                setUsuarios(prev => prev.map(u => u.id === id ? { ...u, administrador: nuevoEstado } : u));
                triggerToast("Rol actualizado", "#10b981");
            }
        } catch (error) {
            triggerToast("Error de conexión", "#ef4444");
        }
    };

    /**
     * Filtra la lista de usuarios en memoria basándose en el texto de búsqueda.
     * Se evalúa coincidencia parcial con el nombre del usuario (case-insensitive).
     */
    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            if (!busqueda) return true;
            return u.nombre?.toLowerCase().includes(busqueda.toLowerCase());
        });
    }, [usuarios, busqueda]);

    const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPorPagina);
    const usuariosPaginados = usuariosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina,
        paginaActual * itemsPorPagina
    );

    if (cargando) return <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                        <Text style={styles.txtVolver}>⬅ Volver</Text>
                    </Pressable>
                    <Text style={styles.titulo}>Gestión de Usuarios</Text>
                    <TextInput placeholder="Buscar..." style={styles.inputBuscar} value={busqueda} onChangeText={(text) => setBusqueda(text)} />
                </View>

                <View style={styles.contenedorTabla}>
                    <View style={styles.tabla}>
                        <View style={styles.cabecera}>
                            <Text style={[styles.colCabecera, styles.colNombre]}>Nombre</Text>
                            <Text style={[styles.colCabecera, styles.colEmail]}>Email</Text>
                            <Text style={[styles.colCabecera, styles.colCurso, { textAlign: 'center' }]}>Curso/Departamento</Text>
                            <Text style={[styles.colCabecera, styles.colProf, { textAlign: 'center' }]}>Profesor</Text>
                            <Text style={[styles.colCabecera, styles.colPedidos, { textAlign: 'center' }]}>Pedidos</Text>
                            <Text style={[styles.colCabecera, styles.colRol, { textAlign: 'right' }]}>Rol</Text>
                        </View>

                        {usuariosPaginados.map((u) => (
                            <View key={u.id} style={styles.fila}>
                                <View style={styles.colNombre}>
                                    <Text style={styles.txtNormal} numberOfLines={1}>{u.nombre || '-'}</Text>
                                </View>
                                <View style={styles.colEmail}>
                                    <Text style={styles.txtSecundario} numberOfLines={1}>{u.email}</Text>
                                </View>
                                
                                <View style={styles.colCurso}>
                                    <View style={styles.badgeAzul}>
                                        <Text style={styles.txtBadgeAzul}>{u.curso || 'Sin curso'}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.colProf}>
                                    <View style={styles.badgeProf}>
                                        <Text style={{ color: '#64748b', fontSize: 14, fontWeight: 'bold' }}>
                                            {u.profesor ? 'SÍ' : 'No'}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.colPedidos}>
                                    <View style={styles.badgeGris}>
                                        <Text style={styles.txtBadgeGris}>{u.num_pedidos || 0} Pedidos</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.colRol}>
                                    <Pressable 
                                        style={[styles.btnRol, u.administrador ? styles.btnAdmin : styles.btnUser]} 
                                        onPress={() => toggleAdmin(u.id, u.administrador)}
                                    >
                                        <Text style={u.administrador ? styles.txtBtnAdmin : styles.txtBtnUser}>
                                            {u.administrador ? 'ADMIN' : 'USER'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
                {totalPaginas > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 10, gap: 15 }}>
                        <Pressable 
                            style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }, paginaActual === 1 ? { backgroundColor: '#cbd5e1' } : { backgroundColor: '#3b82f6' }]}
                            disabled={paginaActual === 1}
                            onPress={() => setPaginaActual(p => p - 1)}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Anterior</Text>
                        </Pressable>
                        
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#475569' }}>
                            Página {paginaActual} de {totalPaginas}
                        </Text>
                        
                        <Pressable 
                            style={[{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }, paginaActual === totalPaginas ? { backgroundColor: '#cbd5e1' } : { backgroundColor: '#3b82f6' }]}
                            disabled={paginaActual === totalPaginas}
                            onPress={() => setPaginaActual(p => p + 1)}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Siguiente</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}