import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { styles } from '../styles/registro/registro.styles';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

const DEPARTAMENTOS = ['Informática', 'Lengua', 'Educación Física', 'Dibujo', 'Música', 'Religión', 'Cultura Clásica', 'Geografía', 'Tecnología', 'Inglés', 'Matemáticas', 'Física y Química', 'Biología'];
const LETRAS = ['A', 'B', 'C', 'D'];
const GRUPOS: Record<string, string[]> = {
    'ESO': [1, 2, 3, 4].flatMap((n) => LETRAS.map((l) => `${n}º ESO ${l}`)),
    'Bachillerato': [1, 2].flatMap((n) => ['A', 'B'].map((l) => `${n}º Bach ${l}`)),
    'SMR': ['1º SMR', '2º SMR'],
    'DAM': ['1º DAM', '2º DAM'],
};

export default function Registro() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [curso, setCurso] = useState('');
    const [profesor, setProfesor] = useState(false);
    const [nombre, setNombre] = useState('');
    const [apellido1, setApellido1] = useState('');
    const [apellido2, setApellido2] = useState('');
    const [etapa, setEtapa] = useState('');
    const [cargando, setCargando] = useState(false);

    async function comprobarCredenciales() {
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        const cursoLimpio = curso.trim();
        const nombreSolo = nombre.trim();
        const apellido1Limpio = apellido1.trim();
        const apellido2Limpio = apellido2.trim();
        const nombreLimpio = [nombreSolo, apellido1Limpio, apellido2Limpio].join(' ');

        if (!correoLimpio || !contrasenaLimpia || !cursoLimpio || !nombreSolo || !apellido1Limpio || !apellido2Limpio) {
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
                    nombre: nombreLimpio,
                    apellido1: apellido1Limpio,
                    apellido2: apellido2Limpio
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

                    <Text style={styles.etiqueta}>Primer apellido</Text>
                    <TextInput
                        style={styles.input}
                        value={apellido1}
                        onChangeText={setApellido1}
                        placeholder='Tu primer apellido'
                    />

                    <Text style={styles.etiqueta}>Segundo apellido</Text>
                    <TextInput
                        style={styles.input}
                        value={apellido2}
                        onChangeText={setApellido2}
                        placeholder='Tu segundo apellido'
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

                    <Text style={styles.etiqueta}>¿Eres profesor?</Text>
                    <View style={styles.contenedorBotonesProfesor}>
                        <Pressable
                            style={profesor ? styles.botonSeleccionado : styles.botonNoSeleccionado}
                            onPress={() => { if (!cargando) { setProfesor(true); setCurso(''); setEtapa(''); } }}
                        >
                            <Text style={profesor ? styles.textoBoton : styles.textoBotonSecundario}>Sí</Text>
                        </Pressable>

                        <Pressable
                            style={!profesor ? styles.botonSeleccionado : styles.botonNoSeleccionado}
                            onPress={() => { if (!cargando) { setProfesor(false); setCurso(''); setEtapa(''); } }}
                        >
                            <Text style={!profesor ? styles.textoBoton : styles.textoBotonSecundario}>No</Text>
                        </Pressable>
                    </View>

                    {profesor ? (
                        <>
                            <Text style={styles.etiqueta}>Departamento</Text>
                            <Picker selectedValue={curso} onValueChange={setCurso} style={styles.input}>
                                <Picker.Item label='Elige departamento' value='' />
                                {DEPARTAMENTOS.map((d) => <Picker.Item key={d} label={d} value={d} />)}
                            </Picker>
                        </>
                    ) : (
                        <>
                            <Text style={styles.etiqueta}>Etapa</Text>
                            <Picker selectedValue={etapa} onValueChange={(v) => { setEtapa(v); setCurso(''); }} style={styles.input}>
                                <Picker.Item label='Elige etapa' value='' />
                                {Object.keys(GRUPOS).map((e) => <Picker.Item key={e} label={e} value={e} />)}
                            </Picker>
                            {etapa !== '' && (
                                <>
                                    <Text style={styles.etiqueta}>Curso</Text>
                                    <Picker selectedValue={curso} onValueChange={setCurso} style={styles.input}>
                                        <Picker.Item label='Elige curso' value='' />
                                        {GRUPOS[etapa].map((c) => <Picker.Item key={c} label={c} value={c} />)}
                                    </Picker>
                                </>
                            )}
                        </>
                    )}

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
