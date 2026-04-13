(function () {
    'use strict';

    angular.module('inspinia')
        .factory('SantaCeiaService', SantaCeiaService);

    SantaCeiaService.$inject = ['$q', '$http', 'AuthService'];

    function SantaCeiaService($q, $http, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

        var service = {
            getRounds: getRounds,
            saveRounds: saveRounds,
            getEventMetadata: getEventMetadata,
            saveEventMetadata: saveEventMetadata,
            getAllEvents: getAllEvents,
            getAllRounds: getAllRounds,
            getEventSeed: getEventSeed,
            importEventSeed: importEventSeed
        };

        return service;

        function normalizeDateOnly(value) {
            if (!value) return null;
            var date = new Date(value);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        }

        function getAllEvents() {
            var deferred = $q.defer();
            supabase.from('santa_ceia_eventos').select('*')
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data || []);
                });
            return deferred.promise;
        }

        function getAllRounds() {
            var deferred = $q.defer();
            supabase.from('santa_ceia_contagem').select('*')
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data || []);
                });
            return deferred.promise;
        }

        function getRounds(date, municipio, comum) {
            var deferred = $q.defer();
            var query = supabase.from('santa_ceia_contagem').select('*');
            
            if (date) query = query.eq('data_evento', normalizeDateOnly(date));
            if (municipio) query = query.eq('municipio', municipio);
            if (comum) query = query.eq('comum', comum);

            query.order('rodada', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data || []);
                });
            return deferred.promise;
        }

        function saveRounds(rounds) {
            var deferred = $q.defer();
            // Delete existing rounds for same date/place before inserting new ones to prevent duplicates
            if (rounds.length > 0) {
                var first = rounds[0];
                supabase.from('santa_ceia_contagem')
                    .delete()
                    .eq('data_evento', first.data_evento)
                    .eq('municipio', first.municipio)
                    .eq('comum', first.comum)
                    .then(function (deleteRes) {
                        if (deleteRes.error) {
                            deferred.reject(deleteRes.error);
                        } else {
                            supabase.from('santa_ceia_contagem').insert(rounds)
                                .then(function (insertRes) {
                                    if (insertRes.error) deferred.reject(insertRes.error);
                                    else deferred.resolve(insertRes.data);
                                });
                        }
                    });
            } else {
                deferred.resolve([]);
            }
            return deferred.promise;
        }

        function getEventMetadata(date, municipio, comum) {
            var deferred = $q.defer();
            var query = supabase.from('santa_ceia_eventos').select('*');
            
            if (date) query = query.eq('data_evento', normalizeDateOnly(date));
            if (municipio) query = query.eq('municipio', municipio);
            if (comum) query = query.eq('comum', comum);

            query.maybeSingle()
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function saveEventMetadata(metadata) {
            var deferred = $q.defer();
            // Use upsert for metadata
            supabase.from('santa_ceia_eventos')
                .upsert([metadata], { onConflict: 'data_evento, municipio, comum' })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response.data);
                });
            return deferred.promise;
        }

        function getEventSeed(seedUrl) {
            var deferred = $q.defer();

            $http.get(seedUrl, { cache: false }).then(function (response) {
                deferred.resolve(angular.isArray(response.data) ? response.data : []);
            }).catch(function () {
                deferred.resolve([]);
            });

            return deferred.promise;
        }

        function importEventSeed(seedUrl) {
            var deferred = $q.defer();

            $http.get(seedUrl, { cache: false }).then(function (response) {
                var records = angular.isArray(response.data) ? response.data : [];

                if (!records.length) {
                    deferred.resolve({ imported: 0, records: [] });
                    return;
                }

                supabase.from('santa_ceia_eventos')
                    .upsert(records, { onConflict: 'data_evento, municipio, comum' })
                    .then(function (upsertResponse) {
                        if (upsertResponse.error) {
                            deferred.reject(upsertResponse.error);
                            return;
                        }

                        deferred.resolve({
                            imported: records.length,
                            records: upsertResponse.data || records
                        });
                    });
            }).catch(function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }
    }
})();
