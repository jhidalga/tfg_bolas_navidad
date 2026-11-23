import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { toastConfig } from '../componentes/avisos';
import Toast from 'react-native-toast-message';
import { useEffect, useState } from 'react';
import Bienvenida, { debeMostrarBienvenida } from '../componentes/bienvenida';
import { supabase } from '../lib/supabase';
import { temaActual, tc, sincronizarTema } from '../lib/tema';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [bienvenida, setBienvenida] = useState(() => !!temaActual.bienvenida && debeMostrarBienvenida());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = temaActual.marca + ' | IES Laguna de Tollón';
      sincronizarTema();
      // El aviso escondido mide más que pantallas muy estrechas y creaba scroll lateral
      const css = document.createElement('style');
      css.textContent = 'html,body{overflow:hidden;height:100%;min-height:100%;background:' + temaActual.fondo + '}html,body{overscroll-behavior:none}body{position:fixed;top:0;left:0;right:0;bottom:0;width:100%}input:focus,textarea:focus,select:focus{outline:none !important;border-color:' + tc('#a52a2a') + ' !important;box-shadow:inset 0 0 0 1px ' + tc('#a52a2a') + '}select{background-color:transparent}';
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
      <Toast position='top' topOffset={40} config={toastConfig} />
    </SafeAreaProvider>
    </ThemeProvider>
  );
}