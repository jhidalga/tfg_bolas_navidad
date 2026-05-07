import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
export let esAdminGlobal = false;
export const setEsAdminGlobal = (valor: boolean) => { esAdminGlobal = valor; };

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