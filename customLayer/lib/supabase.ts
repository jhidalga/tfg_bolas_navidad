import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Estado global que indica si el usuario autenticado actualmente tiene permisos de administrador.
 * Se utiliza para realizar cambios rápidos en la interfaz sin esperar a nuevas peticiones de la API.
 */
export let esAdminGlobal = false;

/**
 * Actualiza el valor del estado global de administrador.
 * @param valor - Nuevo valor booleano para el estado de administrador.
 */
export const setEsAdminGlobal = (valor: boolean) => { esAdminGlobal = valor; };

/**
 * Determina y devuelve el motor de almacenamiento persistente adecuado según la plataforma actual.
 * - En entornos Web (Navegador): Utiliza `localStorage`.
 * - En entornos Web (Server-Side Rendering): Devuelve `null`.
 * - En entornos Móviles (iOS/Android): Utiliza `AsyncStorage` de React Native.
 * @returns Objeto de almacenamiento compatible o null.
 */
const getStorage = () => {
    if (Platform.OS === 'web') {
        if (typeof window === 'undefined') {
            return null;
        }
        return localStorage;
    }
    return AsyncStorage;
};

const customStorage = getStorage();

/**
 * Instancia principal del cliente de Supabase para la comunicación con la base de datos y autenticación.
 * Está configurado con persistencia adaptativa (`customStorage`), lo que permite mantener 
 * la sesión del usuario intacta y auto-refrescar los tokens tanto en la versión web como en la móvil.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage || {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});