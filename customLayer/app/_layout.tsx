import { Stack, useRouter, useSegments } from "expo-router";
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const paginaActiva = segments[0] as string | undefined;
      const enPaginaPublica = !paginaActiva || paginaActiva === 'login' || paginaActiva === 'registro' || paginaActiva === 'recuperar';
      if (event === 'SIGNED_IN' && session) {
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
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast position='top' topOffset={40} />
    </>
  );
}