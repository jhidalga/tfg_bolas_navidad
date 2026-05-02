import React, { useRef } from 'react';
import { View, Text, Image, Pressable, Animated } from 'react-native';
import { styles } from '../styles/card/card.styles';

interface CardProps {
    titulo: string;
    imagenUrl: string | null;
    precio: string;
    personalizable?: boolean;
    cantidadModelos?: number;
    cantidadColores?: number;
    deshabilitado?: boolean;
    onPress: () => void;
}

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

    const handleHoverIn = () => {
        if (deshabilitado) return;
        Animated.spring(scaleAnim, {
            toValue: 1.03,
            useNativeDriver: true,
        }).start();
    };

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
                        <Text style={styles.textoPersonalizable}>✨ Personalizable</Text>
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