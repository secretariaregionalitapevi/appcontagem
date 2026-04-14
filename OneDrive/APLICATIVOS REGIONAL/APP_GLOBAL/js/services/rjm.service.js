(function () {
    'use strict';

    angular.module('inspinia')
        .factory('RjmService', RjmService);

    RjmService.$inject = ['$q'];

    function RjmService($q) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

        var service = {
            getRecitativos: getRecitativos,
            updateRecitativo: updateRecitativo,
            deleteRecitativo: deleteRecitativo,
            getComuns: getComuns,
            saveComum: saveComum,
            updateComum: updateComum,
            deleteComum: deleteComum,
            getAuxiliares: getAuxiliares,
            saveAuxiliar: saveAuxiliar,
            updateAuxiliar: updateAuxiliar,
            deleteAuxiliar: deleteAuxiliar
        };

        return service;

        function ensureSessionReady() {
            var deferred = $q.defer();

            supabase.auth.getSession().then(function (response) {
                if (response.error) {
                    deferred.reject(response.error);
                    return;
                }

                deferred.resolve(response.data ? response.data.session : null);
            });

            return deferred.promise;
        }

        function createDeferredQuery(query, mapper, tolerateError) {
            var deferred = $q.defer();
            ensureSessionReady()
                .then(function () {
                    return (typeof query === 'function' ? query() : query);
                })
                .then(function (response) {
                    if (response.error && !tolerateError) {
                        deferred.reject(response.error);
                        return;
                    }

                    if (response.error && tolerateError) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(mapper ? (response.data || []).map(mapper) : (response.data || []));
                })
                .catch(function (error) {
                    if (tolerateError) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function normalizeUpperText(value) {
            return String(value || '').trim().toUpperCase();
        }

        function normalizeRecitativoRecord(item) {
            var record = angular.copy(item || {});
            record.municipio = normalizeUpperText(record.municipio);
            record.comum = normalizeUpperText(record.comum);
            record.auxiliar_nome = String(record.auxiliar_nome || '').trim();
            record.auxiliar_email = String(record.auxiliar_email || '').trim().toLowerCase();
            return record;
        }

        function normalizeRecitativoPayload(item) {
            return {
                data_reuniao: String((item && item.data_reuniao) || '').trim(),
                meninas: parseInt((item && item.meninas), 10) || 0,
                meninos: parseInt((item && item.meninos), 10) || 0,
                mocas: parseInt((item && item.mocas), 10) || 0,
                mocos: parseInt((item && item.mocos), 10) || 0,
                total_recitativos: parseInt((item && item.total_recitativos), 10) || 0,
                total_comparecimento: parseInt((item && item.total_comparecimento), 10) || 0,
                municipio: normalizeUpperText(item && item.municipio),
                comum: normalizeUpperText(item && item.comum),
                auxiliar_id: item && item.auxiliar_id ? String(item.auxiliar_id).trim() : null,
                auxiliar_email: String((item && item.auxiliar_email) || '').trim().toLowerCase() || null,
                auxiliar_nome: String((item && item.auxiliar_nome) || '').trim() || null
            };
        }

        function normalizeComumRecord(item) {
            var record = angular.copy(item || {});
            record.comum = normalizeUpperText(record.comum);
            record.cidade = normalizeUpperText(record.cidade);
            record.cooperador_jovens = String(record.cooperador_jovens || '').trim();
            record.telefone = String(record.telefone || '').trim();
            return record;
        }

        function normalizeComumPayload(item) {
            return {
                comum: normalizeUpperText(item && item.comum),
                cidade: normalizeUpperText(item && item.cidade),
                cooperador_jovens: String((item && item.cooperador_jovens) || '').trim() || null,
                telefone: String((item && item.telefone) || '').trim() || null
            };
        }

        function normalizeAuxiliarRecord(item) {
            var record = angular.copy(item || {});
            record.full_name = String(record.full_name || '').trim();
            record.email = String(record.email || '').trim().toLowerCase();
            record.comum = normalizeUpperText(record.comum);
            record.cidade = normalizeUpperText(record.cidade);
            return record;
        }

        function normalizeAuxiliarPayload(item) {
            return {
                id: item && item.id ? item.id : null,
                full_name: String((item && item.full_name) || '').trim(),
                email: String((item && item.email) || '').trim().toLowerCase(),
                comum: normalizeUpperText(item && item.comum),
                cidade: normalizeUpperText(item && item.cidade)
            };
        }

        function getRecitativos() {
            return createDeferredQuery(
                function () {
                    return supabase.from('rjm_recitativos').select('*').order('data_reuniao', { ascending: false });
                },
                normalizeRecitativoRecord
            );
        }

        function updateRecitativo(data) {
            var deferred = $q.defer();
            supabase.from('rjm_recitativos').update(normalizeRecitativoPayload(data)).eq('id', data.id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function deleteRecitativo(id) {
            var deferred = $q.defer();
            supabase.from('rjm_recitativos').delete().eq('id', id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function getComuns() {
            return createDeferredQuery(
                function () {
                    return supabase.from('rjm_comuns').select('*').order('cidade', { ascending: true }).order('comum', { ascending: true });
                },
                normalizeComumRecord,
                true
            );
        }

        function saveComum(data) {
            var deferred = $q.defer();
            supabase.from('rjm_comuns').insert([normalizeComumPayload(data)]).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function updateComum(data) {
            var deferred = $q.defer();
            supabase.from('rjm_comuns').update(normalizeComumPayload(data)).eq('id', data.id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function deleteComum(id) {
            var deferred = $q.defer();
            supabase.from('rjm_comuns').delete().eq('id', id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function getAuxiliares() {
            return createDeferredQuery(
                function () {
                    return supabase.from('rjm_auxiliares').select('*').order('cidade', { ascending: true }).order('full_name', { ascending: true });
                },
                normalizeAuxiliarRecord,
                true
            );
        }

        function saveAuxiliar(data) {
            var deferred = $q.defer();
            var payload = normalizeAuxiliarPayload(data);

            if (!payload.id) {
                deferred.reject({ message: 'Selecione um usuário válido para vincular o auxiliar.' });
                return deferred.promise;
            }

            supabase.from('rjm_auxiliares').insert([payload]).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function updateAuxiliar(data) {
            var deferred = $q.defer();
            var payload = normalizeAuxiliarPayload(data);

            if (!payload.id) {
                deferred.reject({ message: 'Auxiliar sem vínculo de usuário.' });
                return deferred.promise;
            }

            supabase.from('rjm_auxiliares').update({
                full_name: payload.full_name,
                email: payload.email,
                comum: payload.comum,
                cidade: payload.cidade
            }).eq('id', payload.id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        function deleteAuxiliar(id) {
            var deferred = $q.defer();
            supabase.from('rjm_auxiliares').delete().eq('id', id).then(function (response) {
                if (response.error) deferred.reject(response.error);
                else deferred.resolve(response.data);
            });
            return deferred.promise;
        }
    }
})();
