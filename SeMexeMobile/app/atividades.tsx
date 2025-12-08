import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';

export default function CriarAtividade() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [esporte, setEsporte] = useState('');
  const [local, setLocal] = useState('');
  const [data, setData] = useState(''); // Usuário digita: 06122025
  const [hora, setHora] = useState(''); // Usuário digita: 1430
  const [vagas, setVagas] = useState('');

  // Função mágica para converter a bagunça em data bonita
  const converterDataHora = (dataStr: string, horaStr: string) => {
    // 1. Limpa sujeira (deixa só números)
    const d = dataStr.replace(/\D/g, ''); 
    const h = horaStr.replace(/\D/g, '');

    // 2. Valida tamanhos
    if (d.length !== 8 || h.length !== 4) {
      return null; 
    }

    // 3. FATIA A STRING (AQUI ESTAVA O PROBLEMA ANTES)
    // Se o usuário digitou: 06122025
    const dia = d.substring(0, 2);   // Pega "06"
    const mes = d.substring(2, 4);   // Pega "12"
    const ano = d.substring(4, 8);   // Pega "2025"
    
    const hora = h.substring(0, 2);
    const minuto = h.substring(2, 4);

    // 4. MONTA NO PADRÃO ISO: ANO-MES-DIA T HORA:MINUTO:00
    // Resultado deve ser: 2025-12-06T12:00:00
    return `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;
  };

  const handleCreate = async () => {
    if (!titulo || !esporte || !local || !data || !hora || !vagas) {
      Alert.alert('Atenção', 'Preencha todos os campos!');
      return;
    }

    // Tenta converter a data antes de enviar
    const dataFormatada = converterDataHora(data, hora);
    console.log("DATA FORMATADA:", dataFormatada);
    if (!dataFormatada) {
      Alert.alert('Data Inválida', 'Digite a data como DDMMAAAA (ex: 06122025) e hora como HHMM (ex: 1430).');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      await api.post('/api/atividades', {
        titulo,
        esporte,
        local,
        data_hora: dataFormatada, // Envia a data certinha pro Backend
        vagas: Number(vagas)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Atividade criada com sucesso!');
      router.back();

    } catch (error: any) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível criar a atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Nova Atividade</Text>
        
        <Text style={styles.label}>Título</Text>
        <TextInput style={styles.input} placeholder="Ex: Futebol de Quinta" placeholderTextColor="#666" value={titulo} onChangeText={setTitulo} />

        <Text style={styles.label}>Esporte</Text>
        <TextInput style={styles.input} placeholder="Ex: Futebol" placeholderTextColor="#666" value={esporte} onChangeText={setEsporte} />

        <Text style={styles.label}>Local</Text>
        <TextInput style={styles.input} placeholder="Ex: Quadra do Centro" placeholderTextColor="#666" value={local} onChangeText={setLocal} />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Data (DDMMAAAA)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 25122025" // Placeholder ajuda o usuário
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={8} // Limita a 8 digitos
              value={data}
              onChangeText={setData}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hora (HHMM)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: 1930" 
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={4} // Limita a 4 digitos
              value={hora}
              onChangeText={setHora}
            />
          </View>
        </View>

        <Text style={styles.label}>Número de Vagas</Text>
        <TextInput style={styles.input} placeholder="Ex: 10" placeholderTextColor="#666" keyboardType="numeric" value={vagas} onChangeText={setVagas} />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>CRIAR ATIVIDADE</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#121212' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { color: '#00E5FF', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { color: '#CCC', marginBottom: 5, marginLeft: 5, fontSize: 14, fontWeight: 'bold' },
  input: { backgroundColor: '#1E1E1E', color: '#FFF', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: '#FF007F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20, elevation: 3 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { marginTop: 15, alignItems: 'center', padding: 10 },
  cancelText: { color: '#666' }
});