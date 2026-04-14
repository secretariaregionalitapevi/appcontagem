(function () {
    'use strict';

    angular.module('inspinia')
        .factory('EbiService', EbiService);

    EbiService.$inject = ['$q', 'AuthService'];

    function EbiService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var ALUNO_FIELDS = [
            'nome_crianca',
            'sexo',
            'data_nascimento',
            'comum_congregacao',
            'localidade',
            'polo_participacao',
            'nome_pai',
            'pai_e_crente',
            'nome_mae',
            'mae_e_crente',
            'pais_vivem_juntos',
            'crianca_vive_com_os_pais',
            'se_nao_vive_com_pais_com_quem_vive',
            'nome_responsavel',
            'celular_responsavel',
            'tem_whatsapp',
            'participa_reunioes_jovens_menores',
            'participa_espaco_infantil',
            'logradouro_numero',
            'complemento',
            'bairro',
            'cidade',
            'cep',
            'dificuldade_aprendizagem',
            'dificuldade_descricao',
            'faz_terapia',
            'terapia_especialidade',
            'status'
        ];
        var MONITOR_FIELDS = [
            'nome_completo',
            'comum_congregacao',
            'localidade',
            'data_nascimento',
            'idade',
            'batizado',
            'data_batismo',
            'celular',
            'email',
            'polo_auxilio',
            'musico_ou_musicista',
            'oficializado',
            'data_oficializacao',
            'instrutor_atualmente',
            'instrutor_em_qual_igreja',
            'formacao_musica',
            'formacao_qual',
            'formacao_data',
            'pedagogo',
            'pedagogo_desde',
            'atua_na_area',
            'afinidade_criancas',
            'cursos_conhecimentos',
            'de_acordo_voluntario',
            'autoriza_tratamento_dados',
            'status'
        ];

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

        var service = {
            getRecitativos: getRecitativos,
            saveAtividade: saveAtividade,
            updateAtividade: updateAtividade,
            deleteAtividade: deleteAtividade,
            getAlunos: getAlunos,
            saveAluno: saveAluno,
            updateAluno: updateAluno,
            deleteAluno: deleteAluno,
            getInstrutores: getInstrutores,
            saveInstrutor: saveInstrutor,
            updateInstrutor: updateInstrutor,
            deleteInstrutor: deleteInstrutor
        };

        return service;

        function normalizeDateOnly(value) {
            var year;
            var month;
            var day;
            var parts;
            var date;

            if (!value) return null;

            if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
                year = value.getFullYear();
                month = String(value.getMonth() + 1).padStart(2, '0');
                day = String(value.getDate()).padStart(2, '0');
                return [year, month, day].join('-');
            }

            if (typeof value === 'string') {
                parts = value.split('T')[0].split('-');
                if (parts.length === 3) {
                    return parts[0] + '-' + parts[1] + '-' + parts[2];
                }
            }

            date = new Date(value);
            if (isNaN(date.getTime())) return null;
            year = date.getFullYear();
            month = String(date.getMonth() + 1).padStart(2, '0');
            day = String(date.getDate()).padStart(2, '0');
            return [year, month, day].join('-');
        }

        function repairTextValue(value) {
            var repaired = value;

            if (typeof repaired !== 'string') {
                return repaired;
            }

            if (window.AppUiStandards && typeof window.AppUiStandards.repairText === 'function') {
                repaired = window.AppUiStandards.repairText(repaired);
            }

            if (typeof repairCadastroMusicText === 'function') {
                repaired = repairCadastroMusicText(repaired);
            }

            return repaired;
        }

        function repairRecordStrings(record) {
            Object.keys(record || {}).forEach(function (key) {
                if (typeof record[key] === 'string') {
                    record[key] = repairTextValue(record[key]);
                }
            });

            return record;
        }

        function getRecitativos() {
            var deferred = $q.defer();
            supabase.from('ebi_atividades').select('*').order('data_reuniao', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve((response.data || []).map(normalizeAtividadeRecord));
                });
            return deferred.promise;
        }

        function saveAtividade(data) {
            var deferred = $q.defer();
            var payload = normalizeAtividadePayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_atividades').insert([currentPayload]);
            }, payload, deferred);
            return deferred.promise;
        }

        function updateAtividade(data) {
            var deferred = $q.defer();
            var updateData = normalizeAtividadePayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_atividades').update(currentPayload).eq('id', data.id);
            }, updateData, deferred);
            return deferred.promise;
        }

        function deleteAtividade(id) {
            var deferred = $q.defer();
            supabase.from('ebi_atividades').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        // Students (Alunos)
        function getAlunos() {
            var deferred = $q.defer();
            supabase.from('ebi_criancas').select('*').order('nome_crianca', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve((response.data || []).map(normalizeAlunoRecord));
                });
            return deferred.promise;
        }

        function saveAluno(data) {
            var deferred = $q.defer();
            var payload = normalizeAlunoPayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_criancas').insert([currentPayload]);
            }, payload, deferred);
            return deferred.promise;
        }

        function updateAluno(data) {
            var deferred = $q.defer();
            var updateData = normalizeAlunoPayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_criancas').update(currentPayload).eq('id', data.id);
            }, updateData, deferred);
            return deferred.promise;
        }

        function deleteAluno(id) {
            var deferred = $q.defer();
            supabase.from('ebi_criancas').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        // Instructors (Instrutores)
        function getInstrutores() {
            var deferred = $q.defer();
            supabase.from('ebi_monitores').select('*').order('nome_completo', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve((response.data || []).map(normalizeMonitorRecord));
                });
            return deferred.promise;
        }

        function saveInstrutor(data) {
            var deferred = $q.defer();
            var payload = normalizeMonitorPayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_monitores').insert([currentPayload]);
            }, payload, deferred);
            return deferred.promise;
        }

        function updateInstrutor(data) {
            var deferred = $q.defer();
            var updateData = normalizeMonitorPayload(data);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_monitores').update(currentPayload).eq('id', data.id);
            }, updateData, deferred);
            return deferred.promise;
        }

        function deleteInstrutor(id) {
            var deferred = $q.defer();
            supabase.from('ebi_monitores').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function normalizeAlunoPayload(aluno) {
            var source = angular.copy(aluno || {});
            var payload = {};

            ALUNO_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.localidade = payload.localidade || payload.comum_congregacao || '';

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            return repairRecordStrings(payload);
        }

        function normalizeAtividadePayload(atividade) {
            var source = angular.copy(atividade || {});
            var instrutora = source.instrutora || source.contadora || '';
            var payload = {
                data_reuniao: normalizeDateOnly(source.data_reuniao),
                localidade: source.localidade || '',
                cidade: source.cidade || '',
                livro: source.livro || '',
                capitulo: source.capitulo || '',
                versiculo: source.versiculo || '',
                titulo_historia: source.titulo_historia || '',
                instrutora: instrutora,
                contadora: instrutora,
                meninas: source.meninas || 0,
                meninos: source.meninos || 0,
                colaboradoras: source.colaboradoras || 0,
                suspenso: source.suspenso || 'Não',
                justificativa: source.justificativa || ''
            };

            return repairRecordStrings(payload);
        }

        function normalizeAtividadeRecord(atividade) {
            var record = angular.copy(atividade || {});

            repairRecordStrings(record);

            record.instrutora = record.instrutora || record.contadora || '';
            if (!record.contadora && record.instrutora) {
                record.contadora = record.instrutora;
            }

            record.suspenso = record.suspenso || 'Não';
            record.justificativa = record.justificativa || '';

            return record;
        }

        function normalizeAlunoRecord(aluno) {
            var record = angular.copy(aluno || {});

            repairRecordStrings(record);

            record.localidade = record.localidade || record.comum_congregacao || '';
            record.comum_congregacao = record.comum_congregacao || record.localidade || '';
            record.status = record.status || 'Ativo';

            if (record.sexo === 'M') {
                record.sexo = 'Menino';
            } else if (record.sexo === 'F') {
                record.sexo = 'Menina';
            }

            return record;
        }

        function normalizeMonitorPayload(instrutor) {
            var source = angular.copy(instrutor || {});
            var payload = {};

            MONITOR_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.localidade = payload.localidade || payload.comum_congregacao || '';

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            return repairRecordStrings(payload);
        }

        function normalizeMonitorRecord(instrutor) {
            var record = angular.copy(instrutor || {});

            repairRecordStrings(record);

            record.localidade = record.localidade || record.comum_congregacao || '';
            record.comum_congregacao = record.comum_congregacao || record.localidade || '';
            record.status = record.status || 'Ativo';

            return record;
        }

        function extractMissingColumn(error) {
            var message = '';
            var match = null;

            if (!error) return null;

            message = (error.message || error.details || error.hint || error.toString() || '');
            match = message.match(/Could not find the '([^']+)' column/i);
            if (match && match[1]) return match[1];

            match = message.match(/column ["']?([^"' ]+)["']? does not exist/i);
            return match && match[1] ? match[1] : null;
        }

        function runWithMissingColumnRetry(requestFactory, payload, deferred, removedColumns) {
            var currentPayload = angular.copy(payload || {});
            var removed = removedColumns || {};

            requestFactory(currentPayload).then(function (response) {
                var missingColumn = null;

                if (!response.error) {
                    deferred.resolve(response.data);
                    return;
                }

                missingColumn = extractMissingColumn(response.error);
                if (missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn) && !removed[missingColumn]) {
                    removed[missingColumn] = true;
                    delete currentPayload[missingColumn];
                    runWithMissingColumnRetry(requestFactory, currentPayload, deferred, removed);
                    return;
                }

                deferred.reject(response.error);
            });
        }
    }
})();
