import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api'; // Ajuste o caminho conforme sua estrutura

export default function CriarAtividade() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados do formulário
  const [titulo, setTitulo] = useState('');
  const [esporte, setEsporte] = useState('');
  const [local, setLocal] = useState('');
  const [data, setData] = useState(''); // Esperado: YYYY-MM-DD
  const [hora, setHora] = useState(''); // Esperado: HH:MM
  const [vagas, setVagas] = useState('');

  const handleCreate = async () => {
    // 1. Validação Básica
    if (!titulo || !esporte || !local || !data || !hora || !vagas) {
      Alert.alert('Atenção', 'Preencha todos os campos!');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      // 2. Montar o objeto para a API
      // A API geralmente espera ISO 8601 (ex: 2023-12-30T14:00:00)
      const dataHoraFormatada = `${data}T${hora}:00`;

      await api.post('/api/atividades', {
        titulo,
        esporte,
        local,
        data_hora: dataHoraFormatada,
        vagas: Number(vagas) // Converter string para numero
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Atividade criada com sucesso!');
      router.back(); // Volta para a Home

    } catch (error) {
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
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Futebol de Quinta" 
          placeholderTextColor="#666"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.label}>Esporte</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Futebol, Vôlei..." 
          placeholderTextColor="#666"
          value={esporte}
          onChangeText={setEsporte}
        />

        <Text style={styles.label}>Local</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Quadra do Centro" 
          placeholderTextColor="#666"
          value={local}
          onChangeText={setLocal}
        />

        {/* Linha com Data e Hora lado a lado */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="2023-12-25" 
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={data}
              onChangeText={setData}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hora (HH:MM)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="19:30" 
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={hora}
              onChangeText={setHora}
            />
          </View>
        </View>

        <Text style={styles.label}>Número de Vagas</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: 10" 
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={vagas}
          onChangeText={setVagas}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>CRIAR ATIVIDADE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#00E5FF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    color: '#CCC',
    marginBottom: 5,
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#FF007F', // Rosa Neon
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
  },
  cancelText: {
    color: '#666',
  }
});