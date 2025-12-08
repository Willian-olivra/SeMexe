import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import api from '../src/services/api';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleRegister = async () => {
        if (!name || !email || !password) return Alert.alert('Erro', 'Preencha tudo.');
        setLoading(true);

        try {
            await api.post('/users/register', { name, email, password });
            Alert.alert('Sucesso', 'Conta criada! Faça login.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Erro', 'Falha no cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
             <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <FontAwesome5 name="arrow-left" size={20} color="#00E5FF" />
                <Text style={{color: '#00E5FF', marginLeft: 10}}>Voltar</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Nova Conta</Text>

            <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
            <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                 {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Cadastrar</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
    title: { fontSize: 28, color: '#FFF', fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
    input: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
    button: { backgroundColor: '#00E5FF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { fontWeight: 'bold', color: '#000' },
    backBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 50, left: 20 }
});