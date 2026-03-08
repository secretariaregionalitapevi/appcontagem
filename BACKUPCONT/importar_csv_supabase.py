# ============================================
# Script de Importação CSV para Supabase (Python)
# Use este script se a importação direta falhar
# ============================================

import csv
import sys
from supabase import create_client, Client

# CONFIGURAÇÃO
SUPABASE_URL = "https://wfqehmdawhfjqbqpjapp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg"
TABLE_NAME = "cadastro"

def limpar_texto(texto):
    """Remove caracteres especiais e limpa o texto"""
    if not texto or texto == 'NULL' or texto == 'null' or texto.strip() == '':
        return None
    # Remove caracteres especiais unicode problemáticos (incluindo ◆)
    texto_limpo = texto.replace('◆', '').strip()
    # Remove outros caracteres não-ASCII problemáticos
    texto_limpo = ''.join(char for char in texto_limpo if ord(char) < 256 or char in 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ')
    return texto_limpo if texto_limpo else None

def normalizar_coluna(header):
    """Normaliza nomes de colunas para minúsculas"""
    mapeamento = {
        'nome': 'nome',
        'NOME': 'nome',
        'instrumento': 'instrumento',
        'INSTRUMENTO': 'instrumento',
        'localidade': 'localidade',
        'LOCALIDADE': 'localidade',
        'cidade': 'cidade',
        'CIDADE': 'cidade',
        'comum': 'comum',
        'COMUM': 'comum',
        'cargo': 'cargo',
        'CARGO': 'cargo',
        'nivel': 'nivel',
        'NIVEL': 'nivel',
    }
    return mapeamento.get(header.strip(), header.strip().lower())

def importar_csv(csv_file_path):
    """Importa dados do CSV para o Supabase"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    registros = []
    linha_numero = 0
    
    print(f"🚀 Iniciando leitura do CSV: {csv_file_path}\n")
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            # Detecta o delimitador (vírgula ou ponto e vírgula)
            sample = file.read(1024)
            file.seek(0)
            delimiter = ',' if sample.count(',') > sample.count(';') else ';'
            
            reader = csv.DictReader(file, delimiter=delimiter)
            
            # Normaliza os headers
            reader.fieldnames = [normalizar_coluna(header) for header in reader.fieldnames]
            
            for row in reader:
                linha_numero += 1
                
                # Pula linhas vazias
                nome = limpar_texto(row.get('nome', ''))
                if not nome:
                    print(f"⏭️  Linha {linha_numero} pulada (nome vazio)")
                    continue
                
                # Prepara o registro
                localidade = limpar_texto(row.get('localidade', ''))
                registro = {
                    'nome': nome,
                    'instrumento': limpar_texto(row.get('instrumento', '')),
                    'localidade': localidade,
                    'cidade': limpar_texto(row.get('cidade', '')),
                    'comum': limpar_texto(row.get('comum', '')) or localidade,  # Copia localidade para comum se vazio
                    'cargo': limpar_texto(row.get('cargo', '')),
                    'nivel': limpar_texto(row.get('nivel', '')),
                    'ativo': True
                }
                
                registros.append(registro)
                
                if len(registros) % 100 == 0:
                    print(f"📊 Processadas {len(registros)} linhas...")
        
        print(f"\n✅ Total de {len(registros)} registros preparados para importação")
        print(f"📤 Iniciando importação em lotes...\n")
        
        # Importa em lotes de 1000 para evitar timeout
        BATCH_SIZE = 1000
        total_importados = 0
        total_erros = 0
        
        for i in range(0, len(registros), BATCH_SIZE):
            lote = registros[i:i + BATCH_SIZE]
            lote_numero = (i // BATCH_SIZE) + 1
            
            try:
                response = supabase.table(TABLE_NAME).insert(lote).execute()
                total_importados += len(lote)
                print(f"✅ Lote {lote_numero} importado: {len(lote)} registros")
            except Exception as e:
                print(f"❌ Erro ao importar lote {lote_numero}: {str(e)}")
                total_erros += len(lote)
        
        print(f"\n📊 RESUMO FINAL:")
        print(f"   ✅ Importados: {total_importados}")
        print(f"   ❌ Erros: {total_erros}")
        print(f"   📝 Total processado: {len(registros)}")
        
        return {'importados': total_importados, 'erros': total_erros}
        
    except FileNotFoundError:
        print(f"❌ Arquivo não encontrado: {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "MUSICOS_ORGANISTAS_REG_ITAPEVI_FINAL.csv"
    importar_csv(csv_file)
    print("\n✅ Importação concluída!")

