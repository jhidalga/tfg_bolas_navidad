import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

/**
 * Cualquier dirección que no existe lleva a inicio si hay sesión
 * y a la portada si no la hay.
 */
export default function NoEncontrada() {
    const router = useRouter();
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            router.replace(session ? '/inicio' : '/');
        });
    }, []);
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
