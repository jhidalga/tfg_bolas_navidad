import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        width: '100%',
    },
    cardWrapper: {
        flexGrow: 1,
        flexBasis: '22%', 
        minWidth: 250, 
        margin: 10,
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