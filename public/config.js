// Este arquivo é carregado pelo index.html e contém as configurações da Regional.
// No Docker, as variáveis de ambiente REGIONAL_NAME e LOCAIS_ENSAIO_JSON 
// serão injetadas aqui pelo entrypoint.sh no momento da inicialização.

window.APP_CONFIG = {
  // Nome da Regional que aparece no título e no rodapé
  REGIONAL_NAME: "Regional Itapevi",
  
  // Lista de locais de ensaio disponíveis no login
  LOCAIS_ENSAIO: [
    { id: '1', nome: 'Cotia' },
    { id: '2', nome: 'Caucaia do Alto' },
    { id: '3', nome: 'Fazendinha' },
    { id: '4', nome: 'Itapevi' },
    { id: '5', nome: 'Jandira' },
    { id: '6', nome: 'Pirapora' },
    { id: '7', nome: 'Vargem Grande' },
  ],

  // Configurações do Supabase e Google Sheets
  // No Docker, estas variáveis serão sobrescritas se fornecidas no docker-compose.yml
  SUPABASE_URL: "https://wfqehmdawhfjqbqpjapp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWVobWRhd2hmanFicXBqYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDI0ODIsImV4cCI6MjA3MzAxODQ4Mn0.lFfEZKIVS7dqk48QFW4IvpRcJsgQnMjYE3iUqsrXsFg",
  SHEETS_ENDPOINT_URL: "https://script.google.com/macros/s/AKfycbxPtvi86jPy7y41neTpIPvn3hpycd3cMjbgjgifzLD6qRwrJVPlF9EDulaQp42nma-i/exec"
};
