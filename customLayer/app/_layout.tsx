import { Stack, useRouter, useSegments } from "expo-router";
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Componente raíz del enrutamiento de la aplicación (Expo Router).
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/inicio'); 
      }
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/inicio');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/'); 
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast position='top' topOffset={40} />
    </>
  );
}