/**
 * ============================================================================
 * PROPRIEDADE INTELECTUAL E DIREITOS AUTORAIS
 * ============================================================================
 * Este sistema foi desenvolvido e arquitetado exclusivamente pela:
 * SECRETARIA DA ADMINISTRAÇÃO MUSICAL - REGIONAL ITAPEVI
 * 
 * Sede da Administração Musical Itapevi:
 * Av. Ana Araújo de Castro, 815 - Jardim Itapevi, Itapevi - SP
 * CEP: 06653-140
 * 
 * É ESTRITAMENTE PROIBIDA a cópia, distribuição, engenharia reversa 
 * ou uso deste código-fonte por outras regionais ou terceiros sem 
 * autorização prévia e expressa da Secretaria de Itapevi e seu Ministério.
 * ============================================================================
 */

/**
 * Sistema Contagem Ensaios Regionais - CCB Regional Itapevi
 * Versão 1.0
 */

const DEFAULT_SHEET_ID = '1LGoW7lbYS4crpEdTfGR2evuH9kArZgqrvVbmi6buBoQ';
const SHEET_NAME = 'Dados';

// Configurações do Supabase
const SUPABASE_URL = 'https://wfqehmdawhfjqbqpjapp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg';

// ID da planilha de Cotia (planilha externa)
const COTIA_SHEET_ID = '14gHBhE4rf8O5H8aQrqcuCnnO72j4bJzR7kWh-d2Y9o8';

// ID da planilha de Itapevi (planilha externa)
const ITAPEVI_SHEET_ID = '1iawqpjLV_LMPkj-Eq2tpE2dmq92-avyhXC4xphkvdKY';

// ID da planilha de Caucaia (planilha externa)
const CAUCAIA_SHEET_ID = '1maunnaSjcZ8o6OVpyHzTrljd6ykGMmCds4nEPJpXLaA';

// ID da planilha de Jandira (planilha externa)
const JANDIRA_SHEET_ID = '1w-AH31prNxc38KHlS5TdaR982qsgs5cT0U2xQbAIZ4I';

// ID da planilha de Fazendinha (planilha externa)
const FAZENDINHA_SHEET_ID = '1RHDamwT53PaD3QhAcEQuM0ZEtPIff_lLHH3TKURMOW8';

// ID da planilha de Pirapora (planilha externa)
const PIRAPORA_SHEET_ID = '1OHdjW0oUBIFJjubWg4DmxPJnegQzQNk7qb1v7M6Ymk0';

// ID da planilha de VargemGrande (planilha externa)
const VARGEMGRANDE_SHEET_ID = '1BtCETMduDOV-FV6lzvEwgs5gimhYtwZbjy7tlzR8nYI';

const REQUIRED_HEADERS = [
  'UUID','NOME COMPLETO','COMUM','CIDADE','CARGO','NÍVEL','INSTRUMENTO',
  'NAIPE_INSTRUMENTO','CLASSE_ORGANISTA','LOCAL_ENSAIO','DATA_ENSAIO',
  'REGISTRADO_POR','SYNC_STATUS','SYNCED_AT','ANOTACOES','DUPLICATA'
];

// Cache para otimização
let SHEETS_CACHE = {};
let SHEET_CACHE = null;
let HEADERS_CACHE = null;
let LAST_HEADER_CHECK = 0;

// Variáveis globais para progresso da exportação
let EXPORT_PROGRESS = {
  percent: 0,
  status: 'Iniciando...',
  timeInfo: 'Calculando...',
  logEntries: []
};

// Mapeamento de cargos
const aliasCargo = {
  'ancião': 'Ancião',
  'diácono': 'Diácono',
  'cooperador do ofício': 'Cooperador do Ofício',
  'cooperador do oficio': 'Cooperador do Ofício',
  'cooperador do ofício ministerial': 'Cooperador do Ofício',
  'cooperador do oficio ministerial': 'Cooperador do Ofício',
  'cooperador de jovens': 'Cooperador de Jovens',
  'cooperador de jovens e menores': 'Cooperador de Jovens',
  'encarregado regional': 'Encarregado Regional',
  'encarregado local': 'Encarregado Local',
  'examinadora': 'Examinadora',
  'secretária da música': 'Secretária da Música',
  'secretaria da musica': 'Secretária da Música',
  'secretário da música': 'Secretário da Música',
  'secretario da musica': 'Secretário da Música',
  'instrutor': 'Instrutor',
  'instrutora': 'Instrutora',
  'instrutores': 'Instrutor',
  'instrutoras': 'Instrutora',
  'porteiro (a)': 'Porteiro (a)',
  'porteiro': 'Porteiro (a)',
  'porteira': 'Porteiro (a)',
  'bombeiro (a)': 'Bombeiro (a)',
  'bombeiro': 'Bombeiro (a)',
  'bombeira': 'Bombeiro (a)',
  'médico (a)': 'Médico (a)',
  'medico': 'Médico (a)',
  'medica': 'Médico (a)',
  'enfermeiro (a)': 'Enfermeiro (a)',
  'enfermeiro': 'Enfermeiro (a)',
  'enfermeira': 'Enfermeiro (a)',
  'irmandade': 'Irmandade',
  'irma': 'Irmandade',
  'irmao': 'Irmandade',
  'irmão': 'Irmandade',
  'irmã': 'Irmandade',
  'irmãos': 'Irmandade',
  'irmãs': 'Irmandade'
};

// Funções utilitárias
