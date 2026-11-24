import { temaActual } from '../lib/tema';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { traducirError } from '../lib/errores';
import { styles as estilosEscritorio } from '../styles/registro/registro.styles';
import { styles as estilosMovil } from '../styles/registro/registro.styles.movil';
import { useEstilos } from '../lib/responsive';
import { validarCorreo, prefijoCorreoAlumno, DOMINIO_ALUMNOS } from '../lib/correo';
import { useRouter } from "expo-router";
import { useState } from 'react';
import Footer from '../componentes/footer';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../componentes/avisos';
import { Picker } from '@react-native-picker/picker';
import { tc } from '../lib/tema';
import { DEPARTAMENTOS, GRUPOS } from '../lib/cursos';
import { normalizarNombre } from '../lib/formato';

export default function Registro() {
    const styles = useEstilos(estilosEscritorio, estilosMovil);
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [contrasena2, setContrasena2] = useState('');
    const [verContrasena, setVerContrasena] = useState(false);
    const [curso, setCurso] = useState('');
    const [profesor, setProfesor] = useState(false);
    const [nombre, setNombre] = useState('');
    const [apellido1, setApellido1] = useState('');
    const [apellido2, setApellido2] = useState('');
    const [etapa, setEtapa] = useState('');
    // Aviso para quien no consigue registrarse
    const [incidenciaAbierta, setIncidenciaAbierta] = useState(false);
    const [incNombre, setIncNombre] = useState('');
    const [incApellido1, setIncApellido1] = useState('');
    const [incApellido2, setIncApellido2] = useState('');
    const [incCurso, setIncCurso] = useState('');
    const [incCorreo, setIncCorreo] = useState('');
    const [incMotivo, setIncMotivo] = useState('');
    const [enviandoInc, setEnviandoInc] = useState(false);

    function abrirIncidencia() {
        // Rellena lo que ya haya escrito en el formulario
        setIncNombre(nombre);
        setIncApellido1(apellido1);
        setIncApellido2(apellido2);
        setIncCurso(curso);
        setIncCorreo(correo);
        setIncMotivo('');
        setIncidenciaAbierta(true);
    }

    async function enviarIncidencia() {
        const datos = {
            nombre: incNombre.trim(),
            apellido1: incApellido1.trim(),
            apellido2: incApellido2.trim(),
            curso: incCurso.trim(),
            correo: incCorreo.trim(),
            motivo: incMotivo.trim(),
        };
        if (!Object.values(datos).every(Boolean)) {
            Toast.show({ type: 'error', text1: 'Rellena todos los campos.' });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
            Toast.show({ type: 'error', text1: 'Introduce un correo electrónico válido' });
            return;
        }
        setEnviandoInc(true);
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/registro/incidencia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Incidencia enviada', text2: 'Un administrador la revisará. Vuelve a intentarlo cuando te avise.' });
                setIncidenciaAbierta(false);
            } else {
                const e = await res.json().catch(() => ({}));
                Toast.show({ type: 'error', text1: 'No se pudo enviar', text2: traducirError(e.detail, '') });
            }
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Error de conexión' });
        } finally {
            setEnviandoInc(false);
        }
    }
    const [cargando, setCargando] = useState(false);

    async function comprobarCredenciales() {
        const correoLimpio = correo.trim();
        const contrasenaLimpia = contrasena.trim();
        const cursoLimpio = curso.trim();
        const nombreSolo = nombre.trim();
        const apellido1Limpio = apellido1.trim();
        const apellido2Limpio = apellido2.trim();
        const nombreLimpio = normalizarNombre([nombreSolo, apellido1Limpio, apellido2Limpio].join(' '));

        const faltan = [
            !nombreSolo && 'Nombre',
            !apellido1Limpio && 'Primer apellido',
            !apellido2Limpio && 'Segundo apellido',
            !correoLimpio && 'Correo',
            !contrasenaLimpia && 'Contraseña',
            !contrasena2.trim() && 'Repite la contraseña',
            !cursoLimpio && (profesor ? 'Departamento' : etapa ? 'Curso' : 'Etapa y curso'),
        ].filter(Boolean);
        if (faltan.length > 0) {
            Toast.show({ type: 'error', text1: 'Todos los campos son obligatorios.', text2: `Falta: ${faltan.join(', ')}` });
            return;
        }

        let errorCorreo = validarCorreo(correoLimpio, profesor, nombreSolo, apellido1Limpio, apellido2Limpio);
        if (errorCorreo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
            // Un administrador puede haber permitido este correo concreto
            try {
                const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/registro/permitido?correo=${encodeURIComponent(correoLimpio)}`);
                if (res.ok && (await res.json()).permitido === true) errorCorreo = null;
            } catch (e) {}
        }
        if (contrasenaLimpia !== contrasena2.trim()) {
            Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden.' });
            return;
        }

        if (errorCorreo) {
            Toast.show({ type: 'error', text1: errorCorreo, text2: 'Si crees que es un error, pulsa "¿No te deja registrarte? Avísanos".' });
            return;
        }

        setCargando(true);

        const { data, error } = await supabase.auth.signUp({
            email: correoLimpio,
            password: contrasenaLimpia,
            options: {
                emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
                data: {
                    curso: cursoLimpio,
                    profesor: profesor,
                    nombre: nombreLimpio,
                    tema: temaActual.nombre,
                    apellido1: apellido1Limpio,
                    apellido2: apellido2Limpio
                }
            }
        });

        setCargando(false);

        if (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: traducirError(error.message) });
            return;
        }

        if (!data.session) {
            // Con la verificacion de correo activada no hay sesion hasta pulsar el enlace del correo
            Toast.show({ type: 'success', text1: 'Revisa tu correo', text2: `Te hemos enviado un enlace a ${correoLimpio}. Púlsalo para activar tu cuenta. Si no lo ves, mira en spam. El enlace solo sirve una vez.`, visibilityTime: 12000 });
            router.replace('/login');
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

                    <Text style={styles.etiqueta}>Nombre *</Text>
                    <TextInput
                        style={styles.input}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder='Tu nombre'
                    />

                    <Text style={styles.etiqueta}>Primer apellido *</Text>
                    <TextInput
                        style={styles.input}
                        value={apellido1}
                        onChangeText={setApellido1}
                        placeholder='Tu primer apellido'
                    />

                    <Text style={styles.etiqueta}>Segundo apellido *</Text>
                    <TextInput
                        style={styles.input}
                        value={apellido2}
                        onChangeText={setApellido2}
                        placeholder='Tu segundo apellido'
                    />

                    <Text style={styles.etiqueta}>Correo *</Text>
                    <TextInput
                        style={styles.input}
                        value={correo}
                        onChangeText={setCorreo}
                        placeholder='tuCorreo@ejemplo.com'
                        autoCapitalize='none'
                    />
                    {!profesor && (
                        <Text style={{ marginTop: -12, marginBottom: 16, color: '#6b7280', fontSize: 12 }}>
                            {nombre.trim() && apellido1.trim() && apellido2.trim()
                                ? `Tu correo debe empezar por ${prefijoCorreoAlumno(nombre, apellido1, apellido2)} y acabar en ${DOMINIO_ALUMNOS}`
                                : `Correo de alumno: ${DOMINIO_ALUMNOS}. Rellena nombre y apellidos para ver cómo debe empezar.`}
                        </Text>
                    )}

                    <Text style={styles.etiqueta}>Contraseña *</Text>
                    <TextInput
                        style={styles.input}
                        value={contrasena}
                        onChangeText={setContrasena}
                        placeholder='tuContraseña'
                        secureTextEntry={!verContrasena}
                    />

                    <Text style={styles.etiqueta}>Repite la contraseña *</Text>
                    <TextInput
                        style={styles.input}
                        value={contrasena2}
                        onChangeText={setContrasena2}
                        placeholder='Repite tu contraseña'
                        secureTextEntry={!verContrasena}
                    />
                    <Pressable onPress={() => setVerContrasena(!verContrasena)} style={{ marginTop: -12, marginBottom: 16 }}>
                        <Text style={{ color: tc('#a52a2a'), fontWeight: '600', fontSize: 13 }}>
                            {verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        </Text>
                    </Pressable>

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
                            <Text style={styles.etiqueta}>Departamento *</Text>
                            <Picker selectedValue={curso} onValueChange={setCurso} style={styles.input}>
                                <Picker.Item label='Elige departamento' value='' />
                                {DEPARTAMENTOS.map((d) => <Picker.Item key={d} label={d} value={d} />)}
                            </Picker>
                        </>
                    ) : (
                        <>
                            <Text style={styles.etiqueta}>Etapa *</Text>
                            <Picker selectedValue={etapa} onValueChange={(v) => { setEtapa(v); setCurso(''); }} style={styles.input}>
                                <Picker.Item label='Elige etapa' value='' />
                                {Object.keys(GRUPOS).map((e) => <Picker.Item key={e} label={e} value={e} />)}
                            </Picker>
                            {etapa !== '' && (
                                <>
                                    <Text style={styles.etiqueta}>Curso *</Text>
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
                            <ActivityIndicator color={tc("#ffffff")} />
                        ) : (
                            <Text style={styles.textoBoton}>Registrarse</Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.botonVolver}
                        onPress={abrirIncidencia}
                        disabled={cargando}
                    >
                        <Text style={styles.textoBotonVolver}>¿No te deja registrarte? Avísanos</Text>
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
            <Modal visible={incidenciaAbierta} transparent animationType="fade" onRequestClose={() => setIncidenciaAbierta(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <ScrollView style={{ maxHeight: '92%', width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14 }} contentContainerStyle={{ padding: 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6 }}>No puedo registrarme</Text>
                        <Text style={{ color: tc('#a52a2a'), marginBottom: 14 }}>
                            Rellena tus datos y un administrador revisará tu correo. Cuando lo permita, podrás registrarte.
                        </Text>

                        <Text style={styles.etiqueta}>Nombre</Text>
                        <TextInput style={styles.input} value={incNombre} onChangeText={setIncNombre} placeholder='Tu nombre' />
                        <Text style={styles.etiqueta}>Primer apellido</Text>
                        <TextInput style={styles.input} value={incApellido1} onChangeText={setIncApellido1} placeholder='Tu primer apellido' />
                        <Text style={styles.etiqueta}>Segundo apellido</Text>
                        <TextInput style={styles.input} value={incApellido2} onChangeText={setIncApellido2} placeholder='Tu segundo apellido' />
                        <Text style={styles.etiqueta}>Curso o departamento</Text>
                        <TextInput style={styles.input} value={incCurso} onChangeText={setIncCurso} placeholder='Ej: 2º DAM o Informática' />
                        <Text style={styles.etiqueta}>Correo que no te deja usar</Text>
                        <TextInput style={styles.input} value={incCorreo} onChangeText={setIncCorreo} placeholder='tuCorreo@g.educaand.es' autoCapitalize='none' />
                        <Text style={styles.etiqueta}>Motivo</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
                            value={incMotivo}
                            onChangeText={setIncMotivo}
                            placeholder='Cuéntanos brevemente qué te pasa. Ej: mi correo tiene otra forma'
                            multiline
                            maxLength={300}
                        />
                        <Text style={{ color: '#6b7280', fontSize: 12, textAlign: 'right', marginTop: -6, marginBottom: 10 }}>{incMotivo.length}/300</Text>

                        <Pressable style={[styles.botonLogin, enviandoInc && { opacity: 0.7 }]} onPress={() => !enviandoInc && enviarIncidencia()}>
                            {enviandoInc ? <ActivityIndicator color={tc("#ffffff")} /> : <Text style={styles.textoBoton}>Enviar incidencia</Text>}
                        </Pressable>
                        <Pressable style={styles.botonVolver} onPress={() => setIncidenciaAbierta(false)} disabled={enviandoInc}>
                            <Text style={styles.textoBotonVolver}>Cancelar</Text>
                        </Pressable>
                    </ScrollView>
                </View>
                <Toast position='top' topOffset={40} config={toastConfig} />
            </Modal>
            <Footer />
        </ScrollView>
    );
}
