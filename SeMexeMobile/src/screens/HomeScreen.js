import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons'; // Ícones do Expo

export default function HomeScreen({ navigation }) {
    const [atividades, setAtividades] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const carregarAtividades = async () => {
        setRefreshing(true);
        try {
            const token = await AsyncStorage.getItem('token');
            // Enviando o token no header, igual ao seu frontend web
            const response = await api.get('/atividades', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAtividades(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        carregarAtividades();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="fitness" size={24} color="#00E5FF" />
                <Text style={styles.titulo}>{item.titulo}</Text>
            </View>
            <Text style={styles.info}>⚽ {item.esporte}</Text>
            <Text style={styles.info}>📍 {item.local}</Text>
            <Text style={styles.info}>📅 {new Date(item.data_hora).toLocaleDateString()}</Text>
            
            <View style={styles.footer}>
                <Text style={styles.vagas}>
                    {item.vagas_disponiveis}/{item.vagas} vagas
                </Text>
                <TouchableOpacity 
                    style={styles.btnDetalhes}
                    onPress={() => navigation.navigate('Detalhes', { id: item.id })}
                >
                    <Text style={styles.btnText}>Ver</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.pageTitle}>Próximas Atividades</Text>
            <FlatList
                data={atividades}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={carregarAtividades} tintColor="#00E5FF"/>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
            
            <TouchableOpacity 
                style={styles.fab}
                onPress={() => navigation.navigate('CriarAtividade')}
            >
                <Ionicons name="add" size={30} color="#000" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 15 },
    pageTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333'
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    titulo: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    info: { color: '#CCC', marginBottom: 5 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
    vagas: { color: '#00E5FF', fontWeight: 'bold' },
    btnDetalhes: { backgroundColor: '#00E5FF', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 5 },
    btnText: { fontWeight: 'bold' },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#00E5FF',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    }
});