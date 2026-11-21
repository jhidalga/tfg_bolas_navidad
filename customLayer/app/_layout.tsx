import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useEffect, useState } from 'react';
import Bienvenida, { debeMostrarBienvenida } from '../componentes/bienvenida';
import { supabase } from '../lib/supabase';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [bienvenida, setBienvenida] = useState(() => debeMostrarBienvenida());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Adornos navideños | IES Laguna de Tollón';
      // El aviso escondido mide más que pantallas muy estrechas y creaba scroll lateral
      const css = document.createElement('style');
      css.textContent = 'html,body{overflow-x:hidden;min-height:100%;background:#3d0b0f radial-gradient(ellipse at 50% 0,#7a1d20 0%,#4a0f12 55%,#2e070a 100%) fixed}input:focus,textarea:focus,select:focus{outline:2px solid #a52a2a !important;outline-offset:1px}select{background-color:transparent}';
      document.head.appendChild(css);
    }
  }, []);

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
    <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } }}>
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
      {bienvenida && <Bienvenida onTerminar={() => setBienvenida(false)} />}
      <Toast position='top' topOffset={40} />
    </SafeAreaProvider>
    </ThemeProvider>
  );
}