CREATE DATABASE se_mexe;
USE se_mexe;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE atividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    esporte VARCHAR(100) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    local VARCHAR(150) NOT NULL,
    data_hora DATETIME NOT NULL,
    vagas INT NOT NULL,
    id_usuario INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150),
    email VARCHAR(150),
    mensagem TEXT,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE participantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  atividade_id INT NOT NULL,
  data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
);

-- 1. Tabela para guardar as amizades
CREATE TABLE IF NOT EXISTS amigos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_1 INT NOT NULL,
    id_usuario_2 INT NOT NULL,
    status ENUM('pendente', 'aceito') DEFAULT 'aceito', -- Já aceita direto pra facilitar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario_1) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_2) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 2. Adicionar coluna de visibilidade nas atividades
-- (Se der erro dizendo que já existe, tudo bem, ignore)
ALTER TABLE atividades ADD COLUMN visibilidade ENUM('public', 'friends') DEFAULT 'public';

CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    mensagem TEXT NOT NULL,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lida BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

ALTER TABLE usuarios ADD COLUMN avatar VARCHAR(50) DEFAULT 'fa-solid fa-user';