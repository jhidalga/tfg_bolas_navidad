import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { styles } from '../styles/registro/registro.styles';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import { setEsAdminGlobal } from '../lib/supabase';

export default function Registro() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [curso, setCurso] = useState('');
    const [profesor, setProfesor] = useState(false);
    const [nombre, setNombre] = useState('');
    const [cargando, setCargando] = useState(false);
    const [paso, setPaso] = useState(1);
    const [codigo, setCodigo] = useState('');

    async function comprobarCredenciales() {
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        const cursoLimpio = curso.trim();
        const nombreLimpio = nombre.trim();

        if (!correoLimpio || !contrasenaLimpia || !cursoLimpio || !nombreLimpio) {
            alert('Por favor, rellena todos los campos.');
            return;
        }

        if (!correoLimpio.endsWith('@g.educaand.es') || correoLimpio === '@g.educaand.es') {
            alert('Debes introducir un usuario válido delante de @g.educaand.es');
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
            alert(error.message);
        } else if (data?.user && !data?.session) {
            alert('Te hemos enviado un código de 6 dígitos a tu correo.');
            setPaso(2);
        } else {
            alert('Registro exitoso.');
            router.replace('/inicio');
        }
    }

    async function verificarCodigo() {
        const codigoLimpio = codigo.trim();
        
        if (!codigoLimpio) {
            alert('Por favor, introduce el código.');
            return;
        }

        setCargando(true);

        const { data, error } = await supabase.auth.verifyOtp({
            email: correo.trim(),
            token: codigoLimpio,
            type: 'signup'
        });

        if (error) {
            setCargando(false);
            alert('Código incorrecto o caducado.');
        } else if (data?.session) {
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/usuarios/perfil`, {
                    headers: { 'Authorization': `Bearer ${data.session.access_token}` }
                });
                if (res.ok) {
                    const perfil = await res.json();
                    setEsAdminGlobal(perfil.administrador === true);
                }
            } catch (e) {}

            setCargando(false);
            router.replace('/inicio');
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollFondo}>
            <View style={styles.contenedorCentral}>
                <View style={styles.tarjetaLogin}>
                    <Text style={styles.titulo}>Registro</Text>

                    {paso === 1 ? (
                        <>
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
                                placeholder='tuCorreo@g.educaand.es'
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
                        </>
                    ) : (
                        <>
                            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                                Hemos enviado un código de 6 dígitos a <Text style={{fontWeight: 'bold', color: '#1a1a1a'}}>{correo}</Text>
                            </Text>

                            <Text style={styles.etiqueta}>Código de Verificación</Text>
                            <TextInput
                                style={styles.input}
                                value={codigo}
                                onChangeText={setCodigo}
                                placeholder='Ej: 123456'
                                keyboardType='numeric'
                            />

                            <Pressable 
                                style={[styles.botonLogin, cargando && { opacity: 0.7 }]} 
                                onPress={() => !cargando && verificarCodigo()}
                            >
                                {cargando ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.textoBoton}>Verificar y Entrar</Text>
                                )}
                            </Pressable>

                            <Pressable 
                                style={styles.botonVolver} 
                                onPress={() => setPaso(1)}
                                disabled={cargando}
                            >
                                <Text style={styles.textoBotonVolver}>Cambiar correo</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </View>
            <Footer />
        </ScrollView>
    );
}