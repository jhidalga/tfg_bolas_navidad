import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { styles as estilosEscritorio } from '../../../styles/adminUsuarios/adminUsuarios.styles';
import { styles as estilosMovil } from '../../../styles/adminUsuarios/adminUsuarios.styles.movil';
import { useEstilos } from '../../../lib/responsive';
import Toast from 'react-native-toast-message';
import { plural } from '../../../lib/formato';
import { useConfirmar } from '../../../componentes/confirmar';
import Desplegable from '../../../componentes/desplegable';

const ORDENES = ['Nombre', 'Email', 'Profesor', 'Pedidos'];

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || ''}/api`;

/**
 * Pantalla de administración para la gestión de usuarios registrados.
 * Muestra una tabla con la información de todos los usuarios (nombre, email, curso, 
 * estado de profesor, cantidad de pedidos y rol actual). Permite buscar usuarios 
 * por nombre y alternar sus privilegios de administrador.
 * * @returns Componente que renderiza el gestor de usuarios.
 */
export default function GestorUsuariosAdmin() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const { confirmar, dialogo } = useConfirmar();
    const [cargando, setCargando] = useState(true);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [curso, setCurso] = useState('Todos');
    const [depto, setDepto] = useState('Todos');
    const [rol, setRol] = useState('Todos');
    const [prof, setProf] = useState('Todos');
    const [orden, setOrden] = useState('Nombre');
    const [descendente, setDescendente] = useState(false);
    const [abierto, setAbierto] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;

    useEffect(() => { cargarUsuarios(); }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, curso, depto, rol, prof, orden, descendente]);

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
    const toggleAdmin = async (id: string, estadoActual: boolean, nombre: string = 'esta persona') => {
        const ok = await confirmar(
            estadoActual ? `¿Quitar los permisos de administrador a ${nombre}?` : `¿Dar permisos de administrador a ${nombre}?`,
            estadoActual ? 'Quitar permisos' : 'Hacer administrador',
            estadoActual
        );
        if (!ok) return;
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
                triggerToast(nuevoEstado ? "Ahora es administrador" : "Ya no es administrador", "#10b981");
            } else {
                triggerToast("No se pudo cambiar el rol", "#ef4444");
            }
        } catch (error) {
            triggerToast("Error de conexión", "#ef4444");
        }
    };

    const cursos = useMemo(() => ['Todos', ...Array.from(new Set(usuarios.filter(u => !u.profesor).map(u => u.curso).filter(Boolean))).sort() as string[]], [usuarios]);
    const deptos = useMemo(() => ['Todos', ...Array.from(new Set(usuarios.filter(u => u.profesor).map(u => u.curso).filter(Boolean))).sort() as string[]], [usuarios]);

    /**
     * Filtra la lista en memoria por texto, curso, departamento, rol y profesor.
     * Después la ordena por el campo elegido.
     */
    const usuariosFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        const lista = usuarios.filter(u =>
            (!q || u.nombre?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) &&
            (curso === 'Todos' || (!u.profesor && u.curso === curso)) &&
            (depto === 'Todos' || (!!u.profesor && u.curso === depto)) &&
            (rol === 'Todos' || (rol === 'Solo admins' ? !!u.administrador : !u.administrador)) &&
            (prof === 'Todos' || (prof === 'Solo profesores' ? !!u.profesor : !u.profesor))
        );
        const texto = (v: any) => String(v || '').toLowerCase();
        lista.sort((a, b) => {
            let r = 0;
            if (orden === 'Nombre') r = texto(a.nombre).localeCompare(texto(b.nombre), 'es');
            else if (orden === 'Email') r = texto(a.email).localeCompare(texto(b.email), 'es');
            else if (orden === 'Profesor') r = Number(!!b.profesor) - Number(!!a.profesor) || texto(a.nombre).localeCompare(texto(b.nombre), 'es');
            else r = (a.num_pedidos || 0) - (b.num_pedidos || 0);
            return descendente ? -r : r;
        });
        return lista;
    }, [usuarios, busqueda, curso, depto, rol, prof, orden, descendente]);

    const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPorPagina);
    const usuariosPaginados = usuariosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina,
        paginaActual * itemsPorPagina
    );

    if (cargando) return <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />;

    return (
        <View style={styles.container}>
            {dialogo}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.btnVolver}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="arrow-back" size={18} color="#475569" /><Text style={styles.txtVolver}>Volver</Text></View>
                    </Pressable>
                    <Text style={styles.titulo}>Gestión de Usuarios</Text>
                    <TextInput placeholder="Buscar por nombre o correo" style={styles.inputBuscar} value={busqueda} onChangeText={(text) => setBusqueda(text)} />
                </View>

                <View style={{ width: '100%', maxWidth: 1000, marginBottom: 18 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 0, alignItems: 'flex-start', zIndex: 20 }}>
                        <Desplegable titulo="Curso" opciones={cursos} valor={curso} abierto={abierto === 'curso'} ancho={150}
                            alAbrir={() => setAbierto(abierto === 'curso' ? null : 'curso')}
                            alElegir={(v) => { setCurso(v); setDepto('Todos'); setAbierto(null); }} />
                        <Desplegable titulo="Departamento" opciones={deptos} valor={depto} abierto={abierto === 'depto'} ancho={170}
                            alAbrir={() => setAbierto(abierto === 'depto' ? null : 'depto')}
                            alElegir={(v) => { setDepto(v); setCurso('Todos'); setAbierto(null); }} />
                        <Desplegable titulo="Rol" opciones={['Todos', 'Solo admins', 'Sin admin']} valor={rol} abierto={abierto === 'rol'} ancho={150} etiquetaTodos="Todos (rol)"
                            alAbrir={() => setAbierto(abierto === 'rol' ? null : 'rol')}
                            alElegir={(v) => { setRol(v); setAbierto(null); }} />
                        <Desplegable titulo="Profesor" opciones={['Todos', 'Solo profesores', 'Sin profesores']} valor={prof} abierto={abierto === 'prof'} ancho={160} etiquetaTodos="Todos (profesor)"
                            alAbrir={() => setAbierto(abierto === 'prof' ? null : 'prof')}
                            alElegir={(v) => { setProf(v); setAbierto(null); }} />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center', zIndex: 10 }}>
                        <Text style={{ color: '#475569', fontWeight: '600', flexShrink: 0 }}>Ordenar por</Text>
                        <Desplegable titulo="Ordenar por" opciones={ORDENES} valor={orden} abierto={abierto === 'orden'} ancho={140}
                            alAbrir={() => setAbierto(abierto === 'orden' ? null : 'orden')}
                            alElegir={(v) => { setOrden(v); setDescendente(v === 'Pedidos'); setAbierto(null); }} />
                        <Pressable onPress={() => setDescendente(!descendente)} accessibilityLabel="Cambiar sentido del orden"
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Ionicons name={descendente ? 'arrow-down' : 'arrow-up'} size={16} color="#475569" />
                            <Text style={{ color: '#1e293b', fontSize: 15 }}>{orden === 'Pedidos' ? (descendente ? 'Más primero' : 'Menos primero') : orden === 'Profesor' ? (descendente ? 'Alumnos primero' : 'Profes primero') : (descendente ? 'Z a A' : 'A a Z')}</Text>
                        </Pressable>
                    </View>
                    <Text style={{ color: '#64748b', marginTop: 10 }}>{plural(usuariosFiltrados.length, 'usuario', 'usuarios')}</Text>
                </View>

                <View style={styles.contenedorTabla}>
                    <View style={styles.tabla}>
                        <View style={styles.cabecera}>
                            <Text style={[styles.colCabecera, styles.colNombre]}>Nombre</Text>
                            <Text style={[styles.colCabecera, styles.colEmail]}>Email</Text>
                            <Text style={[styles.colCabecera, styles.colCurso, { textAlign: 'center' }]}>Curso/Departamento</Text>
                            <Text style={[styles.colCabecera, styles.colProf, { textAlign: 'center' }]}>Profesor</Text>
                            <Text style={[styles.colCabecera, styles.colPedidos, { textAlign: 'center' }]}>Pedidos</Text>
                            <Text style={[styles.colCabecera, styles.colRol, { textAlign: 'center' }]}>Rol</Text>
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
                                        <Text style={styles.txtBadgeGris}>{plural(u.num_pedidos || 0, 'pedido', 'pedidos')}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.colRol}>
                                    <Pressable 
                                        style={[styles.btnRol, u.administrador ? styles.btnAdmin : styles.btnUser]} 
                                        onPress={() => toggleAdmin(u.id, u.administrador, u.nombre)}
                                    >
                                        <Text style={u.administrador ? styles.txtBtnAdmin : styles.txtBtnUser}>
                                            {u.administrador ? 'Quitar admin' : 'Hacer admin'}
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