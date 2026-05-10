import { Stack, useRouter, useSegments } from "expo-router";
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const paginaActiva = segments[0] as string | undefined;
      const enPaginaPublica = !paginaActiva || paginaActiva === 'login' || paginaActiva === 'registro' || paginaActiva === 'recuperar';
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        if (enPaginaPublica) {
          router.replace('/inicio'); 
        }
      } else if (event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [segments]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast position='top' topOffset={40} />
    </SafeAreaProvider>
  );
}