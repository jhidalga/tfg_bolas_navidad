import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import DropDownPicker from 'react-native-dropdown-picker';
import { styles } from '../../styles/adminPedidos/adminPedidos.styles';

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

    useEffect(() => {
        cargarPedidos();
    }, []);

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

    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter(pedido => {
            const coincideEstado = filtroEstado.length === 0 || filtroEstado.includes(pedido.estado);
            const cursoUsuario = pedido.usuarios?.curso || "Desconocido";
            const coincideCurso = filtroCurso.length === 0 || filtroCurso.includes(cursoUsuario);
            return coincideEstado && coincideCurso;
        });
    }, [pedidos, filtroEstado, filtroCurso]);

    const getEstilosBadge = (estado: string) => {
        switch (estado) {
            case 'Cancelado': return { bg: styles.bgRojo, txt: styles.txtRojo };
            case 'Completado': return { bg: styles.bgAzul, txt: styles.txtAzul };
            case 'Entregado': return { bg: styles.bgVerde, txt: styles.txtVerde };
            default: return { bg: styles.bgAmbar, txt: styles.txtAmbar };
        }
    };

    return (
        <View style={styles.contenedorPantalla}>
            <View style={styles.cabeceraPrincipal}>
                <Text style={styles.tituloHeader}>Gestión de Pedidos</Text>
                <Pressable style={styles.btnExportar} onPress={() => { }}>
                    <Text style={styles.txtBtnExportar}>📥 Exportar Excel</Text>
                </Pressable>
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
                    <View style={styles.gridTarjetas}>
                        {pedidosFiltrados.map(pedido => {
                            const badge = getEstilosBadge(pedido.estado);
                            return (
                                <View key={pedido.id} style={styles.tarjeta}>
                                    <Pressable
                                        style={styles.tarjetaInfo}
                                        onPress={() => router.push(`/admin/pedidos/${pedido.id}` as any)}
                                    >
                                        <View style={styles.filaTop}>
                                            <Text style={styles.idPedido}>#{pedido.id.slice(0, 8).toUpperCase()}</Text>
                                            <View style={[styles.badgeEstado, badge.bg]}>
                                                <Text style={[styles.txtBadgeEstado, badge.txt]}>{pedido.estado}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.datosCliente}>
                                            <Text style={styles.txtDato}>{new Date(pedido.created_at).toLocaleDateString()}</Text>
                                            <Text style={styles.txtDato}>👤 {pedido.usuarios?.nombre || "Desconocido"}</Text>
                                            <Text style={styles.txtDato}>📚 {pedido.usuarios?.curso || "Desconocido"}</Text>
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
                )}
            </ScrollView>
        </View>
    );
}