import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DropDownPicker from 'react-native-dropdown-picker';
import { styles } from '../../styles/adminPedidos/adminPedidos.styles';
import FontAwesome5 from '@expo/vector-icons/build/FontAwesome5';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

export default function ListaPedidosAdmin() {
    const router = useRouter();
    const [pedidos, setPedidos] = useState<any[]>([]);
    
    const [openEstado, setOpenEstado] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
    const [itemsEstado, setItemsEstado] = useState([
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'Completado', value: 'Completado' },
        { label: 'Entregado', value: 'Entregado' },
        { label: 'Cancelado', value: 'Cancelado' }
    ]);

    const [openCurso, setOpenCurso] = useState(false);
    const [filtroCurso, setFiltroCurso] = useState<string[]>([]);
    const [itemsCurso, setItemsCurso] = useState<{ label: string, value: string }[]>([]);

    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 12;

    const [modoEliminar, setModoEliminar] = useState(false);
    const [seleccionados, setSeleccionados] = useState<string[]>([]);

    useEffect(() => {
        cargarPedidos();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [filtroEstado, filtroCurso]);

    const cargarPedidos = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/pedidos`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (respuesta.ok) {
                const datos = await respuesta.json();
                setPedidos(datos);
                const todosLosCursos = datos.map((p: any) => p.usuarios?.curso || "Desconocido");
                const cursosUnicos = Array.from(new Set(todosLosCursos)) as string[];
                const opcionesCurso = cursosUnicos.map(curso => ({
                    label: curso,
                    value: curso
                }));
                opcionesCurso.sort((a, b) => a.label.localeCompare(b.label));
                setItemsCurso(opcionesCurso);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const cambiarEstado = async (id: string, nuevoEstado: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const respuesta = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/pedidos/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (respuesta.ok) {
                setPedidos(prevPedidos =>
                    prevPedidos.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p)
                );
            }
        } catch (error) {
            console.error(error);
        }
    };

    const seleccionarEliminar = (id: string) => {
        setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const borrarPedidosSeleccionados = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        try {
            const promesas = seleccionados.map(id => 
                fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/admin/pedidos/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
            );
            
            await Promise.all(promesas);
            
            setPedidos(prev => prev.filter(p => !seleccionados.includes(p.id)));
            setSeleccionados([]);
            setModoEliminar(false);
        } catch (error) {
            console.error(error);
        }
    };

    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter(pedido => {
            const coincideEstado = filtroEstado.length === 0 || filtroEstado.includes(pedido.estado);
            const cursoUsuario = pedido.usuarios?.curso || "Desconocido";
            const coincideCurso = filtroCurso.length === 0 || filtroCurso.includes(cursoUsuario);
            return coincideEstado && coincideCurso;
        });
    }, [pedidos, filtroEstado, filtroCurso]);

    const totalPaginas = Math.ceil(pedidosFiltrados.length / itemsPorPagina);
    const pedidosPaginados = pedidosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina, 
        paginaActual * itemsPorPagina
    );

    const getEstilosBadge = (estado: string) => {
        switch (estado) {
            case 'Cancelado': return { bg: styles.bgRojo, txt: styles.txtRojo };
            case 'Completado': return { bg: styles.bgAzul, txt: styles.txtAzul };
            case 'Entregado': return { bg: styles.bgVerde, txt: styles.txtVerde };
            default: return { bg: styles.bgAmbar, txt: styles.txtAmbar };
        }
    };

const exportarCSV = async () => {
        const cabeceras = "Producto,Modelo,Personalización (Nombre),Color,Cantidad,Cliente,Curso,Estado \n";
        
        let filas = "";
        pedidosFiltrados.forEach(p => {
            const cliente = p.usuarios?.nombre || "Desconocido";
            const curso = p.usuarios?.curso || "Desconocido";
            const estado = p.estado;

            if (p.detalles_pedido && p.detalles_pedido.length > 0) {
                p.detalles_pedido.forEach((detalle: any) => {
                    const producto = detalle.productos?.nombre || "Desconocido";
                    const modelo = detalle.modelo || "Base";
                    const color = detalle.color || "-";
                    const personalizacion = detalle.personalizacion === 'Sin texto' ? '' : detalle.personalizacion;
                    const cantidad = detalle.cantidad || 1;
                    filas += `"${producto}","${modelo}","${personalizacion}","${color}","${cantidad}","${cliente}","${curso}","${estado}"\n`;
                });
            }
        });

        const contenidoCSV = cabeceras + filas;

        try {
            if (Platform.OS === 'web') {
                const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', 'hoja_fabricacion.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Forzamos "any" para evitar el error de TypeScript con los tipos locales de Expo
                const FS = FileSystem as any;
                const Share = Sharing as any;
                
                const dir = FS.documentDirectory || '';
                const uri = dir + 'hoja_fabricacion.csv';
                
                // Aseguramos codificación UTF-8
                await FS.writeAsStringAsync(uri, contenidoCSV, {
                    encoding: FS.EncodingType ? FS.EncodingType.UTF8 : 'utf8'
                });
                
                const isAvailable = await Share.isAvailableAsync();
                if (isAvailable) {
                    // Los metadatos son la clave para que el móvil reconozca que es un archivo y te deje compartirlo/guardarlo
                    await Share.shareAsync(uri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Exportar pedidos CSV',
                        UTI: 'public.comma-separated-values-text'
                    });
                } else {
                    Toast.show({ type: 'error', text1: 'No se puede compartir en este dispositivo' });
                }
            }
        } catch (error) {
            console.error("Error al exportar:", error);
            Toast.show({ type: 'error', text1: 'Hubo un error al exportar los datos.' });
            if (Platform.OS !== 'web') {
                alert("Hubo un error al exportar los datos.");
            }
        }
    };

    return (
        <View style={styles.contenedorPantalla}>
            <View style={styles.cabeceraPrincipal}>
                <Text style={styles.tituloHeader}>Gestión de Pedidos</Text>
                
                <View style={styles.contenedorAccionesHeader}>
                    {!modoEliminar ? (
                        <>
                            <Pressable style={styles.btnExportar} onPress={exportarCSV}>
                                <Text style={styles.txtBtnExportar}><Entypo name="export" size={16} color="white" /> Exportar</Text>
                            </Pressable>
                            <Pressable style={styles.btnBorrarModo} onPress={() => setModoEliminar(true)}>
                                <Text style={styles.txtBtnExportar}><FontAwesome5 name="trash" size={14} color="white" /> Borrar</Text>
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <Pressable style={styles.btnCancelarModo} onPress={() => { setModoEliminar(false); setSeleccionados([]); }}>
                                <Text style={styles.txtBtnCancelarModo}>Cancelar</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.btnConfirmarBorrar, seleccionados.length === 0 && { opacity: 0.5 }]} 
                                disabled={seleccionados.length === 0} 
                                onPress={borrarPedidosSeleccionados}
                            >
                                <Text style={styles.txtBtnConfirmarBorrar}>Eliminar ({seleccionados.length})</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </View>

            <View style={styles.barraFiltros}>
                <View style={[styles.filtroWrapper, { zIndex: openEstado ? 3000 : 2000 }]}>
                    <DropDownPicker
                        open={openEstado}
                        value={filtroEstado}
                        items={itemsEstado}
                        setOpen={setOpenEstado}
                        setValue={setFiltroEstado}
                        setItems={setItemsEstado}
                        multiple={true}
                        mode="BADGE"
                        placeholder="Filtrar por Estado"
                        listMode="SCROLLVIEW"
                        onOpen={() => setOpenCurso(false)}
                        style={styles.dropdown}
                        textStyle={styles.textoDropdown}
                        badgeStyle={styles.badgeDropdown}
                        badgeTextStyle={styles.textoBadgeDropdown}
                    />
                </View>
                <View style={[styles.filtroWrapper, { zIndex: openCurso ? 3000 : 1000 }]}>
                    <DropDownPicker
                        open={openCurso}
                        value={filtroCurso}
                        items={itemsCurso}
                        setOpen={setOpenCurso}
                        setValue={setFiltroCurso}
                        setItems={setItemsCurso}
                        multiple={true}
                        mode="BADGE"
                        placeholder="Filtrar por Curso"
                        listMode="SCROLLVIEW"
                        onOpen={() => setOpenEstado(false)}
                        style={styles.dropdown}
                        textStyle={styles.textoDropdown}
                        badgeStyle={styles.badgeDropdown}
                        badgeTextStyle={styles.textoBadgeDropdown}
                        dropDownContainerStyle={styles.dropdownContainer}
                    />
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {pedidosFiltrados.length === 0 ? (
                    <View style={styles.estadoVacio}>
                        <Text style={styles.txtEstadoVacio}>No se encontraron pedidos con estos filtros.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.gridTarjetas}>
                            {pedidosPaginados.map(pedido => {
                                const badge = getEstilosBadge(pedido.estado);
                                const isSelected = seleccionados.includes(pedido.id);
                                return (
                                    <View key={pedido.id} style={styles.tarjeta}>
                                        <Pressable
                                            style={[styles.tarjetaInfo, modoEliminar && isSelected && styles.tarjetaSeleccionada]}
                                            onPress={() => {
                                                if (modoEliminar) {
                                                    seleccionarEliminar(pedido.id);
                                                } else {
                                                    router.push(`/admin/pedidos/${pedido.id}` as any);
                                                }
                                            }}
                                        >
                                            <View style={styles.filaTop}>
                                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                                    {modoEliminar && (
                                                        <View style={[styles.checkOuter, isSelected && styles.checkInner]}>
                                                            {isSelected && <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>✓</Text>}
                                                        </View>
                                                    )}
                                                    <Text style={styles.idPedido}>#{pedido.id.slice(0, 8).toUpperCase()}</Text>
                                                </View>
                                                <View style={[styles.badgeEstado, badge.bg]}>
                                                    <Text style={[styles.txtBadgeEstado, badge.txt]}>{pedido.estado}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.datosCliente}>
                                                <Text style={styles.txtDato}><FontAwesome name="calendar" size={16} color="black" /> {new Date(pedido.created_at).toLocaleDateString()}</Text>
                                                <Text style={styles.txtDato}><FontAwesome5 name="user" size={14} color="black" /> {pedido.usuarios?.nombre || "Desconocido"}</Text>
                                                <Text style={styles.txtDato}><FontAwesome5 name="book" size={14} color="black" /> {pedido.usuarios?.curso || "Desconocido"}</Text>
                                            </View>
                                            <Text style={styles.precioTotal}>{pedido.total} €</Text>
                                        </Pressable>
                                        <View style={styles.tarjetaAcciones}>
                                            {['Pendiente', 'Completado', 'Entregado', 'Cancelado'].map(est => (
                                                <Pressable
                                                    key={est}
                                                    style={[
                                                        styles.btnCambiarEstado,
                                                        pedido.estado === est ? styles.btnEstadoActual : null
                                                    ]}
                                                    onPress={() => cambiarEstado(pedido.id, est)}
                                                >
                                                    <Text style={[
                                                        styles.txtCambiarEstado,
                                                        pedido.estado === est ? styles.txtEstadoActual : null
                                                    ]}>
                                                        {est}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
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
                    </>
                )}
            </ScrollView>
        </View>
    );
}