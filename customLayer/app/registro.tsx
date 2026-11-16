import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { styles } from '../styles/registro/registro.styles';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function Registro() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [curso, setCurso] = useState('');
    const [profesor, setProfesor] = useState(false);
    const [nombre, setNombre] = useState('');
    const [cargando, setCargando] = useState(false);

    async function comprobarCredenciales() {
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        const cursoLimpio = curso.trim();
        const nombreLimpio = nombre.trim();

        if (!correoLimpio || !contrasenaLimpia || !cursoLimpio || !nombreLimpio) {
            Toast.show({ type: 'error', text1: 'Por favor, rellena todos los campos.' });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
            Toast.show({ type: 'error', text1: 'Introduce un correo electrónico válido' });
            return;
        }

        setCargando(true);

        const { data, error } = await supabase.auth.signUp({
            email: correoLimpio,
            password: contrasenaLimpia,
            options: {
                data: {
                    curso: cursoLimpio,
                    profesor: profesor,
                    nombre: nombreLimpio
                }
            }
        });

        setCargando(false);

        if (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message });
            return;
        }

        if (!data.session) {
            Toast.show({ type: 'error', text1: 'No se ha podido iniciar sesión. Contacta con el administrador.' });
            return;
        }

        Toast.show({ type: 'success', text1: 'Registro exitoso.' });
        router.replace('/inicio');
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Registro</Text>

                    <Text style={styles.etiqueta}>Nombre</Text>
                    <TextInput
                        style={styles.input}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder='Tu nombre'
                    />

                    <Text style={styles.etiqueta}>Correo</Text>
                    <TextInput
                        style={styles.input}
                        value={correo}
                        onChangeText={setCorreo}
                        placeholder='tuCorreo@ejemplo.com'
                        autoCapitalize='none'
                    />

                    <Text style={styles.etiqueta}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        value={contrasena}
                        onChangeText={setContrasena}
                        placeholder='tuContraseña'
                        secureTextEntry
                    />

                    <Text style={styles.etiqueta}>Curso/Departamento</Text>
                    <TextInput
                        style={styles.input}
                        value={curso}
                        onChangeText={setCurso}
                        placeholder='1ESOA,Ingles...'
                        autoCapitalize='characters'
                    />

                    <Text style={styles.etiqueta}>¿Eres profesor?</Text>
                    <View style={styles.contenedorBotonesProfesor}>
                        <Pressable
                            style={profesor ? styles.botonSeleccionado : styles.botonNoSeleccionado}
                            onPress={() => !cargando && setProfesor(true)}
                        >
                            <Text style={profesor ? styles.textoBoton : styles.textoBotonSecundario}>Sí</Text>
                        </Pressable>

                        <Pressable
                            style={!profesor ? styles.botonSeleccionado : styles.botonNoSeleccionado}
                            onPress={() => !cargando && setProfesor(false)}
                        >
                            <Text style={!profesor ? styles.textoBoton : styles.textoBotonSecundario}>No</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={[styles.botonLogin, cargando && { opacity: 0.7 }]}
                        onPress={() => !cargando && comprobarCredenciales()}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.textoBoton}>Registrarse</Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.botonVolver}
                        onPress={() => router.push('/')}
                        disabled={cargando}
                    >
                        <Text style={styles.textoBotonVolver}>Volver</Text>
                    </Pressable>
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}
