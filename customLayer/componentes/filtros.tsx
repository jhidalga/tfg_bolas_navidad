import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { styles } from '../styles/filtros/filtros.styles';

interface FiltrosProps {
    nombre: string;
    setNombre: (t: string) => void;
    personalizable: boolean;
    setPersonalizable: (v: boolean) => void;
    precioMin: string;
    setPrecioMin: (v: string) => void;
    precioMax: string;
    setPrecioMax: (v: string) => void;
    
    minMax: { min: number; max: number };
}

export default function Filtros({ 
    nombre, setNombre, personalizable, setPersonalizable, 
    precioMin, setPrecioMin, precioMax, setPrecioMax, minMax 
}: FiltrosProps) {
    return (
        <View style={styles.contenedorFiltros}>
            <Text style={styles.tituloFiltro}>Filtros</Text>

            <View style={styles.grupoFiltro}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput 
                    style={styles.input}
                    placeholder="Buscar..."
                    value={nombre}
                    onChangeText={setNombre}
                />
            </View>

            <View style={styles.grupoFiltro}>
                <Pressable style={styles.checkboxRow} onPress={() => setPersonalizable(!personalizable)}>
                    <View style={[styles.checkboxOuter, personalizable && styles.checkboxSelected]}>
                        {personalizable && <Text style={styles.checkInner}>✓</Text>}
                    </View>
                    <Text style={styles.label}>Personalizable</Text>
                </Pressable>
            </View>

            <View style={styles.grupoFiltro}>
                <Text style={styles.label}>Precio €</Text>
                <View style={styles.rowInputs}>
                    <TextInput 
                        style={styles.inputRange}
                        keyboardType="numeric"
                        placeholder={minMax.min.toString()}
                        value={precioMin}
                        onChangeText={setPrecioMin}
                    />
                    <Text style={{ color: '#94a3b8' }}>-</Text>
                    <TextInput 
                        style={styles.inputRange}
                        keyboardType="numeric"
                        placeholder={minMax.max.toString()} 
                        value={precioMax}
                        onChangeText={setPrecioMax}
                    />
                </View>
            </View>
        </View>
    );
}