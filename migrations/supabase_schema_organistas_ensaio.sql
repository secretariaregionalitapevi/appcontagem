-- Schema SQL para tabela organistas_ensaio
-- Esta tabela armazena o registro de presença de organistas nos ensaios

CREATE TABLE IF NOT EXISTS organistas_ensaio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organista_nome TEXT NOT NULL,
  organista_comum TEXT,
  organista_cidade TEXT,
  local_ensaio TEXT NOT NULL,
  data_ensaio DATE NOT NULL,
  tocou BOOLEAN NOT NULL DEFAULT false,
  usuario_responsavel TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para melhor performance nas consultas
  CONSTRAINT organistas_ensaio_local_data_idx UNIQUE (organista_nome, local_ensaio, data_ensaio)
);

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_organistas_ensaio_local_ensaio ON organistas_ensaio(local_ensaio);
CREATE INDEX IF NOT EXISTS idx_organistas_ensaio_data_ensaio ON organistas_ensaio(data_ensaio);
CREATE INDEX IF NOT EXISTS idx_organistas_ensaio_tocou ON organistas_ensaio(tocou);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organistas_ensaio_updated_at 
  BEFORE UPDATE ON organistas_ensaio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE organistas_ensaio ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ler todos os registros
CREATE POLICY "Usuarios autenticados podem ler organistas_ensaio"
  ON organistas_ensaio
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários autenticados podem inserir registros
CREATE POLICY "Usuarios autenticados podem inserir organistas_ensaio"
  ON organistas_ensaio
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários autenticados podem atualizar registros
CREATE POLICY "Usuarios autenticados podem atualizar organistas_ensaio"
  ON organistas_ensaio
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem deletar registros
CREATE POLICY "Usuarios autenticados podem deletar organistas_ensaio"
  ON organistas_ensaio
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentários para documentação
COMMENT ON TABLE organistas_ensaio IS 'Registro de presença de organistas nos ensaios por local e data';
COMMENT ON COLUMN organistas_ensaio.organista_nome IS 'Nome completo da organista';
COMMENT ON COLUMN organistas_ensaio.organista_comum IS 'Comum da organista';
COMMENT ON COLUMN organistas_ensaio.organista_cidade IS 'Cidade da organista';
COMMENT ON COLUMN organistas_ensaio.local_ensaio IS 'Local do ensaio (ex: Cotia, Itapevi, etc.)';
COMMENT ON COLUMN organistas_ensaio.data_ensaio IS 'Data do ensaio';
COMMENT ON COLUMN organistas_ensaio.tocou IS 'Indica se a organista tocou no ensaio (true/false)';
COMMENT ON COLUMN organistas_ensaio.usuario_responsavel IS 'Nome do usuário que registrou';
COMMENT ON COLUMN organistas_ensaio.observacoes IS 'Observações adicionais sobre o registro';

