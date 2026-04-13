(function () {
    'use strict';

    angular.module('inspinia')
        .factory('RjmService', RjmService);

    RjmService.$inject = ['$q', 'AuthService'];

    function RjmService($q, AuthService) {
        // We use the same configuration as AuthService or access it if possible
        // Since AuthService doesn't expose the supabase client, we re-initialize it here
        // or we could refactor AuthService to expose it. For now, we'll re-initialize.
        
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

        var service = {
            getRecitativos: getRecitativos
        };

        return service;

        function getRecitativos() {
            var deferred = $q.defer();

            // Fetching all columns first to identify the correct foreign key names
            supabase
                .from('rjm_recitativos')
                .select('*')
                .order('data_reuniao', { ascending: false })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                    } else {
                        deferred.resolve(response.data);
                    }
                });

            return deferred.promise;
        }
    }
})();
