(function () {
    'use strict';

    angular.module('inspinia')
        .factory('VisitasService', VisitasService);

    VisitasService.$inject = ['$q'];

    function VisitasService($q) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        return {
            getLancamentos: getLancamentos,
            saveLancamento: saveLancamento,
            updateLancamento: updateLancamento,
            deleteLancamento: deleteLancamento
        };

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

        function normalizeInteger(value) {
            var parsed = parseInt(value, 10);
            return isNaN(parsed) || parsed < 0 ? 0 : parsed;
        }

        function formatLocalDateOnly(value) {
            if (!(value instanceof Date) || isNaN(value.getTime())) {
                return null;
            }

            return value.getFullYear() + '-' +
                String(value.getMonth() + 1).padStart(2, '0') + '-' +
                String(value.getDate()).padStart(2, '0');
        }

        function normalizeDateOnly(value) {
            var date;

            if (!value) return null;

            if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
                return formatLocalDateOnly(value);
            }

            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }

            date = new Date(value);
            if (isNaN(date.getTime())) return null;
            return formatLocalDateOnly(date);
        }

        function getMesNumero(value) {
            var month = normalizeInteger(value);
            var index;

            if (month >= 1 && month <= 12) {
                return month;
            }

            for (index = 0; index < monthLabels.length; index += 1) {
                if (repairTextValue(value).toLowerCase() === repairTextValue(monthLabels[index]).toLowerCase()) {
                    return index + 1;
                }
            }

            return new Date().getMonth() + 1;
        }

        function getMesLabel(value) {
            return monthLabels[Math.max(1, Math.min(12, normalizeInteger(value))) - 1] || '';
        }

        function buildFriendlyError(error, fallbackMessage) {
            var message = (error && (error.message || error.error_description || error.details)) || fallbackMessage || 'Erro inesperado.';
            var lower = String(message || '').toLowerCase();

            if (lower.indexOf('visitas_lancamentos') !== -1 && lower.indexOf('does not exist') !== -1) {
                return {
                    code: 'schema_missing',
                    message: 'A tabela public.visitas_lancamentos ainda não existe no Supabase. Rode o arquivo visitas_schema.sql antes de usar o módulo.'
                };
            }

            if (lower.indexOf('duplicate key') !== -1 || lower.indexOf('unique') !== -1) {
                return {
                    code: 'duplicate',
                    message: 'Já existe um lançamento para esta comum no mês e ano selecionados.'
                };
            }

            return {
                code: (error && error.code) || 'unknown',
                message: message
            };
        }

        function normalizeRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.comum = repairTextValue(normalized.comum);
            normalized.municipio = repairTextValue(normalized.municipio);
            normalized.codigo_comum = repairTextValue(normalized.codigo_comum);
            normalized.observacoes = repairTextValue(normalized.observacoes);
            normalized.mes = getMesLabel(normalized.referencia_mes);
            normalized.ano = normalizeInteger(normalized.referencia_ano);
            normalized.data = normalized.data_lancamento;
            normalized.igreja = normalized.comum;
            normalized.musicos = normalizeInteger(normalized.gvmu);
            normalized.total = normalizeInteger(normalized.total_visitas) || (
                normalizeInteger(normalized.gvi) +
                normalizeInteger(normalized.gvm) +
                normalizeInteger(normalized.gvmu) +
                normalizeInteger(normalized.rf) +
                normalizeInteger(normalized.re)
            );

            normalized.gvi = normalizeInteger(normalized.gvi);
            normalized.gvm = normalizeInteger(normalized.gvm);
            normalized.rf = normalizeInteger(normalized.rf);
            normalized.re = normalizeInteger(normalized.re);

            return normalized;
        }

        function normalizePayload(input) {
            var payload = angular.copy(input || {});
            var referenciaAno = normalizeInteger(payload.referencia_ano || payload.ano);
            var referenciaMes = getMesNumero(payload.referencia_mes || payload.mes);

            return {
                data_lancamento: normalizeDateOnly(payload.data_lancamento || payload.data) || formatLocalDateOnly(new Date()),
                referencia_ano: referenciaAno || new Date().getFullYear(),
                referencia_mes: referenciaMes,
                municipio: repairTextValue(payload.municipio || ''),
                comum: repairTextValue(payload.comum || payload.igreja || ''),
                codigo_comum: repairTextValue(payload.codigo_comum || payload.codigo || ''),
                gvi: normalizeInteger(payload.gvi),
                gvm: normalizeInteger(payload.gvm),
                gvmu: normalizeInteger(payload.gvmu != null ? payload.gvmu : payload.musicos),
                rf: normalizeInteger(payload.rf),
                re: normalizeInteger(payload.re),
                status: repairTextValue(payload.status || 'Lançado'),
                observacoes: repairTextValue(payload.observacoes || '')
            };
        }

        function getLancamentos() {
            var deferred = $q.defer();

            supabase
                .from('visitas_lancamentos')
                .select('*')
                .order('referencia_ano', { ascending: false })
                .order('referencia_mes', { ascending: false })
                .order('municipio', { ascending: true })
                .order('comum', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, 'Erro ao carregar lançamentos de visitas.'));
                        return;
                    }

                    deferred.resolve((response.data || []).map(normalizeRecord));
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, 'Erro ao carregar lançamentos de visitas.'));
                });

            return deferred.promise;
        }

        function saveLancamento(data) {
            var deferred = $q.defer();
            var payload = normalizePayload(data);

            supabase
                .from('visitas_lancamentos')
                .insert([payload])
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, 'Erro ao salvar lançamento.'));
                        return;
                    }

                    deferred.resolve(normalizeRecord(response.data));
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, 'Erro ao salvar lançamento.'));
                });

            return deferred.promise;
        }

        function updateLancamento(data) {
            var deferred = $q.defer();
            var payload = normalizePayload(data);
            var id = data && data.id;

            if (!id) {
                deferred.reject({ code: 'missing_id', message: 'ID do lançamento não informado.' });
                return deferred.promise;
            }

            supabase
                .from('visitas_lancamentos')
                .update(payload)
                .eq('id', id)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, 'Erro ao atualizar lançamento.'));
                        return;
                    }

                    deferred.resolve(normalizeRecord(response.data));
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, 'Erro ao atualizar lançamento.'));
                });

            return deferred.promise;
        }

        function deleteLancamento(id) {
            var deferred = $q.defer();

            supabase
                .from('visitas_lancamentos')
                .delete()
                .eq('id', id)
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, 'Erro ao excluir lançamento.'));
                        return;
                    }

                    deferred.resolve(response.data);
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, 'Erro ao excluir lançamento.'));
                });

            return deferred.promise;
        }
    }
})();
