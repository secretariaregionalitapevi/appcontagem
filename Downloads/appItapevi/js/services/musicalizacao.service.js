(function () {
    'use strict';

    angular.module('inspinia')
        .factory('MusicalizacaoService', MusicalizacaoService);

    MusicalizacaoService.$inject = ['$q', 'AuthService'];

    function MusicalizacaoService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var ALUNO_FIELDS = [
            'nome_crianca',
            'sexo',
            'data_nascimento',
            'comum_congregacao',
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
            'status',
            'role'
        ];
        var AULA_FIELDS = [
            'data_aula',
            'cidade',
            'polo',
            'ciclo',
            'numero_aula',
            'meninos_presentes',
            'meninas_presentes',
            'instrutores_presentes',
            'colaboradores_presentes',
            'coordenadores_presentes',
            'nome_atividade',
            'observacoes'
        ];

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

        var service = {
            getAtividades: getAtividades,
            getAlunos: getAlunos,
            getPolos: getPolos,
            getInstrutores: getInstrutores,
            getAulas: getAulas,
            savePresenca: savePresenca,
            saveAluno: saveAluno,
            updateAluno: updateAluno,
            saveInstrutor: saveInstrutor,
            updateInstrutor: updateInstrutor,
            saveAula: saveAula,
            getAula: getAula,
            updateAula: updateAula,
            deleteAula: deleteAula,
            deleteAluno: deleteAluno,
            deleteInstrutor: deleteInstrutor,
            deletePolo: deletePolo,
            getPresenca: getPresenca,
            savePolo: savePolo,
            updatePolo: updatePolo
        };

        return service;

        function getPresenca(aulaId) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_presenca').select('*').eq('aula_id', aulaId)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function getAtividades() {
            var deferred = $q.defer();
            supabase.from('musicalizacao_aulas').select('*').order('data_aula', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function getAlunos() {
            var deferred = $q.defer();
            supabase.from('musicalizacao_criancas').select('*').order('nome_crianca', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve((response.data || []).map(normalizeAlunoRecord));
                });
            return deferred.promise;
        }

        function getPolos() {
            var deferred = $q.defer();
            // Polos might be fetched from a specific table or profiles with a certain role/sector
            supabase.from('musicalizacao_polos').select('*').order('nome_polo', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        // Fallback: If table doesn't exist, return sample or empty
                        deferred.resolve([]);
                    } else {
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        function getInstrutores() {
            var deferred = $q.defer();
            supabase.from('musicalizacao_monitores').select('*').order('nome_completo', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function getAulas() {
            var deferred = $q.defer();
            supabase.from('musicalizacao_aulas').select('*').order('data_aula', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function getAula(id) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_aulas').select('*').eq('id', id).single()
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function savePresenca(presencaData) {
            var deferred = $q.defer();
            var payload = angular.copy(presencaData || []);
            savePresencaOneByOne(payload).then(function (data) {
                deferred.resolve(data);
            }).catch(function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        }

        function updateAluno(aluno) {
            var deferred = $q.defer();
            var id = aluno.id;
            var data = normalizeAlunoPayload(aluno);
            var legacyData = normalizeAlunoLegacyPayload(aluno);

            runWithAlunoSchemaFallback(function (payload) {
                return supabase.from('musicalizacao_criancas').update(payload).eq('id', id);
            }, data, legacyData, deferred);
            return deferred.promise;
        }

        function saveAluno(alunoData) {
            var deferred = $q.defer();
            var data = normalizeAlunoPayload(alunoData);
            var legacyData = normalizeAlunoLegacyPayload(alunoData);

            runWithAlunoSchemaFallback(function (payload) {
                return supabase.from('musicalizacao_criancas').insert([payload]);
            }, data, legacyData, deferred);
            return deferred.promise;
        }

        function updateInstrutor(instrutor) {
            var deferred = $q.defer();
            var id = instrutor.id;
            var data = normalizeMonitorPayload(instrutor);

            runWithMissingColumnRetry(function (payload) {
                return supabase.from('musicalizacao_monitores').update(payload).eq('id', id);
            }, data, deferred);
            return deferred.promise;
        }

        function saveInstrutor(instrutorData) {
            var deferred = $q.defer();
            var data = normalizeMonitorPayload(instrutorData);

            runWithMissingColumnRetry(function (payload) {
                return supabase.from('musicalizacao_monitores').insert([payload]);
            }, data, deferred);
            return deferred.promise;
        }

        function saveAula(aulaData) {
            var deferred = $q.defer();
            var data = normalizeAulaPayload(aulaData);

            runWithMissingColumnRetry(function (payload) {
                return supabase.from('musicalizacao_aulas').insert([payload]);
            }, data, deferred);
            return deferred.promise;
        }

        function updateAula(aula) {
            var deferred = $q.defer();
            var id = aula.id;
            var data = normalizeAulaPayload(aula);

            runWithMissingColumnRetry(function (payload) {
                return supabase.from('musicalizacao_aulas').update(payload).eq('id', id);
            }, data, deferred);
            return deferred.promise;
        }

        function deleteAula(id) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_aulas').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }
    
        function savePolo(poloData) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_polos').insert([poloData])
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }
    
        function updatePolo(polo) {
            var deferred = $q.defer();
            var id = polo.id;
            var data = angular.copy(polo);
            delete data.id;
            delete data.created_at;
    
            supabase.from('musicalizacao_polos').update(data).eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function deletePolo(id) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_polos').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }
        function deleteAluno(id) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_criancas').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function deleteInstrutor(id) {
            var deferred = $q.defer();
            supabase.from('musicalizacao_monitores').delete().eq('id', id)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function boolToSimNao(value) {
            if (value === true) return 'Sim';
            if (value === false) return 'N\u00e3o';
            if (value === 'Sim' || value === 'N\u00e3o') return value;
            return value || '';
        }

        function simNaoToBool(value) {
            if (value === true || value === false) return value;
            if (value === 'Sim') return true;
            if (value === 'N\u00e3o') return false;
            return null;
        }

        function normalizeLegacyDate(value) {
            var text = String(value || '').trim();
            var parts = null;

            if (!text) return '';
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
            if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                parts = text.split('-');
                return [parts[2], parts[1], parts[0]].join('/');
            }

            return text;
        }

        function formatDateForLegacyDb(value) {
            var text = String(value || '').trim();
            var parts = null;

            if (!text) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
                parts = text.split('/');
                return [parts[2], parts[1], parts[0]].join('-');
            }

            return text;
        }

        function normalizeAlunoRecord(aluno) {
            var record = angular.copy(aluno || {});

            record.nome_crianca = record.nome_crianca || record.nome || record.nome_aluno || '';
            record.data_nascimento = record.data_nascimento || normalizeLegacyDate(record.nascimento);
            record.polo_participacao = record.polo_participacao || record.polo || '';
            record.nome_responsavel = record.nome_responsavel || record.responsavel || '';
            record.tem_whatsapp = record.tem_whatsapp || boolToSimNao(record.whatsapp);
            record.participa_reunioes_jovens_menores = record.participa_reunioes_jovens_menores || boolToSimNao(record.reunioes);
            record.participa_espaco_infantil = record.participa_espaco_infantil || boolToSimNao(record.espaco_infantil);
            record.logradouro_numero = record.logradouro_numero || record.rua_numero || '';
            record.dificuldade_aprendizagem = record.dificuldade_aprendizagem || boolToSimNao(record.dificuldade_aprendizagem);
            record.dificuldade_descricao = record.dificuldade_descricao || record.desc_dificuldade || '';
            record.faz_terapia = record.faz_terapia || boolToSimNao(record.faz_terapia);
            record.terapia_especialidade = record.terapia_especialidade || record.desc_terapia || '';
            record.pai_e_crente = record.pai_e_crente || boolToSimNao(record.pai_crente);
            record.mae_e_crente = record.mae_e_crente || boolToSimNao(record.mae_crente);
            record.pais_vivem_juntos = record.pais_vivem_juntos || boolToSimNao(record.pais_juntos);
            record.crianca_vive_com_os_pais = record.crianca_vive_com_os_pais || boolToSimNao(record.crianca_com_pais);
            record.se_nao_vive_com_pais_com_quem_vive = record.se_nao_vive_com_pais_com_quem_vive || record.vive_com_quem || '';
            record.status = record.status || 'Ativo';

            return record;
        }

        function normalizeAlunoPayload(aluno) {
            var source = angular.copy(aluno || {});
            var payload = {};

            ALUNO_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            return payload;
        }

        function normalizeAlunoLegacyPayload(aluno) {
            var source = angular.copy(aluno || {});

            return {
                nome: source.nome_crianca || source.nome || source.nome_aluno || '',
                nome_aluno: source.nome_crianca || source.nome_aluno || '',
                sexo: source.sexo || '',
                nascimento: formatDateForLegacyDb(source.data_nascimento || source.nascimento),
                comum_congregacao: source.comum_congregacao || '',
                polo: source.polo_participacao || source.polo || '',
                nome_pai: source.nome_pai || '',
                pai_crente: simNaoToBool(source.pai_e_crente),
                nome_mae: source.nome_mae || '',
                mae_crente: simNaoToBool(source.mae_e_crente),
                pais_juntos: simNaoToBool(source.pais_vivem_juntos),
                crianca_com_pais: simNaoToBool(source.crianca_vive_com_os_pais),
                vive_com_quem: source.se_nao_vive_com_pais_com_quem_vive || source.vive_com_quem || '',
                responsavel: source.nome_responsavel || source.responsavel || '',
                celular_responsavel: source.celular_responsavel || '',
                whatsapp: simNaoToBool(source.tem_whatsapp),
                reunioes: simNaoToBool(source.participa_reunioes_jovens_menores),
                espaco_infantil: simNaoToBool(source.participa_espaco_infantil),
                rua_numero: source.logradouro_numero || source.rua_numero || '',
                complemento: source.complemento || '',
                bairro: source.bairro || '',
                cidade: source.cidade || '',
                cep: source.cep || '',
                dificuldade_aprendizagem: simNaoToBool(source.dificuldade_aprendizagem),
                desc_dificuldade: source.dificuldade_descricao || source.desc_dificuldade || '',
                faz_terapia: simNaoToBool(source.faz_terapia),
                desc_terapia: source.terapia_especialidade || source.desc_terapia || ''
            };
        }

        function normalizeAulaPayload(aula) {
            var source = angular.copy(aula || {});
            var payload = {};

            AULA_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.meninos_presentes = parseInt(payload.meninos_presentes, 10) || 0;
            payload.meninas_presentes = parseInt(payload.meninas_presentes, 10) || 0;
            payload.instrutores_presentes = parseInt(payload.instrutores_presentes, 10) || 0;
            payload.colaboradores_presentes = parseInt(payload.colaboradores_presentes, 10) || 0;
            payload.coordenadores_presentes = parseInt(payload.coordenadores_presentes, 10) || 0;

            return payload;
        }

        function normalizeMonitorPayload(instrutor) {
            var source = angular.copy(instrutor || {});
            var payload = {};

            MONITOR_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            if (!payload.role) {
                payload.role = 'Monitor(a)';
            }

            return payload;
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

        function runWithAlunoSchemaFallback(requestFactory, currentPayload, legacyPayload, deferred) {
            var currentDeferred = $q.defer();

            runWithMissingColumnRetry(requestFactory, currentPayload, currentDeferred);

            currentDeferred.promise.then(function (data) {
                deferred.resolve(data);
            }).catch(function (error) {
                var missingColumn = extractMissingColumn(error);
                var legacyDeferred = null;

                if (!missingColumn || !legacyPayload) {
                    deferred.reject(error);
                    return;
                }

                legacyDeferred = $q.defer();
                runWithMissingColumnRetry(requestFactory, legacyPayload, legacyDeferred);
                legacyDeferred.promise.then(function (data) {
                    deferred.resolve(data);
                }).catch(function (legacyError) {
                    deferred.reject(legacyError);
                });
            });
        }

        function runBatchWithMissingColumnRetry(requestFactory, items, deferred, removedColumns, errorHandler) {
            var currentItems = angular.copy(items || []);
            var removed = removedColumns || {};

            requestFactory(currentItems).then(function (response) {
                var missingColumn = null;

                if (!response.error) {
                    deferred.resolve(response.data);
                    return;
                }

                missingColumn = extractMissingColumn(response.error);
                if (missingColumn && !removed[missingColumn]) {
                    removed[missingColumn] = true;
                    currentItems = currentItems.map(function (item) {
                        if (Object.prototype.hasOwnProperty.call(item, missingColumn)) {
                            delete item[missingColumn];
                        }
                        return item;
                    });
                    runBatchWithMissingColumnRetry(requestFactory, currentItems, deferred, removed, errorHandler);
                    return;
                }

                if (errorHandler && errorHandler(response.error, currentItems) === true) {
                    return;
                }

                deferred.reject(response.error);
            });
        }

        function savePresencaOneByOne(items) {
            var sequence = Promise.resolve([]);

            items.forEach(function (item) {
                sequence = sequence.then(function (results) {
                    return savePresencaItemWithFallback(item).then(function (savedItem) {
                        if (savedItem) {
                            results.push(savedItem);
                        }

                        return results;
                    });
                });
            });

            return sequence;
        }

        function savePresencaItemWithFallback(item) {
            var basePayload = angular.copy(item || {});
            var updatePayload = {
                presente: basePayload.presente,
                status: basePayload.status,
                observacoes: basePayload.observacoes
            };

            return tryUpdatePresencaItem(basePayload, updatePayload, {}).then(function (updateData) {
                if (updateData && updateData.length) {
                    return updateData[0];
                }

                return tryInsertPresencaItem(basePayload, {}).then(function (insertData) {
                    return insertData && insertData.length ? insertData[0] : null;
                });
            });
        }

        function tryUpdatePresencaItem(basePayload, updatePayload, removedColumns) {
            var currentPayload = angular.copy(updatePayload || {});
            var removed = removedColumns || {};

            return supabase.from('musicalizacao_presenca')
                .update(currentPayload)
                .eq('aula_id', basePayload.aula_id)
                .eq('aluno_id', basePayload.aluno_id)
                .select()
                .then(function (response) {
                    var missingColumn = null;

                    if (!response.error) {
                        return response.data || [];
                    }

                    missingColumn = extractMissingColumn(response.error);
                    if (missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn) && !removed[missingColumn]) {
                        removed[missingColumn] = true;
                        delete currentPayload[missingColumn];
                        return tryUpdatePresencaItem(basePayload, currentPayload, removed);
                    }

                    throw response.error;
                });
        }

        function tryInsertPresencaItem(payload, removedColumns) {
            var currentPayload = angular.copy(payload || {});
            var removed = removedColumns || {};

            return supabase.from('musicalizacao_presenca')
                .insert([currentPayload])
                .select()
                .then(function (response) {
                    var missingColumn = null;

                    if (!response.error) {
                        return response.data || [];
                    }

                    missingColumn = extractMissingColumn(response.error);
                    if (missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn) && !removed[missingColumn]) {
                        removed[missingColumn] = true;
                        delete currentPayload[missingColumn];
                        return tryInsertPresencaItem(currentPayload, removed);
                    }

                    throw response.error;
                });
        }
    }
})();

