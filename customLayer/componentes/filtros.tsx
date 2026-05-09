import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { styles } from '../styles/filtros/filtros.styles';

/**
 * Propiedades para el componente Filtros.
 */
export interface FiltrosProps {
    /** Valor actual del filtro de búsqueda por nombre */
    nombre: string;
    /** Función para actualizar el estado del nombre a buscar */
    setNombre: (t: string) => void;
    /** Estado del checkbox para filtrar solo productos personalizables */
    personalizable: boolean;
    /** Función para alternar el estado del filtro de personalización */
    setPersonalizable: (v: boolean) => void;
    /** Valor actual del filtro de precio mínimo (en texto) */
    precioMin: string;
    /** Función para actualizar el estado del precio mínimo */
    setPrecioMin: (v: string) => void;
    /** Valor actual del filtro de precio máximo (en texto) */
    precioMax: string;
    /** Función para actualizar el estado del precio máximo */
    setPrecioMax: (v: string) => void;
    /** Rango absoluto de precios (mínimo y máximo) disponibles en los productos actuales. Útil para placeholders. */
    minMax: { min: number; max: number };
}

/**
 * Componente visual que renderiza un panel de filtros laterales o superiores.
 * Permite al usuario afinar la búsqueda de productos mediante nombre, 
 * posibilidad de personalización y rango de precios.
 * * @param props - Propiedades del componente definidas en {@link FiltrosProps}
 * @returns Componente View que contiene los inputs y controles del filtro.
 */
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