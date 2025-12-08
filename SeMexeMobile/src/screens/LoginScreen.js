import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const response = await api.post('/users/login', {
                email,
                password
            });

            const { token, user } = response.data;

            // Salva o token no celular para usar nas próximas requisições
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            // Vai para a tela principal
            navigation.replace('MainTabs'); 

        } catch (error) {
            Alert.alert("Erro", "Login falhou. Verifique suas credenciais.");
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Se Mexe ⚡</Text>
            
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            
            <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Criar conta</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Dark theme igual ao web
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        color: '#00E5FF', // Neon Blue
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        fontStyle: 'italic'
    },
    input: {
        backgroundColor: '#2D2D2D',
        color: '#FFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333'
    },
    button: {
        backgroundColor: '#00E5FF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16
    },
    link: {
        color: '#00E5FF',
        textAlign: 'center',
        marginTop: 20
    }
});