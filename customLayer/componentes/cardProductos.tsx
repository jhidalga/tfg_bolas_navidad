import React, { useRef } from 'react';
import { View, Text, Image, Pressable, Animated } from 'react-native';
import { styles } from '../styles/card/card.styles';

/**
 * Propiedades para el componente CardProducto.
 */
export interface CardProps {
    /** Título principal del producto a mostrar */
    titulo: string;
    /** URL de la imagen del producto. Puede ser null si no tiene imagen asignada */
    imagenUrl: string | null;
    /** Precio del producto formateado como texto */
    precio: string;
    /** Indica si el producto permite añadir personalización (texto, etc.) */
    personalizable?: boolean;
    /** Número de modelos distintos disponibles para este producto */
    cantidadModelos?: number;
    /** Número de colores distintos disponibles para este producto */
    cantidadColores?: number;
    /** Si es true, la tarjeta se muestra atenuada y las animaciones se desactivan */
    deshabilitado?: boolean;
    /** Función que se ejecuta al presionar la tarjeta */
    onPress: () => void;
}

/**
 * Componente visual que representa la tarjeta de un producto.
 * Incluye animaciones de escala al hacer hover (útil en web) y muestra 
 * detalles como precio, personalización, modelos y colores.
 * * @param props - Propiedades del componente definidas en {@link CardProps}
 * @returns Un componente Animated.View que contiene la información del producto
 */
export default function CardProducto({ 
    titulo, 
    imagenUrl, 
    precio, 
    personalizable, 
    cantidadModelos, 
    cantidadColores, 
    deshabilitado, 
    onPress 
}: CardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    /**
     * Maneja la animación de entrada (hover) aumentando ligeramente la escala.
     * No hace nada si la tarjeta está deshabilitada.
     */
    const handleHoverIn = () => {
        if (deshabilitado) return;
        Animated.spring(scaleAnim, {
            toValue: 1.03,
            useNativeDriver: true,
        }).start();
    };

    /**
     * Maneja la animación de salida restaurando la escala original.
     * No hace nada si la tarjeta está deshabilitada.
     */
    const handleHoverOut = () => {
        if (deshabilitado) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[
            styles.contenedor, 
            { transform: [{ scale: scaleAnim }] },
            deshabilitado && styles.contenedorDeshabilitado
        ]}>
            <Pressable 
                onPress={onPress}
                onHoverIn={handleHoverIn}
                onHoverOut={handleHoverOut}
                style={{ flex: 1 }}
            >
                <View style={styles.imagenContenedor}>
                    {imagenUrl ? (
                        <Image source={{ uri: imagenUrl }} style={styles.imagen} />
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
                
                <View style={styles.info}>
                    <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
                    <Text style={styles.precio}>{precio} €</Text>
                    
                    {personalizable && (
                        <Text style={styles.textoPersonalizable}> Personalizable</Text>
                    )}
                    
                    {cantidadModelos !== undefined && cantidadModelos > 1 && (
                        <Text style={styles.textoDetalles}>{cantidadModelos} modelos disponibles</Text>
                    )}
                    
                    {cantidadColores !== undefined && cantidadColores > 1 && (
                        <Text style={styles.textoDetalles}>{cantidadColores} colores</Text>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}