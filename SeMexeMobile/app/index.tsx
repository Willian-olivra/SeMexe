import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import api from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // Alternar entre Login e Cadastro
  const [loading, setLoading] = useState(false);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleAuth = async () => {
    if (!email || !senha || (!isLogin && !nome)) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      let response;
      
      if (isLogin) {
        // --- LOGAR ---
        response = await api.post('/users/login', { email, password: senha });
      } else {
        // --- CADASTRAR ---
        // Nota: O backend espera 'name', 'email', 'password'
        response = await api.post('/users/register', { 
          name: nome, 
          email, 
          password: senha 
        });
        
        // Se cadastrou com sucesso, podemos logar direto ou pedir pro usuário logar.
        // Vamos avisar e trocar para a tela de login para simplificar:
        Alert.alert('Sucesso', 'Conta criada! Faça login agora.');
        setIsLogin(true);
        setLoading(false);
        return; 
      }

      // Se o login deu certo:
      const { token, user } = response.data;

      // 1. Salva o Token e os dados do usuário no celular
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // 2. Entra no App
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Ocorreu um erro inesperado.';
      Alert.alert('Erro de Acesso', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <FontAwesome5 name="running" size={60} color="#00E5FF" />
        <Text style={styles.appTitle}>SE MEXE</Text>
        <Text style={styles.subtitle}>Encontre sua galera do esporte</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.header}>{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</Text>

        {/* Campo Nome (Só aparece no Cadastro) */}
        {!isLogin && (
          <TextInput 
            style={styles.input} 
            placeholder="Seu Nome" 
            placeholderTextColor="#666" 
            value={nome}
            onChangeText={setNome}
          />
        )}

        <TextInput 
          style={styles.input} 
          placeholder="Seu E-mail" 
          placeholderTextColor="#666" 
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput 
          style={styles.input} 
          placeholder="Sua Senha" 
          placeholderTextColor="#666" 
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'ENTRAR' : 'CADASTRAR'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {isLogin ? 'Não tem conta? Crie agora!' : 'Já tem conta? Faça login.'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  appTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginTop: 10, letterSpacing: 2 },
  subtitle: { color: '#AAA', fontSize: 16 },
  form: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 15, width: '100%', elevation: 5 },
  header: { fontSize: 22, color: '#FFF', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { 
    backgroundColor: '#2C2C2C', color: '#FFF', padding: 15, borderRadius: 8, marginBottom: 15, 
    borderWidth: 1, borderColor: '#333' 
  },
  button: { 
    backgroundColor: '#00E5FF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 
  },
  buttonText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  toggleButton: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#00E5FF', fontWeight: '600' }
});