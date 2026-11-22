import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Desplegable sencillo: botón con el valor y, al abrirlo, una lista con scroll debajo.
 * Si el valor es "Todos", el botón muestra el título como texto de ayuda.
 */
export default function Desplegable({ titulo, opciones, valor, abierto, ancho, alAbrir, alElegir, etiquetaTodos }: { titulo: string; opciones: string[]; valor: string; abierto: boolean; ancho: number; alAbrir: () => void; alElegir: (v: string) => void; etiquetaTodos?: string }) {
    return (
        <View style={{ width: ancho }}>
            <Pressable onPress={alAbrir} style={[e.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} accessibilityLabel={`Filtrar por ${titulo}`}>
                <Text style={{ color: valor === 'Todos' ? '#64748b' : '#1e293b', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>{valor === 'Todos' ? titulo : valor}</Text>
                <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
            </Pressable>
            {abierto && (
                <ScrollView style={e.listaDesplegable} nestedScrollEnabled>
                    {opciones.map(o => (
                        <Pressable key={o} onPress={() => alElegir(o)} style={[e.opcionDesplegable, o === valor && { backgroundColor: '#eff6ff' }]}>
                            <Text style={{ color: o === valor ? '#1d4ed8' : '#1e293b', fontWeight: o === valor ? '700' : '400' }}>{o === 'Todos' ? (etiquetaTodos || `Todos (${titulo.toLowerCase()})`) : o}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const e = StyleSheet.create({
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    listaDesplegable: { maxHeight: 220, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 4 },
    opcionDesplegable: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
});
