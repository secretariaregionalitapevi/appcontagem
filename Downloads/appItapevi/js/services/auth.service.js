(function () {
    'use strict';

    angular.module('inspinia')
        .factory('AuthService', AuthService);

    AuthService.$inject = ['$q', '$rootScope', '$state'];

    function AuthService($q, $rootScope, $state) {
        // Supabase configuration
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';

        // Reuse a single Supabase client across the app to avoid duplicate auth clients.
        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var ministerioRegionalCache = null;

        var service = {
            login: login,
            register: register,
            logout: logout,
            getSession: getSession,
            getUserProfile: getUserProfile,
            refreshCurrentUserProfile: refreshCurrentUserProfile,
            updateUserProfile: updateUserProfile,
            listPendingUsers: listPendingUsers,
            listManagedUsers: listManagedUsers,
            listMinisterioRegional: listMinisterioRegional,
            listComunsCatalog: listComunsCatalog,
            searchComunsCatalog: searchComunsCatalog,
            listAccessLevels: listAccessLevels,
            listSectors: listSectors,
            getPublicDashboardSummary: getPublicDashboardSummary,
            reviewPendingUser: reviewPendingUserLegacyAware,
            updateManagedUser: updateManagedUser,
            deleteManagedUser: deleteManagedUser,
            createMinisterioRegional: createMinisterioRegional,
            updateMinisterioRegional: updateMinisterioRegional,
            deleteMinisterioRegional: deleteMinisterioRegional,
            updateMinisterioRegionalByComum: updateMinisterioRegionalByComum,
            deleteMinisterioRegionalByComum: deleteMinisterioRegionalByComum,
            getCurrentUserRole: getCurrentUserRole,
            getCurrentUserSector: getCurrentUserSector,
            logAudit: logAudit,
            trackPageAccess: trackPageAccess,
            countPendingUsers: countPendingUsers,
            handleLoginRedirect: handleLoginRedirect
        };

        return service;

        function repairCatalogText(value) {
            var current = String(value || '');
            var uiStandards = window.AppUiStandards || {};
            var attempts = 0;
            var next = current;

            function decodeMojibakeOnce(input) {
                try {
                    return decodeURIComponent(escape(input));
                } catch (error) {
                    return input;
                }
            }

            if (uiStandards.repairText) {
                current = uiStandards.repairText(current);
            }

            while (attempts < 2 && /[\u00c3\u00c2\uFFFD]/.test(current)) {
                next = decodeMojibakeOnce(current).replace(/\u00c2(?=\S)/g, '');

                if (next === current) {
                    break;
                }

                current = uiStandards.repairText ? uiStandards.repairText(next) : next;
                attempts += 1;
            }

            return current;
        }

        function normalizeText(value) {
            return repairCatalogText(value)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function normalizeRoleId(roleId, roleName) {
            var parsedRoleId = parseInt(roleId, 10);
            var normalizedRoleName = normalizeText(roleName);
            var roleMap = {
                master: 1,
                admin: 2,
                coordenador: 3,
                coordinator: 3,
                instrutor: 4,
                musico: 5,
                candidato: 6,
                membro: 7,
                member: 7
            };

            if (!isNaN(parsedRoleId) && parsedRoleId > 0) {
                return parsedRoleId;
            }

            return roleMap[normalizedRoleName] || 7;
        }

        function normalizeStatus(status) {
            var normalizedStatus = normalizeText(status);
            var statusMap = {
                pending: 'pending',
                pendente: 'pending',
                approved: 'approved',
                aprovado: 'approved',
                rejected: 'rejected',
                rejeitado: 'rejected'
            };

            return statusMap[normalizedStatus] || normalizedStatus || 'pending';
        }

        function normalizeRoleLabel(roleId, roleName) {
            var resolvedRoleId = normalizeRoleId(roleId, roleName);
            var labels = {
                1: 'Master',
                2: 'Admin',
                3: 'Coordenador',
                4: 'Instrutor',
                5: 'Músico',
                6: 'Candidato',
                7: 'Membro'
            };

            labels[5] = 'Músico';
            labels[5] = 'M\u00fasico';
            return labels[resolvedRoleId] || repairCatalogText(roleName) || 'Membro';
        }

        function normalizeSector(sector, roleId, roleName) {
            var normalizedRoleId = normalizeRoleId(roleId, roleName);
            var normalizedSector = normalizeText(sector);
            var sectorMap = {
                global: 'Global',
                administrativo: 'Administrativo',
                musicalizacao: 'Musicalizacao',
                musica: 'Musica',
                ebi: 'Ebi',
                rjm: 'RJM',
                visitas: 'Visitas',
                darpe: 'Darpe',
                depac: 'Depac',
                gem: 'Gem',
                inscricao: 'Inscrição'
            };

            sectorMap.ebi = 'EBI';
            sectorMap.inscricao = 'Inscrição';

            sectorMap.inscricao = 'Inscri\u00e7\u00e3o';

            if (normalizedRoleId === 1) {
                return 'Global';
            }

            if (normalizedRoleId === 2) {
                return 'Administrativo';
            }

            return sectorMap[normalizedSector] || repairCatalogText(sector) || '';
        }

        function titleCaseWords(value) {
            return repairCatalogText(value)
                .toLowerCase()
                .split(' ')
                .filter(function (part) { return !!part; })
                .map(function (part) {
                    return part.charAt(0).toUpperCase() + part.slice(1);
                })
                .join(' ');
        }

        function normalizeMunicipioCatalogLabel(value) {
            var repairedValue = repairCatalogText(value);
            var normalized = normalizeText(repairedValue).replace(/\s+/g, ' ');
            var labels = {
                'caucaia do alto': 'Caucaia do Alto',
                cotia: 'Cotia',
                itapevi: 'Itapevi',
                jandira: 'Jandira',
                'pirapora do bom jesus': 'Pirapora do Bom Jesus',
                'santana de parnaiba': 'Santana de Parna\u00edba',
                'vargem grande paulista': 'Vargem Grande Paulista'
            };

            if (!normalized) {
                return '';
            }

            if (normalized.indexOf('caucaia') !== -1) return labels['caucaia do alto'];
            if (normalized.indexOf('cotia') !== -1) return labels.cotia;
            if (normalized.indexOf('itapevi') !== -1) return labels.itapevi;
            if (normalized.indexOf('jandira') !== -1) return labels.jandira;
            if (normalized.indexOf('pirapora') !== -1) return labels['pirapora do bom jesus'];
            if (normalized.indexOf('santana') !== -1 && normalized.indexOf('parna') !== -1) return labels['santana de parnaiba'];
            if (normalized.indexOf('vargem') !== -1 && normalized.indexOf('paulista') !== -1) return labels['vargem grande paulista'];

            return labels[normalized] || titleCaseWords(repairedValue);
        }

        function matchKnownMunicipioCatalogLabel(value) {
            var repairedValue = repairCatalogText(value);
            var normalized = normalizeText(repairedValue).replace(/\s+/g, ' ');
            var labels = {
                'caucaia do alto': 'Caucaia do Alto',
                cotia: 'Cotia',
                itapevi: 'Itapevi',
                jandira: 'Jandira',
                'pirapora do bom jesus': 'Pirapora do Bom Jesus',
                'santana de parnaiba': 'Santana de Parnaíba',
                'vargem grande paulista': 'Vargem Grande Paulista'
            };

            if (!normalized) {
                return '';
            }

            if (normalized.indexOf('caucaia') !== -1) return labels['caucaia do alto'];
            if (normalized.indexOf('cotia') !== -1) return labels.cotia;
            if (normalized.indexOf('itapevi') !== -1) return labels.itapevi;
            if (normalized.indexOf('jandira') !== -1) return labels.jandira;
            if (normalized.indexOf('pirapora') !== -1) return labels['pirapora do bom jesus'];
            if (normalized.indexOf('santana') !== -1 && normalized.indexOf('parna') !== -1) return labels['santana de parnaiba'];
            if (normalized.indexOf('vargem') !== -1 && normalized.indexOf('paulista') !== -1) return labels['vargem grande paulista'];

            return labels[normalized] || '';
        }

        function firstCatalogValue(row, fieldNames) {
            var index;
            var fieldName;
            var value;

            for (index = 0; index < fieldNames.length; index += 1) {
                fieldName = fieldNames[index];
                value = row && row[fieldName];

                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    return repairCatalogText(String(value).trim());
                }
            }

            return '';
        }

        function resolveMunicipioCatalogValue(row) {
            var preferredValue = firstCatalogValue(row, [
                'cidade',
                'municipio',
                'localidade',
                'city',
                'cidade_nome',
                'municipio_nome',
                'nome_municipio',
                'nome_cidade',
                'cidade_comum',
                'municipio_comum',
                'regional_cidade',
                'regional_municipio'
            ]);
            var normalizedPreferred = matchKnownMunicipioCatalogLabel(preferredValue);

            if (normalizedPreferred) {
                return normalizedPreferred;
            }

            return '';
        }

        function resolveComumCatalogName(row, query) {
            var candidateFields = ['comum', 'nome_comum', 'nome', 'name', 'descricao', 'description', 'titulo', 'title', 'label'];
            var normalizedQuery = normalizeText(query);
            var candidates = [];
            var seen = {};

            candidateFields.forEach(function (fieldName, index) {
                var value = row && row[fieldName];
                var repairedValue;
                var normalizedValue;

                if (value === undefined || value === null || String(value).trim() === '') {
                    return;
                }

                repairedValue = repairCatalogText(String(value).trim());
                normalizedValue = normalizeText(repairedValue);

                if (!normalizedValue || seen[normalizedValue]) {
                    return;
                }

                seen[normalizedValue] = true;
                candidates.push({
                    value: repairedValue,
                    normalized: normalizedValue,
                    priority: index
                });
            });

            if (!candidates.length) {
                return '';
            }

            if (normalizedQuery) {
                candidates = candidates.filter(function (item) {
                    return item.normalized.indexOf(normalizedQuery) !== -1;
                });
            }

            if (!candidates.length) {
                return '';
            }

            candidates.sort(function (a, b) {
                if (b.value.length !== a.value.length) {
                    return b.value.length - a.value.length;
                }

                return a.priority - b.priority;
            });

            return candidates[0].value;
        }

        function normalizeComumCatalogRow(row, query) {
            var nome = resolveComumCatalogName(row, query);
            var cidade = resolveMunicipioCatalogValue(row);
            var codigo = firstCatalogValue(row, ['codigo', 'cod', 'sigla']);

            if (!nome) {
                return null;
            }

            return {
                id: row && row.id ? row.id : null,
                codigo: codigo || null,
                nome: nome,
                cidade: cidade
            };
        }

        function normalizeProfile(profile) {
            var normalizedProfile;

            if (!profile || typeof profile !== 'object') {
                return profile;
            }

            normalizedProfile = angular.extend({}, profile);
            Object.keys(normalizedProfile).forEach(function (key) {
                if (typeof normalizedProfile[key] === 'string') {
                    normalizedProfile[key] = repairCatalogText(normalizedProfile[key]);
                }
            });
            normalizedProfile.role_id = normalizeRoleId(normalizedProfile.role_id, normalizedProfile.role);
            normalizedProfile.role = normalizeRoleLabel(normalizedProfile.role_id, normalizedProfile.role);
            normalizedProfile.sector = normalizeSector(normalizedProfile.sector, normalizedProfile.role_id, normalizedProfile.role);
            normalizedProfile.status = normalizeStatus(normalizedProfile.status);

            return normalizedProfile;
        }

        function hasAccessProfileChanged(previousProfile, nextProfile) {
            if (!previousProfile || !nextProfile) {
                return false;
            }

            return normalizeStatus(previousProfile.status) !== normalizeStatus(nextProfile.status) ||
                normalizeRoleId(previousProfile.role_id, previousProfile.role) !== normalizeRoleId(nextProfile.role_id, nextProfile.role) ||
                normalizeSector(previousProfile.sector, previousProfile.role_id, previousProfile.role) !==
                    normalizeSector(nextProfile.sector, nextProfile.role_id, nextProfile.role);
        }

        function syncCurrentUserProfile(profile, options) {
            var previousProfile = $rootScope.currentUser || null;
            var normalizedProfile = normalizeProfile(profile);
            var shouldRedirect = options && options.redirectOnAccessChange;

            $rootScope.currentUser = normalizedProfile;
            $rootScope.currentUserResolved = true;

            if (shouldRedirect && (!previousProfile || hasAccessProfileChanged(previousProfile, normalizedProfile))) {
                handleLoginRedirect(normalizedProfile);
            }

            return normalizedProfile;
        }

        /**
         * Direciona o usuário para o ambiente correto baseado no Setor e Status
         */
        function handleLoginRedirect(profile) {
            profile = normalizeProfile(profile);

            if (!profile) return $state.go('login');

            // Se ainda estiver pendente, vai para a Dashboard 1 (Aguarde)
            if (normalizeStatus(profile.status) === 'pending') {
                return $state.go('dashboards.dashboard_1');
            }

            // Redirecionamento por Setor
            var sector = normalizeSector(profile.sector, profile.role_id, profile.role).toUpperCase();
            var roleId = normalizeRoleId(profile.role_id, profile.role);

            // Master (1) e Admin (2) sempre podem ver a Dashboard Global (Dashboard 2)
            if (roleId === 1 || roleId === 2 || sector === 'GLOBAL') {
                return $state.go('dashboards.dashboard_2');
            }

            switch (sector) {
                case 'ADMINISTRATIVO':
                    $state.go('admin.search_results');
                    break;
                case 'EBI':
                    $state.go('ebi.dashboard');
                    break;
                case 'MUSICALIZACAO':
                case 'MUSICALIZAÇÃO':
                    $state.go('musicalizacao.dashboard');
                    break;
                case 'MUSICA':
                    $state.go('music.static_table');
                    break;
                case 'VISITAS':
                    $state.go('visitas.dashboard');
                    break;
                case 'DARPE':
                    $state.go('darpe.musicos');
                    break;
                case 'GEM':
                    $state.go('forms.basic_form');
                    break;
                case 'RJM':
                    $state.go('rjm.dashboard');
                    break;
                default:
                    $state.go('app.profile');
                    break;
            }
        }

        function normalizeProfileSaveError(error) {
            var message = (error && error.message) ? String(error.message) : String(error || '');

            if (message.indexOf("row-level security policy") !== -1) {
                return {
                    message: 'A política RLS impediu a operação. Verifique as permissões de acesso.'
                };
            }

            return error;
        }

        function normalizeAuthError(error) {
            var originalMessage = (error && error.message) ? String(error.message) : String(error || '');
            var normalizedMessage = originalMessage;
            var lowerMessage = originalMessage.toLowerCase();

            if (!originalMessage) {
                return {
                    message: 'Ocorreu um erro inesperado na autenticação. Tente novamente.'
                };
            }

            if (lowerMessage.indexOf('database error saving new user') !== -1) {
                normalizedMessage = 'Erro ao salvar o novo usuário no banco de dados. Motivo provável: a rotina automática de criação do perfil falhou na tabela de perfis por trigger, permissão ou política RLS.';
            } else if (lowerMessage.indexOf('user already registered') !== -1 || lowerMessage.indexOf('email already registered') !== -1) {
                normalizedMessage = 'Este e-mail já está cadastrado.';
            } else if (lowerMessage.indexOf('signup is disabled') !== -1) {
                normalizedMessage = 'O cadastro está desativado no momento.';
            } else if (lowerMessage.indexOf('password should be at least 6 characters') !== -1) {
                normalizedMessage = 'A senha deve ter pelo menos 6 caracteres.';
            } else if (lowerMessage.indexOf('email rate limit exceeded') !== -1) {
                normalizedMessage = 'Muitas tentativas para este e-mail. Aguarde um momento e tente novamente.';
            } else if (lowerMessage.indexOf('invalid login credentials') !== -1) {
                normalizedMessage = 'E-mail, usuário ou senha inválidos.';
            } else if (lowerMessage.indexOf('email not confirmed') !== -1) {
                normalizedMessage = 'Seu e-mail ainda não foi confirmado.';
            } else if (lowerMessage.indexOf('user not found') !== -1) {
                normalizedMessage = 'Usuário não encontrado.';
            } else if (lowerMessage.indexOf('too many requests') !== -1) {
                normalizedMessage = 'Muitas tentativas. Tente novamente mais tarde.';
            } else if (lowerMessage.indexOf('row-level security policy') !== -1) {
                normalizedMessage = 'A operação foi bloqueada pela política de segurança do banco de dados.';
            }

            if (error && typeof error === 'object') {
                return angular.extend({}, error, {
                    message: normalizedMessage,
                    originalMessage: originalMessage
                });
            }

            return {
                message: normalizedMessage,
                originalMessage: originalMessage
            };
        }

        function register(userData) {
            var deferred = $q.defer();

            supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.name,
                        comum: userData.comum
                    }
                }
            }).then(function (response) {
                if (response.error) {
                    deferred.reject(normalizeAuthError(response.error));
                } else {
                    // Nota: A Trigger no banco criará o perfil automaticamente agora.
                    logAudit(response.data.user.id, 'REGISTER', 'AUTH', {
                        email: userData.email,
                        full_name: userData.name,
                        comum: userData.comum
                    });
                    deferred.resolve(response.data);
                }
            });

            return deferred.promise;
        }

        function getCurrentAuditActor() {
            var currentUser = $rootScope.currentUser || {};
            return {
                actor_user_id: currentUser.user_id || null,
                actor_name: currentUser.full_name || null,
                actor_role_id: currentUser.role_id || null,
                actor_role: currentUser.role || null,
                actor_sector: currentUser.sector || null
            };
        }

        function logAudit(userId, action, module, details) {
            var mergedDetails = angular.extend({
                timestamp_client: new Date().toISOString(),
                current_path: window.location.pathname || '/',
                current_hash: window.location.hash || '',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
            }, getCurrentAuditActor(), details || {});
            var payload = {
                user_id: userId || null,
                action: action,
                module: module || 'GLOBAL',
                details: mergedDetails,
                user_agent: window.navigator.userAgent,
                created_at: new Date().toISOString()
            };
            return supabase.from('audit_logs').insert(payload);
        }

        function trackPageAccess(stateName, pageTitle) {
            var currentUser = $rootScope.currentUser;
            var deferred = $q.defer();

            if (!currentUser || !currentUser.user_id) {
                return $q.when(null);
            }

            logAudit(currentUser.user_id, 'VIEW_PAGE', 'NAVIGATION', {
                state_name: stateName || null,
                page_title: pageTitle || null
            }).then(function (response) {
                if (response && response.error) {
                    deferred.reject(response.error);
                    return;
                }

                deferred.resolve(response ? response.data || null : null);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        function login(credentials) {
            var deferred = $q.defer();

            if (!credentials || !credentials.email || !credentials.password) {
                deferred.reject({ message: 'E-mail e senha são obrigatórios' });
                return deferred.promise;
            }

            supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            }).then(function (response) {
                if (response.error) {
                    deferred.reject(normalizeAuthError(response.error));
                } else {
                    getUserProfile(response.data.user.id).then(function (profile) {
                        syncCurrentUserProfile(profile);
                        logAudit(response.data.user.id, 'LOGIN', 'AUTH', {
                            email: credentials.email,
                            resolved_role_id: profile.role_id,
                            resolved_role: profile.role,
                            resolved_sector: profile.sector,
                            resolved_status: profile.status
                        });
                        deferred.resolve({
                            user: response.data.user,
                            session: response.data.session,
                            profile: profile
                        });
                    }).catch(function (err) {
                        deferred.reject(err);
                    });
                }
            });

            return deferred.promise;
        }

        function countPendingUsers() {
            return supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
        }

        function uniqueStrings(list) {
            return (list || []).filter(function (item, index, array) {
                return !!item && array.indexOf(item) === index;
            });
        }

        function parseMunicipiosList(value) {
            if (angular.isArray(value)) {
                return uniqueStrings(value);
            }

            if (typeof value === 'string') {
                return uniqueStrings(value.split(',').map(function (item) {
                    return (item || '').trim();
                }));
            }

            return [];
        }

        function firstNumber() {
            var index;

            for (index = 0; index < arguments.length; index += 1) {
                if (typeof arguments[index] === 'number' && !isNaN(arguments[index])) {
                    return arguments[index];
                }
            }

            return null;
        }

        function resolveCountResponseCount(response) {
            if (response && !response.error && typeof response.count === 'number') {
                return response.count;
            }

            return null;
        }

        function countFromFirstAvailableSource(sourceNames, queryBuilder) {
            var deferred = $q.defer();

            function tryNext(index) {
                var query;

                if (index >= sourceNames.length) {
                    deferred.resolve(null);
                    return;
                }

                query = supabase.from(sourceNames[index]).select('*', { count: 'exact', head: true });
                if (typeof queryBuilder === 'function') {
                    query = queryBuilder(query);
                }

                query.then(function (response) {
                    var count = resolveCountResponseCount(response);

                    if (typeof count === 'number') {
                        deferred.resolve(count);
                    } else {
                        tryNext(index + 1);
                    }
                }).catch(function () {
                    tryNext(index + 1);
                });
            }

            tryNext(0);
            return deferred.promise;
        }

        function fetchFirstAvailablePublicSummaryView(viewNames) {
            var deferred = $q.defer();

            function tryNext(index) {
                if (index >= viewNames.length) {
                    deferred.resolve(null);
                    return;
                }

                supabase
                    .from(viewNames[index])
                    .select('*')
                    .limit(1)
                    .then(function (response) {
                        if (response && !response.error && response.data && response.data.length) {
                            deferred.resolve(response.data[0]);
                        } else {
                            tryNext(index + 1);
                        }
                    }).catch(function () {
                        tryNext(index + 1);
                    });
            }

            tryNext(0);
            return deferred.promise;
        }

        function normalizePublicDashboardSummaryRow(row) {
            var municipios = parseMunicipiosList(
                row && (
                    row.municipios ||
                    row.municipios_list ||
                    row.municipios_json
                )
            );

            return {
                comunsCount: firstNumber(row && row.comuns_count, row && row.comunsCount, row && row.igrejas_count, row && row.igrejasCount),
                usuariosCount: firstNumber(row && row.usuarios_count, row && row.usuariosCount),
                candidatosCount: firstNumber(row && row.candidatos_count, row && row.candidatosCount),
                municipiosCount: firstNumber(row && row.municipios_count, row && row.municipiosCount, municipios.length || null),
                municipios: municipios,
                musicosCount: firstNumber(row && row.musicos_count, row && row.musicosCount),
                organistasCount: firstNumber(row && row.organistas_count, row && row.organistasCount),
                totalTocamCount: firstNumber(row && row.total_tocam_count, row && row.totalTocamCount, row && row.total_musical_count),
                igrejasCount: firstNumber(row && row.igrejas_count, row && row.igrejasCount, row && row.comuns_count, row && row.comunsCount)
            };
        }

        function getPublicDashboardSummary() {
            var deferred = $q.defer();
            var comuns = uniqueStrings(((window.CadastroMusicData || {}).comuns) || []);
            var municipiosOficiais = [
                'Caucaia do Alto',
                'Cotia',
                'Itapevi',
                'Jandira',
                'Pirapora do Bom Jesus',
                'Santana de Parnaíba',
                'Vargem Grande Paulista'
            ];

            $q.all({
                usuarios: supabase.from('profiles').select('*', { count: 'exact', head: true }),
                candidatos: supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role_id', 6)
            }).then(function (results) {
                var usuariosCount = results.usuarios && typeof results.usuarios.count === 'number' ? results.usuarios.count : 0;
                var candidatosCount = results.candidatos && typeof results.candidatos.count === 'number' ? results.candidatos.count : 0;

                deferred.resolve({
                    comunsCount: comuns.length || 183,
                    usuariosCount: usuariosCount,
                    candidatosCount: candidatosCount,
                    municipiosCount: municipiosOficiais.length,
                    municipios: municipiosOficiais,
                    // Mantidos como baseline institucional até consolidarmos as fontes finais do módulo musical.
                    musicosCount: 5139,
                    organistasCount: 1723,
                    totalTocamCount: 7240,
                    igrejasCount: comuns.length || 183
                });
            }).catch(function () {
                deferred.resolve({
                    comunsCount: comuns.length || 183,
                    usuariosCount: 0,
                    candidatosCount: 0,
                    municipiosCount: municipiosOficiais.length,
                    municipios: municipiosOficiais,
                    musicosCount: 5139,
                    organistasCount: 1723,
                    totalTocamCount: 7240,
                    igrejasCount: comuns.length || 183
                });
            });

            return deferred.promise;
        }

        function dashboardSummaryUniqueStrings(list) {
            return (list || []).filter(function (item, index, array) {
                return !!item && array.indexOf(item) === index;
            });
        }

        function dashboardSummaryParseMunicipios(value) {
            if (angular.isArray(value)) {
                return dashboardSummaryUniqueStrings(value);
            }

            if (typeof value === 'string') {
                return dashboardSummaryUniqueStrings(value.split(',').map(function (item) {
                    return (item || '').trim();
                }));
            }

            return [];
        }

        function dashboardSummaryFirstNumber() {
            var index;

            for (index = 0; index < arguments.length; index += 1) {
                if (typeof arguments[index] === 'number' && !isNaN(arguments[index])) {
                    return arguments[index];
                }
            }

            return null;
        }

        function dashboardSummaryNormalizeRow(row) {
            var municipios = dashboardSummaryParseMunicipios(
                row && (
                    row.municipios ||
                    row.municipios_list ||
                    row.municipios_json
                )
            );

            return {
                comunsCount: dashboardSummaryFirstNumber(row && row.comuns_count, row && row.igrejas_count, row && row.comunsCount, row && row.igrejasCount),
                usuariosCount: dashboardSummaryFirstNumber(row && row.usuarios_count, row && row.usuariosCount),
                candidatosCount: dashboardSummaryFirstNumber(row && row.candidatos_count, row && row.candidatosCount),
                municipiosCount: dashboardSummaryFirstNumber(row && row.municipios_count, row && row.municipiosCount, municipios.length || null),
                municipios: municipios,
                musicosCount: dashboardSummaryFirstNumber(row && row.musicos_count, row && row.musicosCount),
                organistasCount: dashboardSummaryFirstNumber(row && row.organistas_count, row && row.organistasCount),
                totalTocamCount: dashboardSummaryFirstNumber(row && row.total_tocam_count, row && row.totalTocamCount, row && row.total_musical_count),
                igrejasCount: dashboardSummaryFirstNumber(row && row.igrejas_count, row && row.igrejasCount, row && row.comuns_count, row && row.comunsCount)
            };
        }

        function getPublicDashboardSummary() {
            var deferred = $q.defer();
            var municipiosOficiais = [
                'Caucaia do Alto',
                'Cotia',
                'Itapevi',
                'Jandira',
                'Pirapora do Bom Jesus',
                'Santana de Parna\u00edba',
                'Vargem Grande Paulista'
            ];
            listComunsCatalog().then(function (comunsCatalog) {
                var comunsCount = (comunsCatalog || []).length || 183;
                var fallbackSummary = {
                    comunsCount: comunsCount,
                    usuariosCount: 0,
                    candidatosCount: 2457,
                    municipiosCount: municipiosOficiais.length,
                    municipios: municipiosOficiais,
                    musicosCount: 4724,
                    organistasCount: 1600,
                    totalTocamCount: 6324,
                    igrejasCount: comunsCount
                };

                supabase
                    .rpc('get_public_dashboard_summary')
                    .then(function (response) {
                        var row = dashboardSummaryNormalizeRow(
                            response && !response.error && response.data
                                ? (angular.isArray(response.data) ? response.data[0] : response.data)
                                : null
                        );
                        var musicosCount = dashboardSummaryFirstNumber(row.musicosCount, fallbackSummary.musicosCount);
                        var organistasCount = dashboardSummaryFirstNumber(row.organistasCount, fallbackSummary.organistasCount);
                        var municipios = (row.municipios && row.municipios.length) ? row.municipios : fallbackSummary.municipios;

                        if (response && response.error) {
                            deferred.resolve(fallbackSummary);
                            return;
                        }

                        deferred.resolve({
                            comunsCount: dashboardSummaryFirstNumber(row.comunsCount, fallbackSummary.comunsCount),
                            usuariosCount: dashboardSummaryFirstNumber(row.usuariosCount, fallbackSummary.usuariosCount),
                            candidatosCount: dashboardSummaryFirstNumber(row.candidatosCount, fallbackSummary.candidatosCount),
                            municipiosCount: dashboardSummaryFirstNumber(row.municipiosCount, municipios.length, fallbackSummary.municipiosCount),
                            municipios: municipios,
                            musicosCount: musicosCount,
                            organistasCount: organistasCount,
                            totalTocamCount: dashboardSummaryFirstNumber(row.totalTocamCount, musicosCount + organistasCount, fallbackSummary.totalTocamCount),
                            igrejasCount: dashboardSummaryFirstNumber(row.igrejasCount, fallbackSummary.igrejasCount)
                        });
                    }).catch(function () {
                        deferred.resolve(fallbackSummary);
                    });
            }).catch(function () {
                deferred.resolve({
                    comunsCount: 183,
                    usuariosCount: 0,
                    candidatosCount: 2457,
                    municipiosCount: municipiosOficiais.length,
                    municipios: municipiosOficiais,
                    musicosCount: 4724,
                    organistasCount: 1600,
                    totalTocamCount: 6324,
                    igrejasCount: 183
                });
            });

            return deferred.promise;
        }

        function listPendingUsers() {
            var deferred = $q.defer();

            supabase
                .from('profiles')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                    } else {
                        deferred.resolve((response.data || []).map(normalizeProfile));
                    }
                });

            return deferred.promise;
        }

        function listManagedUsers() {
            var deferred = $q.defer();

            supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                    } else {
                        deferred.resolve((response.data || []).map(normalizeProfile));
                    }
                });

            return deferred.promise;
        }

        function listComunsCatalog() {
            var deferred = $q.defer();
            var allRows = [];
            var pageSize = 1000;

            function fetchPage(fromIndex) {
                supabase
                    .from('comum')
                    .select('*')
                    .range(fromIndex, fromIndex + pageSize - 1)
                    .then(function (response) {
                        var batch;
                        var rows;

                        if (response.error) {
                            deferred.reject(response.error);
                            return;
                        }

                        batch = response.data || [];
                        allRows = allRows.concat(batch);

                        if (batch.length === pageSize) {
                            fetchPage(fromIndex + pageSize);
                            return;
                        }

                        rows = allRows
                            .map(function (row) {
                                return normalizeComumCatalogRow(row);
                            })
                            .filter(function (item) { return !!item; })
                            .sort(function (a, b) {
                                return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
                            });

                        deferred.resolve(rows);
                    }).catch(function (error) {
                        deferred.reject(error);
                    });
            }

            fetchPage(0);

            return deferred.promise;
        }

        function searchComunsCatalog(query, limit) {
            var deferred = $q.defer();
            var normalizedQuery = String(query || '').trim();
            var size = Math.max(1, Math.min(parseInt(limit, 10) || 20, 50));

            if (!normalizedQuery) {
                deferred.resolve([]);
                return deferred.promise;
            }

            supabase
                .from('comum')
                .select('*')
                .or([
                    'comum.ilike.*' + normalizedQuery + '*',
                    'nome_comum.ilike.*' + normalizedQuery + '*',
                    'nome.ilike.*' + normalizedQuery + '*',
                    'name.ilike.*' + normalizedQuery + '*',
                    'descricao.ilike.*' + normalizedQuery + '*',
                    'description.ilike.*' + normalizedQuery + '*',
                    'titulo.ilike.*' + normalizedQuery + '*',
                    'title.ilike.*' + normalizedQuery + '*',
                    'label.ilike.*' + normalizedQuery + '*'
                ].join(','))
                .limit(size)
                .then(function (response) {
                    var rows;

                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    rows = (response.data || [])
                        .map(function (row) {
                            return normalizeComumCatalogRow(row, normalizedQuery);
                        })
                        .filter(function (item) { return !!item; })
                        .sort(function (a, b) {
                            return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
                        });

                    deferred.resolve(rows);
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function listAccessLevels() {
            var deferred = $q.defer();

            supabase
                .from('access_levels')
                .select('id, name, description, level_order')
                .order('level_order', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                    } else {
                        deferred.resolve(response.data || []);
                    }
                });

            return deferred.promise;
        }

        function normalizeMinisterioRegionalRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.id = normalized.id || null;
            normalized.nome = repairCatalogText(normalized.nome || normalized.full_name || '');
            normalized.data_apresentacao = normalized.data_apresentacao || null;
            normalized.data_ordenacao = normalized.data_ordenacao || null;
            normalized.ministerio = repairCatalogText(normalized.ministerio || '');
            normalized.comum = repairCatalogText(normalized.comum || '');
            normalized.municipio = normalizeMunicipioCatalogLabel(normalized.municipio || '');
            normalized.administracao = repairCatalogText(normalized.administracao || '');
            normalized.rrm = repairCatalogText(normalized.rrm || '');
            normalized.aprovador_rrm = repairCatalogText(normalized.aprovador_rrm || '');
            normalized.status = repairCatalogText(normalized.status || 'Ativo');
            normalized.sexo = repairCatalogText(normalized.sexo || '');
            normalized.cadastro_completo = !!normalized.cadastro_completo;
            normalized.possui_foto = !!normalized.possui_foto;
            normalized.observacoes = repairCatalogText(normalized.observacoes || '');
            normalized.created_at = normalized.created_at || null;
            normalized.updated_at = normalized.updated_at || null;

            return normalized;
        }

        function buildMinisterioRegionalPayload(data) {
            var normalized = normalizeMinisterioRegionalRecord(data);

            return {
                nome: normalized.nome || null,
                data_apresentacao: normalized.data_apresentacao || null,
                data_ordenacao: normalized.data_ordenacao || null,
                ministerio: normalized.ministerio || null,
                comum: normalized.comum || null,
                municipio: normalized.municipio || null,
                administracao: normalized.administracao || null,
                rrm: normalized.rrm || null,
                aprovador_rrm: normalized.aprovador_rrm || null,
                cadastro_completo: !!normalized.cadastro_completo,
                status: normalized.status || 'Ativo',
                possui_foto: !!normalized.possui_foto,
                sexo: normalized.sexo || null,
                observacoes: normalized.observacoes || null
            };
        }

        function listMinisterioRegional() {
            var deferred = $q.defer();

            if (arguments[0] !== true && ministerioRegionalCache) {
                deferred.resolve(angular.copy(ministerioRegionalCache));
                return deferred.promise;
            }

            supabase
                .from('ministerio_regional')
                .select('id,nome,data_apresentacao,data_ordenacao,ministerio,comum,municipio,administracao,rrm,aprovador_rrm,status,sexo,cadastro_completo,possui_foto,observacoes,created_at,updated_at')
                .order('nome', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    ministerioRegionalCache = (response.data || []).map(normalizeMinisterioRegionalRecord);
                    deferred.resolve(angular.copy(ministerioRegionalCache));
                });

            return deferred.promise;
        }

        function listSectors() {
            var deferred = $q.defer();

            supabase
                .from('sectors')
                .select('id, name, description')
                .order('name', { ascending: true })
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                    } else {
                        deferred.resolve(response.data || []);
                    }
                });

            return deferred.promise;
        }

        function reviewPendingUser(userId, reviewData) {
            var deferred = $q.defer();
            var normalizedRoleId;
            var normalizedRole;
            var normalizedSector;
            var targetStatus;
            var payload;

            if (!userId) {
                deferred.reject({ message: 'Usuário não identificado.' });
                return deferred.promise;
            }

            reviewData = reviewData || {};
            normalizedRoleId = normalizeRoleId(reviewData.role_id, reviewData.role);
            normalizedRole = normalizeRoleLabel(normalizedRoleId, reviewData.role);
            normalizedSector = normalizeSector(reviewData.sector, normalizedRoleId, normalizedRole);
            targetStatus = reviewData.status || 'approved';

            payload = {
                role_id: normalizedRoleId,
                role: normalizedRole,
                sector: normalizedSector,
                cargo: reviewData.cargo || null,
                comum: reviewData.comum || null,
                status: targetStatus
            };

            supabase
                .from('profiles')
                .update(payload)
                .eq('user_id', userId)
                .select('*')
                .then(function (response) {
                    var updatedRecord;

                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                    } else {
                        updatedRecord = Array.isArray(response.data) ? response.data[0] : response.data;

                        if (!updatedRecord) {
                            deferred.reject({ message: 'Nenhum perfil foi atualizado para este usuário.' });
                            return;
                        }

                        logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'USER_REVIEW', 'ADMIN', {
                            reviewed_user_id: userId,
                            reviewed_user_name: updatedRecord.full_name || null,
                            status: targetStatus,
                            role_id: normalizedRoleId,
                            role: normalizedRole,
                            sector: normalizedSector,
                            cargo: payload.cargo,
                            comum: payload.comum
                        });
                        deferred.resolve(normalizeProfile(updatedRecord));
                    }
                });

            return deferred.promise;
        }

        function reviewPendingUserLegacyAware(userRef, reviewData) {
            var deferred = $q.defer();
            var normalizedRoleId;
            var normalizedRole;
            var normalizedSector;
            var targetStatus;
            var payload;
            var userId = null;
            var username = null;
            var fullName = null;
            var createdAt = null;
            var updateQuery;

            if (typeof userRef === 'object' && userRef !== null) {
                userId = userRef.user_id || null;
                username = userRef.username || null;
                fullName = userRef.full_name || null;
                createdAt = userRef.created_at || null;
            } else {
                userId = userRef || null;
            }

            if (!userId && !username && !(fullName && createdAt)) {
                deferred.reject({ message: 'Usuário não identificado.' });
                return deferred.promise;
            }

            reviewData = reviewData || {};
            normalizedRoleId = normalizeRoleId(reviewData.role_id, reviewData.role);
            normalizedRole = normalizeRoleLabel(normalizedRoleId, reviewData.role);
            normalizedSector = normalizeSector(reviewData.sector, normalizedRoleId, normalizedRole);
            targetStatus = reviewData.status || 'approved';

            payload = {
                role_id: normalizedRoleId,
                role: normalizedRole,
                sector: normalizedSector,
                cargo: reviewData.cargo || null,
                comum: reviewData.comum || null,
                status: targetStatus
            };

            updateQuery = supabase
                .from('profiles')
                .update(payload)
                .eq('status', 'pending');

            if (userId) {
                updateQuery = updateQuery.eq('user_id', userId);
            } else if (username) {
                updateQuery = updateQuery.eq('username', username);
            } else {
                updateQuery = updateQuery
                    .eq('full_name', fullName)
                    .eq('created_at', createdAt);
            }

            updateQuery
                .select('*')
                .then(function (response) {
                    var updatedRecord;

                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                    } else {
                        updatedRecord = Array.isArray(response.data) ? response.data[0] : response.data;

                        if (!updatedRecord) {
                            deferred.reject({ message: 'Nenhum perfil foi atualizado para este usuário.' });
                            return;
                        }

                        logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'USER_REVIEW', 'ADMIN', {
                            reviewed_user_id: userId,
                            reviewed_username: username,
                            reviewed_full_name: fullName,
                            status: targetStatus,
                            role_id: normalizedRoleId,
                            role: normalizedRole,
                            sector: normalizedSector,
                            cargo: payload.cargo,
                            comum: payload.comum
                        });
                        deferred.resolve(normalizeProfile(updatedRecord));
                    }
                });

            return deferred.promise;
        }

        function logout() {
            var deferred = $q.defer();
            var userId = $rootScope.currentUser ? $rootScope.currentUser.user_id : null;

            supabase.auth.signOut().then(function (response) {
                if (response.error) {
                    deferred.reject(response.error);
                } else {
                    if (userId) {
                        logAudit(userId, 'LOGOUT', 'AUTH', {});
                    }
                    $rootScope.currentUser = null;
                    $rootScope.currentUserResolved = true;
                    deferred.resolve(response);
                }
            });

            return deferred.promise;
        }

        function getSession() {
            var deferred = $q.defer();
            supabase.auth.getSession().then(function (response) {
                if (response.error) {
                    deferred.reject(response.error);
                } else {
                    deferred.resolve(response.data.session);
                }
            });
            return deferred.promise;
        }

        function getUserProfile(userId) {
            var deferred = $q.defer();
            supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single()
                .then(function (response) {
                    if (response.error) {
                        console.warn('Perfil não encontrado, usando dados temporários', response.error);
                        deferred.resolve(normalizeProfile({ 
                            user_id: userId, 
                            role_id: 6, 
                            sector: 'Inscrição', 
                            status: 'pending' 
                        }));
                    } else {
                        deferred.resolve(normalizeProfile(response.data));
                    }
                });
            return deferred.promise;
        }

        function refreshCurrentUserProfile(options) {
            var deferred = $q.defer();

            getSession().then(function (session) {
                if (!(session && session.user)) {
                    $rootScope.currentUser = null;
                    $rootScope.currentUserResolved = true;
                    deferred.resolve(null);
                    return;
                }

                getUserProfile(session.user.id).then(function (profile) {
                    if (!profile.email && session.user.email) {
                        profile.email = session.user.email;
                    }

                    deferred.resolve(syncCurrentUserProfile(profile, options || {}));
                }).catch(function (error) {
                    deferred.reject(error);
                });
            }).catch(function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        function updateUserProfile(userId, profileData) {
            var deferred = $q.defer();
            if (!userId) {
                deferred.reject({ message: 'Usuário não identificado.' });
                return deferred.promise;
            }

            var payload = angular.extend({}, profileData, { user_id: userId });

            supabase
                .from('profiles')
                .update(payload)
                .eq('user_id', userId)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                    } else {
                        deferred.resolve(syncCurrentUserProfile(response.data));
                    }
                });

            return deferred.promise;
        }

        function updateManagedUser(userId, profileData) {
            var deferred = $q.defer();
            var normalizedRoleId;
            var normalizedRole;
            var normalizedSector;
            var payload;

            if (!userId) {
                deferred.reject({ message: 'Usuário não identificado.' });
                return deferred.promise;
            }

            profileData = profileData || {};
            normalizedRoleId = normalizeRoleId(profileData.role_id, profileData.role);
            normalizedRole = normalizeRoleLabel(normalizedRoleId, profileData.role);
            normalizedSector = normalizeSector(profileData.sector, normalizedRoleId, normalizedRole);

            payload = {
                full_name: profileData.full_name || null,
                role_id: normalizedRoleId,
                role: normalizedRole,
                sector: normalizedSector,
                status: normalizeStatus(profileData.status),
                cargo: profileData.cargo || null,
                comum: profileData.comum || null
            };

            supabase
                .from('profiles')
                .update(payload)
                .eq('user_id', userId)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'USER_MANAGEMENT_UPDATE', 'ADMIN', {
                        managed_user_id: userId,
                        managed_user_name: payload.full_name,
                        role_id: normalizedRoleId,
                        role: normalizedRole,
                        sector: normalizedSector,
                        status: payload.status
                    });

                    deferred.resolve(normalizeProfile(response.data));
                });

            return deferred.promise;
        }

        function deleteManagedUser(userId) {
            var deferred = $q.defer();

            if (!userId) {
                deferred.reject({ message: 'Usuário não identificado.' });
                return deferred.promise;
            }

            supabase
                .from('profiles')
                .delete()
                .eq('user_id', userId)
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(normalizeProfileSaveError(response.error));
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'USER_MANAGEMENT_DELETE', 'ADMIN', {
                        deleted_user_id: userId
                    });

                    deferred.resolve(true);
                });

            return deferred.promise;
        }

        function createMinisterioRegional(recordData) {
            var deferred = $q.defer();
            var payload = buildMinisterioRegionalPayload(recordData);

            supabase
                .from('ministerio_regional')
                .insert(payload)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'MINISTERIO_REGIONAL_CREATE', 'ADMIN', {
                        ministerio_regional_id: response.data && response.data.id,
                        nome: payload.nome,
                        ministerio: payload.ministerio,
                        municipio: payload.municipio
                    });

                    ministerioRegionalCache = null;
                    deferred.resolve(normalizeMinisterioRegionalRecord(response.data));
                });

            return deferred.promise;
        }

        function updateMinisterioRegional(recordId, recordData) {
            var deferred = $q.defer();
            var payload;

            if (!recordId) {
                deferred.reject({ message: 'Registro do ministério não identificado.' });
                return deferred.promise;
            }

            payload = buildMinisterioRegionalPayload(recordData);

            supabase
                .from('ministerio_regional')
                .update(payload)
                .eq('id', recordId)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'MINISTERIO_REGIONAL_UPDATE', 'ADMIN', {
                        ministerio_regional_id: recordId,
                        nome: payload.nome,
                        ministerio: payload.ministerio,
                        municipio: payload.municipio
                    });

                    ministerioRegionalCache = null;
                    deferred.resolve(normalizeMinisterioRegionalRecord(response.data));
                });

            return deferred.promise;
        }

        function deleteMinisterioRegional(recordId) {
            var deferred = $q.defer();

            if (!recordId) {
                deferred.reject({ message: 'Registro do ministério não identificado.' });
                return deferred.promise;
            }

            supabase
                .from('ministerio_regional')
                .delete()
                .eq('id', recordId)
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'MINISTERIO_REGIONAL_DELETE', 'ADMIN', {
                        ministerio_regional_id: recordId
                    });

                    ministerioRegionalCache = null;
                    deferred.resolve(true);
                });

            return deferred.promise;
        }

        function updateMinisterioRegionalByComum(comumAtual, recordData) {
            var deferred = $q.defer();
            var payload = {};
            var comumNormalizado = String(comumAtual || '').trim();
            var normalized;

            if (!comumNormalizado) {
                deferred.reject({ message: 'Congregação não identificada.' });
                return deferred.promise;
            }

            normalized = normalizeMinisterioRegionalRecord(recordData || {});

            if (normalized.comum) {
                payload.comum = normalized.comum;
            }

            if (normalized.municipio) {
                payload.municipio = normalized.municipio;
            }

            if (normalized.administracao) {
                payload.administracao = normalized.administracao;
            }

            supabase
                .from('ministerio_regional')
                .update(payload)
                .eq('comum', comumNormalizado)
                .select('id')
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'MINISTERIO_REGIONAL_BULK_UPDATE_COMUM', 'ADMIN', {
                        comum_anterior: comumNormalizado,
                        comum_novo: payload.comum || comumNormalizado,
                        municipio: payload.municipio || null,
                        administracao: payload.administracao || null,
                        total_registros: (response.data || []).length
                    });

                    ministerioRegionalCache = null;
                    deferred.resolve(response.data || []);
                });

            return deferred.promise;
        }

        function deleteMinisterioRegionalByComum(comumAtual) {
            var deferred = $q.defer();
            var comumNormalizado = String(comumAtual || '').trim();

            if (!comumNormalizado) {
                deferred.reject({ message: 'Congregação não identificada.' });
                return deferred.promise;
            }

            supabase
                .from('ministerio_regional')
                .delete()
                .eq('comum', comumNormalizado)
                .select('id')
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    logAudit($rootScope.currentUser ? $rootScope.currentUser.user_id : null, 'MINISTERIO_REGIONAL_BULK_DELETE_COMUM', 'ADMIN', {
                        comum: comumNormalizado,
                        total_registros: (response.data || []).length
                    });

                    ministerioRegionalCache = null;
                    deferred.resolve(response.data || []);
                });

            return deferred.promise;
        }

        function getCurrentUserRole() {
            return $rootScope.currentUser ? normalizeRoleId($rootScope.currentUser.role_id, $rootScope.currentUser.role) : null;
        }

        function getCurrentUserSector() {
            return $rootScope.currentUser ? normalizeSector($rootScope.currentUser.sector, $rootScope.currentUser.role_id, $rootScope.currentUser.role) : null;
        }
    }
})();
