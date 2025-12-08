import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  RefreshControl, ListRenderItem, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { FontAwesome5 } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Atividade {
    _id: string; 
    esporte: string;
    titulo: string;
    local: string;
    data_hora: string;
    vagas: number;
    vagas_disponiveis: number;
    lotada: boolean;
}

export default function HomeScreen() {
    const router = useRouter();
    const [atividades, setAtividades] = useState<Atividade[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // React.useEffect(() => {
    //    AsyncStorage.clear().then(() => {
    //        console.log("LIMPEZA DE EMERGÊNCIA FEITA");
    //        router.replace('/');
    //    });
    // }, []);
    const carregarAtividades = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            // Se não tiver token, a tela de login deve tratar, mas evitamos erro aqui
            if (!token) return; 

            const response = await api.get<Atividade[]>('/api/atividades', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAtividades(response.data);
        } catch (error) {
            console.error("Erro ao buscar atividades:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            carregarAtividades();
        }, [])
    );

    const logout = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    const renderItem: ListRenderItem<Atividade> = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={styles.titulo}>{item.titulo}</Text>
                <Text style={styles.esporte}>{item.esporte}</Text>
            </View>
            
            <View style={styles.row}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#AAA" style={{ width: 20 }} />
                <Text style={styles.info}>{item.local}</Text>
            </View>

            <View style={styles.row}>
                <FontAwesome5 name="calendar-alt" size={14} color="#AAA" style={{ width: 20 }} />
                <Text style={styles.info}>
                    {new Date(item.data_hora).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            
            <Text style={[styles.vagas, { color: item.vagas_disponiveis > 0 ? '#FF007F' : '#666' }]}>
                {item.vagas_disponiveis > 0 
                    ? `${item.vagas_disponiveis} vagas restantes` 
                    : 'LOTADA'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.pageTitle}>Atividades</Text>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <FontAwesome5 name="sign-out-alt" size={18} color="#FF007F" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#00E5FF" />
                </View>
            ) : (
                <FlatList
                    data={atividades}
                    // AQUI ESTAVA O ERRO DO CRASH:
                    keyExtractor={(item) => { 
                        if (item._id) return item._id.toString();
                        if (item._id) return item._id.toString();
                        return Math.random().toString();
                    }} 
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); carregarAtividades();}} tintColor="#00E5FF" />
                    }
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.centerEmpty}>
                            <FontAwesome5 name="clipboard-list" size={40} color="#333" />
                            <Text style={styles.emptyText}>Nenhuma atividade encontrada</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity 
                style={styles.fab}
                onPress={() => router.push('/criar-atividade')} 
            >
                <FontAwesome5 name="plus" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 15, paddingTop: 50 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pageTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
    logoutBtn: { padding: 10 },
    card: { 
        backgroundColor: '#1E1E1E', 
        padding: 15, 
        borderRadius: 12, 
        marginBottom: 15, 
        borderLeftWidth: 4, 
        borderLeftColor: '#00E5FF',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3.84, elevation: 5,
    },
    titulo: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    esporte: { 
        color: '#121212', backgroundColor: '#00E5FF', fontSize: 12, fontWeight: 'bold', 
        textTransform: 'uppercase', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, 
        overflow: 'hidden', alignSelf: 'flex-start'
    },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    info: { color: '#CCC', fontSize: 14 },
    vagas: { marginTop: 12, fontWeight: 'bold', fontSize: 14, textAlign: 'right' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    centerEmpty: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#666', marginTop: 10, fontSize: 16 },
    fab: {
        position: 'absolute', bottom: 20, right: 20, width: 60, height: 60,
        backgroundColor: '#FF007F', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 10,
    }
});