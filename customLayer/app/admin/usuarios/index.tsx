import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles } from '../../../styles/adminUsuarios/adminUsuarios.styles';
import Toast from 'react-native-toast-message';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;


export default function GestorUsuariosAdmin() {
    const router = useRouter();
    const [cargando, setCargando] = useState(true);
    const [usuarios, setUsuarios] = useState<any[]>([]);

    useEffect(() => { cargarUsuarios(); }, []);

    const triggerToast = (mensaje: string, color = '#3b82f6') => {
        const tipo = color === '#ef4444' ? 'error' : 'success';
        Toast.show({ type: tipo, text1: mensaje });
    };

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

    if (cargando) return <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                        <Text style={styles.txtVolver}>⬅ Volver</Text>
                    </Pressable>
                    <Text style={styles.titulo}>Gestión de Usuarios</Text>
                </View>

                <View style={styles.contenedorTabla}>
                    <View style={styles.tabla}>
                        <View style={styles.cabecera}>
                            <Text style={[styles.colCabecera, styles.colNombre]}>Nombre</Text>
                            <Text style={[styles.colCabecera, styles.colEmail]}>Email</Text>
                            <Text style={[styles.colCabecera, styles.colCurso, { textAlign: 'center' }]}>Curso</Text>
                            <Text style={[styles.colCabecera, styles.colProf, { textAlign: 'center' }]}>Profesor</Text>
                            <Text style={[styles.colCabecera, styles.colPedidos, { textAlign: 'center' }]}>Pedidos</Text>
                            <Text style={[styles.colCabecera, styles.colRol, { textAlign: 'right' }]}>Rol</Text>
                        </View>

                        {usuarios.map((u) => (
                            <View key={u.id} style={styles.fila}>
                                <View style={styles.colNombre}>
                                    <Text style={styles.txtNormal} numberOfLines={1}>{u.nombre || '-'}</Text>
                                </View>
                                <View style={styles.colEmail}>
                                    <Text style={styles.txtSecundario} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={styles.colCurso}>
                                    <Text style={styles.txtNormal}>{u.curso || '-'}</Text>
                                </View>
                                <View style={styles.colProf}>
                                    <View style={styles.badgeProf}>
                                        <Text style={{ color: '#64748b', fontSize: 14, fontWeight: 'bold' }}>
                                            {u.profesor ? 'SÍ' : 'No'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.colPedidos}>
                                    <View style={styles.badgePedidos}>
                                        <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>{u.num_pedidos}</Text>
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
            </ScrollView>
        </View>
    );
}