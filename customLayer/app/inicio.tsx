import { View, ScrollView } from 'react-native';
import Footer from '../componentes/footer';
import Navbar from '@/componentes/navbar';
import Grid from '@/componentes/gridProductos';

export default function Inicio() {
    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <Navbar />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{
                    width: '100%',
                    maxWidth: 1200,
                    alignSelf: 'center',
                    paddingHorizontal: 20,
                    paddingTop: 40,
                    paddingBottom: 60
                }}>
                    <Grid />
                </View>

                <Footer />
            </ScrollView>
        </View>
    );
}