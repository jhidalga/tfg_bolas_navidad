import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    cardWrapper: {
        width: '100%',
        marginBottom: 20,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: 50,
    },
    loaderText: {
        marginTop: 10,
        color: 'gray',
    }
});