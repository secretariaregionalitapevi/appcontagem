/**
 * INSPINIA - Responsive Admin Theme
 *
 * Inspinia theme use AngularUI Router to manage routing and views
 * Each view are defined as state.
 * Initial there are written state for all view in theme.
 *
 */
function config($stateProvider, $urlRouterProvider, $ocLazyLoadProvider, IdleProvider, KeepaliveProvider) {

    // Configure Idle settings
    IdleProvider.idle(1200); // 20 minutos de inatividade (era muito baixo: 5s)
    IdleProvider.timeout(300); // 5 minutos de aviso antes do logout (era 120s)

    $urlRouterProvider.otherwise("/login");

    $ocLazyLoadProvider.config({
        // Set to true if you want to see what and when is dynamically loaded
        debug: false
    });

    $stateProvider

        .state('dashboards', {
            abstract: true,
            url: "/dashboards",
            templateUrl: "views/common/content.html",
        })
        .state('dashboards.dashboard_1', {
            url: "/dashboard_1",
            templateUrl: "views/dashboard_1.html",
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {

                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        },
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        }
                    ]);
                }
            }
        })
        .state('dashboards.dashboard_2', {
            url: "/dashboard_2",
            templateUrl: "views/dashboard_2.html",
            data: { pageTitle: 'Dashboard' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js']
                        },
                        {
                            serie: true,
                            files: ['js/plugins/jvectormap/jquery-jvectormap-2.0.2.min.js', 'js/plugins/jvectormap/jquery-jvectormap-2.0.2.css']
                        },
                        {
                            serie: true,
                            files: ['js/plugins/jvectormap/jquery-jvectormap-world-mill-en.js']
                        },
                        {
                            name: 'ui.checkbox',
                            files: ['js/bootstrap/angular-bootstrap-checkbox.js']
                        }
                    ]);
                }
            }
        })
        .state('dashboards.dashboard_3', {
            url: "/dashboard_3",
            templateUrl: "views/dashboard_3.html",
            data: { pageTitle: 'Dashboard 3' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            name: 'ui.checkbox',
                            files: ['js/bootstrap/angular-bootstrap-checkbox.js']
                        }
                    ]);
                }
            }
        })
        .state('dashboards_top', {
            abstract: true,
            url: "/dashboards_top",
            templateUrl: "views/common/content_top_navigation.html",
        })
        .state('dashboards_top.dashboard_4', {
            url: "/dashboard_4",
            templateUrl: "views/dashboard_4.html",
            data: { pageTitle: 'Dashboard 4' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        }
                    ]);
                }
            }
        })
        .state('dashboards.dashboard_4_1', {
            url: "/dashboard_4_1",
            templateUrl: "views/dashboard_4_1.html",
            data: { pageTitle: 'Dashboard 4' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        }
                    ]);
                }
            }
        })
        .state('dashboards.dashboard_5', {
            url: "/dashboard_5",
            templateUrl: "views/dashboard_5.html",
            data: { pageTitle: 'Dashboard 5' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        },
                        {
                            files: ['js/plugins/sparkline/jquery.sparkline.min.js']
                        }
                    ]);
                }
            }
        })
        .state('layouts', {
            url: "/layouts",
            templateUrl: "views/layouts.html",
            data: { pageTitle: 'Layouts' },
        })


        .state('musicalizacao', {
            abstract: true,
            url: "/musicalizacao",
            templateUrl: "views/common/content.html",
        })
        .state('musicalizacao.dashboard', {
            url: "/dashboard",
            templateUrl: "views/musicalizacao_dashboard.html?v=1.3.2",
            data: { pageTitle: 'Dashboard Musicalização' },
            controller: 'musicalizacaoCtrl'
        })
        .state('musicalizacao.criancas', {
            url: "/criancas",
            templateUrl: "views/musicalizacao_alunos.html?v=1.3.13",
            data: { pageTitle: 'Crianças' },
            controller: 'musicalizacaoAlunosCtrl'
        })
        .state('musicalizacao.polos', {
            url: "/polos",
            templateUrl: "views/musicalizacao_polos.html?v=1.3.9",
            data: { pageTitle: 'Polos' },
            controller: 'musicalizacaoPolosCtrl'
        })
        .state('musicalizacao.instrutores', {
            url: "/instrutores",
            templateUrl: "views/musicalizacao_instrutores.html?v=1.3.15",
            data: { pageTitle: 'Instrutores' },
            controller: 'musicalizacaoInstrutoresCtrl'
        })
        .state('musicalizacao.aulas', {
            url: "/aulas",
            templateUrl: "views/musicalizacao_aulas.html?v=1.3.6",
            data: { pageTitle: 'Aulas' },
            controller: 'musicalizacaoAulasCtrl'
        })
        .state('musicalizacao.nova_aula', {
            url: "/nova_aula/:id",
            templateUrl: "views/musicalizacao_nova_aula.html?v=1.3.5",
            data: { pageTitle: 'Novo Lançamento' },
            params: { id: { value: null, squash: true } },
            controller: 'musicalizacaoNovaAulaCtrl'
        })
        .state('musicalizacao.presenca', {
            url: "/presenca/:id",
            templateUrl: "views/musicalizacao_presenca.html?v=1.3.5",
            data: { pageTitle: 'Presença' },
            params: { id: { value: null, squash: true } },
            controller: 'musicalizacaoPresencaCtrl'
        })
        .state('mailbox', {
            abstract: true,
            url: "/mailbox",
            templateUrl: "views/common/content.html",
        })
        .state('mailbox.inbox', {
            url: "/inbox",
            templateUrl: "views/mailbox.html",
            data: { pageTitle: 'Mail Inbox' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/iCheck/custom.css', 'js/plugins/iCheck/icheck.min.js']
                        }
                    ]);
                }
            }
        })
        .state('mailbox.email_view', {
            url: "/email_view",
            templateUrl: "views/mail_detail.html",
            data: { pageTitle: 'Mail detail' }
        })
        .state('mailbox.email_compose', {
            url: "/email_compose",
            templateUrl: "views/mail_compose.html",
            data: { pageTitle: 'Mail compose' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/summernote/summernote.css', 'css/plugins/summernote/summernote-bs3.css', 'js/plugins/summernote/summernote.min.js']
                        },
                        {
                            name: 'summernote',
                            files: ['css/plugins/summernote/summernote.css', 'css/plugins/summernote/summernote-bs3.css', 'js/plugins/summernote/summernote.min.js', 'js/plugins/summernote/angular-summernote.min.js']
                        }
                    ]);
                }
            }
        })
        .state('mailbox.email_template', {
            url: "/email_template",
            templateUrl: "views/email_template.html",
            data: { pageTitle: 'Mail compose' }
        })

        .state('darpe', {
            abstract: true,
            url: "/darpe",
            templateUrl: "views/common/content.html",
        })
        .state('darpe.musicos', {
            url: '/musicos',
            templateUrl: 'views/darpe_musicos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Músicos' }
        })
        .state('darpe.clinicas', {
            url: "/clinicas",
            templateUrl: 'views/darpe_clinicas.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Clínicas' }
        })
        .state('darpe.ministerio', {
            url: "/ministerio",
            templateUrl: 'views/darpe_ministerio.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Ministério' }
        })
        .state('darpe.atendimentos', {
            url: "/atendimentos",
            templateUrl: 'views/darpe_atendimentos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Atendimentos' }
        })
        .state('darpe.membros', {
            url: "/membros",
            templateUrl: 'views/darpe_membros.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Membros' }
        })
        .state('darpe.batismos', {
            url: "/batismos",
            templateUrl: 'views/darpe_batismos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.A.R.P.E - Batismos' }
        })

        .state('depac', {
            abstract: true,
            url: "/depac",
            templateUrl: "views/common/content.html",
        })
        .state('depac.musicos', {
            url: "/musicos",
            templateUrl: 'views/depac_musicos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Músicos' }
        })
        .state('depac.clinicas', {
            url: "/clinicas",
            templateUrl: 'views/depac_clinicas.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Clínicas' }
        })
        .state('depac.ministerio', {
            url: "/ministerio",
            templateUrl: 'views/depac_ministerio.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Ministério' }
        })
        .state('depac.atendimentos', {
            url: "/atendimentos",
            templateUrl: 'views/depac_atendimentos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Atendimentos' }
        })
        .state('depac.membros', {
            url: "/membros",
            templateUrl: 'views/depac_membros.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Membros' }
        })
        .state('depac.batismos', {
            url: "/batismos",
            templateUrl: 'views/depac_batismos.html?v=2.0.0-FIX',
            data: { pageTitle: 'D.E.P.A.C - Batismos' }
        })

        .state('rjm', {
            abstract: true,
            url: "/rjm",
            templateUrl: "views/common/content.html",
        })
        .state('rjm.dashboard', {
            url: "/dashboard",
            templateUrl: "views/rjm_dashboard.html?v=1.2.0",
            data: { pageTitle: 'Dashboard RJM' },
            controller: 'rjmRecitativosCtrl'
        })
        .state('rjm.analytics', {
            url: "/analytics",
            templateUrl: "views/rjm_analytics.html?v=1.1.0",
            data: { pageTitle: 'Histórico de Atividades - RJM' },
            controller: 'rjmAnalyticsCtrl',
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js']
                        }
                    ]);
                }
            }
        })
        .state('rjm.administrativo', {
            url: "/administrativo",
            templateUrl: "views/rjm_administrativo.html?v=1.2.0",
            data: { pageTitle: 'Administrativo RJM' },
            controller: 'rjmAdministrativoCtrl'
        })
        .state('rjm.auxiliares', {
            url: "/auxiliares",
            templateUrl: "views/rjm_auxiliares.html?v=1.2.0",
            data: { pageTitle: 'Auxiliares RJM' },
            controller: 'rjmAuxiliaresCtrl'
        })
        .state('rjm.mocidade', {
            url: "/mocidade",
            templateUrl: "views/rjm_mocidade.html?v=1.2.0",
            data: { pageTitle: 'Comuns RJM' },
            controller: 'rjmComunsCtrl'
        })
        .state('rjm.recitativos', {
            url: "/recitativos",
            templateUrl: "views/rjm_recitativos.html?v=1.2.0",
            data: { pageTitle: 'Recitativos' },
            controller: 'rjmRecitativosCtrl'
        })

        .state('ebi', {
            abstract: true,
            url: "/ebi",
            templateUrl: "views/common/content.html",
        })
        .state('ebi.dashboard', {
            url: "/dashboard",
            templateUrl: "views/ebi_dashboard.html?v=1.3.10",
            data: { pageTitle: 'Dashboard EBI' },
            controller: 'ebiRecitativosCtrl'
        })
        .state('ebi.presenca', {
            url: "/presenca",
            templateUrl: "views/ebi_presenca.html?v=1.4.22",
            data: { pageTitle: 'Presença EBI' },
            controller: 'ebiRecitativosCtrl',
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js']
                        }
                    ]);
                }
            }
        })
        .state('ebi.alunos', {
            url: "/alunos",
            templateUrl: "views/ebi_alunos.html?v=1.3.15",
            data: { pageTitle: 'Crianças EBI' },
            controller: 'ebiAlunosCtrl'
        })
        .state('ebi.instrutores', {
            url: "/instrutores",
            templateUrl: "views/ebi_instrutores.html?v=1.3.18",
            data: { pageTitle: 'Instrutores EBI' },
            controller: 'ebiInstrutoresCtrl',
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            insertBefore: '#loadBefore',
                            name: 'localytics.directives',
                            files: ['css/plugins/chosen/bootstrap-chosen.css', 'js/plugins/chosen/chosen.jquery.js', 'js/plugins/chosen/chosen.js']
                        }
                    ]);
                }
            }
        })
        .state('visitas', {
            abstract: true,
            url: "/visitas",
            templateUrl: "views/common/content.html"
        })
        .state('music', {
            abstract: true,
            url: "/music",
            templateUrl: "views/common/content.html",
        })
        .state('music.static_table', {
            url: "/static_table",
            templateUrl: "views/table_basic.html",
            data: { pageTitle: 'Ensaios Regionais' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            files: ['css/plugins/iCheck/custom.css', 'js/plugins/iCheck/icheck.min.js']
                        }
                    ]);
                }
            }
        })
        .state('music.data_tables', {
            url: "/data_tables",
            templateUrl: "views/table_data_tables.html",
            data: { pageTitle: 'Exames / Testes' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            files: ['js/plugins/dataTables/datatables.min.js', 'css/plugins/dataTables/datatables.min.css']
                        },
                        {
                            serie: true,
                            name: 'datatables',
                            files: ['js/plugins/dataTables/angular-datatables.min.js']
                        },
                        {
                            serie: true,
                            name: 'datatables.buttons',
                            files: ['js/plugins/dataTables/angular-datatables.buttons.min.js']
                        }
                    ]);
                }
            }
        })
        .state('music.foo_table', {
            url: "/foo_table",
            templateUrl: "views/foo_table.html",
            data: { pageTitle: 'Músicos' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/footable/footable.all.min.js', 'css/plugins/footable/footable.core.css']
                        },
                        {
                            name: 'ui.footable',
                            files: ['js/plugins/footable/angular-footable.js']
                        }
                    ]);
                }
            }
        })
        .state('music.nggrid', {
            url: "/nggrid",
            templateUrl: "views/nggrid.html",
            data: { pageTitle: 'Organistas / Candidatos' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ngGrid',
                            files: ['js/plugins/nggrid/ng-grid-2.0.3.min.js']
                        },
                        {
                            insertBefore: '#loadBefore',
                            files: ['js/plugins/nggrid/ng-grid.css']
                        }
                    ]);
                }
            }
        })
        .state('visitas.dashboard', {
            url: "/dashboard",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })
        .state('visitas.lancamentos', {
            url: "/lancamentos",
            templateUrl: "views/visitas_lancamentos.html?v=2.0.0",
            data: { pageTitle: 'Lançamentos de Visitas' },
            controller: 'visitasLancamentosCtrl'
        })
        .state('visitas.irmandade', {
            url: "/irmandade",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })
        .state('visitas.mocidade', {
            url: "/mocidade",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })
        .state('visitas.musicos', {
            url: "/musicos",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })
        .state('visitas.familiar', {
            url: "/familiar",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })
        .state('visitas.evangelizacao', {
            url: "/evangelizacao",
            templateUrl: "views/visitas_dashboard.html?v=1.1.12",
            data: { pageTitle: 'Dashboard de Visitas' },
            controller: 'visitasDashboardCtrl'
        })

        .state('widgets', {
            url: "/widgets",
            templateUrl: "views/widgets.html",
            data: { pageTitle: 'Widhets' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        },
                        {
                            files: ['css/plugins/iCheck/custom.css', 'js/plugins/iCheck/icheck.min.js']
                        },
                        {
                            serie: true,
                            files: ['js/plugins/jvectormap/jquery-jvectormap-2.0.2.min.js', 'js/plugins/jvectormap/jquery-jvectormap-2.0.2.css']
                        },
                        {
                            serie: true,
                            files: ['js/plugins/jvectormap/jquery-jvectormap-world-mill-en.js']
                        },
                        {
                            name: 'ui.checkbox',
                            files: ['js/bootstrap/angular-bootstrap-checkbox.js']
                        }
                    ]);
                }
            }
        })
        .state('metrics', {
            url: "/metrics",
            templateUrl: "views/metrics.html",
            data: { pageTitle: 'Metrics' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/sparkline/jquery.sparkline.min.js']
                        }
                    ]);
                }
            }
        })
        .state('forms', {
            abstract: true,
            url: "/forms",
            templateUrl: "views/common/content.html",
        })
        .state('forms.basic_form', {
            url: "/basic_form",
            templateUrl: "views/form_basic.html",
            data: { pageTitle: 'Basic form' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/iCheck/custom.css', 'js/plugins/iCheck/icheck.min.js']
                        }
                    ]);
                }
            }
        })
        .state('forms.advanced_plugins', {
            url: "/advanced_plugins",
            templateUrl: "views/form_advanced.html",
            data: { pageTitle: 'Advanced form' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/moment/moment.min.js']
                        },
                        {
                            name: 'ui.knob',
                            files: ['js/plugins/jsKnob/jquery.knob.js', 'js/plugins/jsKnob/angular-knob.js']
                        },
                        {
                            files: ['css/plugins/ionRangeSlider/ion.rangeSlider.css', 'css/plugins/ionRangeSlider/ion.rangeSlider.skinFlat.css', 'js/plugins/ionRangeSlider/ion.rangeSlider.min.js']
                        },
                        {
                            insertBefore: '#loadBefore',
                            name: 'localytics.directives',
                            files: ['css/plugins/chosen/bootstrap-chosen.css', 'js/plugins/chosen/chosen.jquery.js', 'js/plugins/chosen/chosen.js']
                        },
                        {
                            name: 'nouislider',
                            files: ['css/plugins/nouslider/jquery.nouislider.css', 'js/plugins/nouslider/jquery.nouislider.min.js', 'js/plugins/nouslider/angular-nouislider.js']
                        },
                        {
                            name: 'datePicker',
                            files: ['css/plugins/datapicker/angular-datapicker.css', 'js/plugins/datapicker/angular-datepicker.js']
                        },
                        {
                            files: ['js/plugins/jasny/jasny-bootstrap.min.js']
                        },
                        {
                            files: ['css/plugins/clockpicker/clockpicker.css', 'js/plugins/clockpicker/clockpicker.js']
                        },
                        {
                            name: 'ui.switchery',
                            files: ['css/plugins/switchery/switchery.css', 'js/plugins/switchery/switchery.js', 'js/plugins/switchery/ng-switchery.js']
                        },
                        {
                            name: 'colorpicker.module',
                            files: ['css/plugins/colorpicker/colorpicker.css', 'js/plugins/colorpicker/bootstrap-colorpicker-module.js']
                        },
                        {
                            name: 'ngImgCrop',
                            files: ['js/plugins/ngImgCrop/ng-img-crop.js', 'css/plugins/ngImgCrop/ng-img-crop.css']
                        },
                        {
                            serie: true,
                            files: ['js/plugins/daterangepicker/daterangepicker.js', 'css/plugins/daterangepicker/daterangepicker-bs3.css']
                        },
                        {
                            name: 'daterangepicker',
                            files: ['js/plugins/daterangepicker/angular-daterangepicker.js']
                        },
                        {
                            files: ['css/plugins/awesome-bootstrap-checkbox/awesome-bootstrap-checkbox.css']
                        },
                        {
                            name: 'ui.select',
                            files: ['js/plugins/ui-select/select.min.js', 'css/plugins/ui-select/select.min.css']
                        },
                        {
                            files: ['css/plugins/touchspin/jquery.bootstrap-touchspin.min.css', 'js/plugins/touchspin/jquery.bootstrap-touchspin.min.js']
                        },
                        {
                            name: 'ngTagsInput',
                            files: ['js/plugins/ngTags//ng-tags-input.min.js', 'css/plugins/ngTags/ng-tags-input-custom.min.css']
                        },
                        {
                            files: ['js/plugins/dualListbox/jquery.bootstrap-duallistbox.js', 'css/plugins/dualListbox/bootstrap-duallistbox.min.css']
                        },
                        {
                            name: 'frapontillo.bootstrap-duallistbox',
                            files: ['js/plugins/dualListbox/angular-bootstrap-duallistbox.js']
                        }

                    ]);
                }
            }
        })
        .state('forms.wizard', {
            url: "/wizard",
            templateUrl: "views/form_wizard.html",
            controller: 'wizardCtrl',
            data: { pageTitle: 'Wizard form' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/steps/jquery.steps.css']
                        }
                    ]);
                }
            }
        })
        .state('forms.wizard.step_one', {
            url: '/step_one',
            templateUrl: 'views/wizard/step_one.html',
            data: { pageTitle: 'Wizard form' }
        })
        .state('forms.wizard.step_two', {
            url: '/step_two',
            templateUrl: 'views/wizard/step_two.html',
            data: { pageTitle: 'Wizard form' }
        })
        .state('forms.wizard.step_three', {
            url: '/step_three',
            templateUrl: 'views/wizard/step_three.html',
            data: { pageTitle: 'Wizard form' }
        })
        .state('forms.file_upload', {
            url: "/file_upload",
            templateUrl: "views/form_file_upload.html",
            data: { pageTitle: 'File upload' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/dropzone/basic.css', 'css/plugins/dropzone/dropzone.css', 'js/plugins/dropzone/dropzone.js']
                        },
                        {
                            files: ['js/plugins/jasny/jasny-bootstrap.min.js', 'css/plugins/jasny/jasny-bootstrap.min.css']
                        }
                    ]);
                }
            }
        })
        .state('forms.text_editor', {
            url: "/text_editor",
            templateUrl: "views/form_editors.html",
            data: { pageTitle: 'Text editor' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'summernote',
                            files: ['css/plugins/summernote/summernote.css', 'css/plugins/summernote/summernote-bs3.css', 'js/plugins/summernote/summernote.min.js', 'js/plugins/summernote/angular-summernote.min.js']
                        }
                    ]);
                }
            }
        })
        .state('forms.autocomplete', {
            url: "/autocomplete",
            templateUrl: "views/autocomplete.html",
            data: { pageTitle: 'Autocomplete' }

        })
        .state('forms.markdown', {
            url: "/markdown",
            templateUrl: "views/markdown.html",
            data: { pageTitle: 'Markdown' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            files: ['js/plugins/bootstrap-markdown/bootstrap-markdown.js', 'js/plugins/bootstrap-markdown/markdown.js', 'css/plugins/bootstrap-markdown/bootstrap-markdown.min.css']
                        }
                    ]);
                }
            }
        })
        .state('app', {
            abstract: true,
            url: "/app",
            templateUrl: "views/common/content.html",
        })
        .state('app.contacts', {
            url: "/contacts",
            templateUrl: "views/contacts.html",
            data: { pageTitle: 'Contacts' }
        })
        .state('app.contacts_2', {
            url: "/contacts_2",
            templateUrl: "views/contacts_2.html",
            data: { pageTitle: 'Contacts 2' }
        })
        .state('app.profile', {
            url: "/profile",
            templateUrl: "views/user_profile.html?v=1.0.0",
            data: { pageTitle: 'Meu Perfil' }
        })
        .state('app.profile_2', {
            url: "/profile_2",
            templateUrl: "views/profile_2.html",
            data: { pageTitle: 'Profile_2' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/sparkline/jquery.sparkline.min.js']
                        }
                    ]);
                }
            }
        })
        .state('app.projects', {
            url: "/projects",
            templateUrl: "views/projects.html",
            data: { pageTitle: 'Projects' }
        })
        .state('app.project_detail', {
            url: "/project_detail",
            templateUrl: "views/project_detail.html",
            data: { pageTitle: 'Project detail' }
        })
        .state('app.activity_stream', {
            url: "/activity_stream",
            templateUrl: "views/activity_stream.html",
            data: { pageTitle: 'Activity stream' }
        })
        .state('app.file_manager', {
            url: "/file_manager",
            templateUrl: "views/file_manager.html",
            data: { pageTitle: 'File manager' }
        })
        .state('app.calendar', {
            url: "/calendar",
            templateUrl: "views/calendar.html",
            data: { pageTitle: 'Calendar' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            insertBefore: '#loadBefore',
                            files: ['css/plugins/fullcalendar/fullcalendar.css', 'js/plugins/fullcalendar/fullcalendar.min.js', 'js/plugins/fullcalendar/gcal.js']
                        },
                        {
                            name: 'ui.calendar',
                            files: ['js/plugins/fullcalendar/calendar.js']
                        }
                    ]);
                }
            }
        })
        .state('app.faq', {
            url: "/faq",
            templateUrl: "views/faq.html",
            data: { pageTitle: 'FAQ' }
        })
        .state('app.timeline', {
            url: "/timeline",
            templateUrl: "views/timeline.html",
            data: { pageTitle: 'Timeline' }
        })
        .state('app.pin_board', {
            url: "/pin_board",
            templateUrl: "views/pin_board.html",
            data: { pageTitle: 'Pin board' }
        })
        .state('app.invoice', {
            url: "/invoice",
            templateUrl: "views/invoice.html",
            data: { pageTitle: 'Invoice' }
        })
        .state('app.blog', {
            url: "/blog",
            templateUrl: "views/blog.html",
            data: { pageTitle: 'Blog' }
        })
        .state('app.article', {
            url: "/article",
            templateUrl: "views/article.html",
            data: { pageTitle: 'Article' }
        })
        .state('app.issue_tracker', {
            url: "/issue_tracker",
            templateUrl: "views/issue_tracker.html",
            data: { pageTitle: 'Issue Tracker' }
        })
        .state('app.clients', {
            url: "/clients",
            templateUrl: "views/clients.html",
            data: { pageTitle: 'Clients' }
        })
        .state('app.teams_board', {
            url: "/teams_board",
            templateUrl: "views/teams_board.html",
            data: { pageTitle: 'Teams board' }
        })
        .state('app.social_feed', {
            url: "/social_feed",
            templateUrl: "views/social_feed.html",
            data: { pageTitle: 'Social feed' }
        })
        .state('app.vote_list', {
            url: "/vote_list",
            templateUrl: "views/vote_list.html",
            data: { pageTitle: 'Vote list' }
        })
        .state('pages', {
            abstract: true,
            url: "/pages",
            templateUrl: "views/common/content.html"
        })
        .state('pages.search_results', {
            url: "/search_results",
            templateUrl: "views/search_results.html",
            data: { pageTitle: 'Search results' }
        })
        .state('pages.empy_page', {
            url: "/empy_page",
            templateUrl: "views/empty_page.html",
            data: { pageTitle: 'Empty page' }
        })
        .state('login', {
            url: "/login",
            templateUrl: "views/login.html",
            data: { pageTitle: 'Login', specialClass: 'gray-bg' }
        })
        .state('login_two_columns', {
            url: "/login_two_columns",
            templateUrl: "views/login_two_columns.html",
            data: { pageTitle: 'Login two columns', specialClass: 'gray-bg' }
        })
        .state('register', {
            url: "/register",
            templateUrl: "views/register.html",
            data: { pageTitle: 'Cadastro', specialClass: 'gray-bg' }
        })
        .state('lockscreen', {
            url: "/lockscreen",
            templateUrl: "views/lockscreen.html",
            data: { pageTitle: 'Lockscreen', specialClass: 'gray-bg' }
        })
        .state('forgot_password', {
            url: "/forgot_password",
            templateUrl: "views/forgot_password.html",
            data: { pageTitle: 'Forgot password', specialClass: 'gray-bg' }
        })
        .state('errorOne', {
            url: "/errorOne",
            templateUrl: "views/errorOne.html",
            data: { pageTitle: '404', specialClass: 'gray-bg' }
        })
        .state('errorTwo', {
            url: "/errorTwo",
            templateUrl: "views/errorTwo.html",
            data: { pageTitle: '500', specialClass: 'gray-bg' }
        })
        .state('ui', {
            abstract: true,
            url: "/ui",
            templateUrl: "views/common/content.html",
        })
        .state('ui.typography', {
            url: "/typography",
            templateUrl: "views/typography.html",
            data: { pageTitle: 'Typography' }
        })
        .state('ui.icons', {
            url: "/icons",
            templateUrl: "views/icons.html",
            data: { pageTitle: 'Icons' }
        })
        .state('ui.buttons', {
            url: "/buttons",
            templateUrl: "views/buttons.html",
            data: { pageTitle: 'Buttons' }
        })
        .state('ui.tabs_panels', {
            url: "/tabs_panels",
            templateUrl: "views/tabs_panels.html",
            data: { pageTitle: 'Panels' }
        })
        .state('ui.tabs', {
            url: "/tabs",
            templateUrl: "views/tabs.html",
            data: { pageTitle: 'Tabs' }
        })
        .state('ui.notifications_tooltips', {
            url: "/notifications_tooltips",
            templateUrl: "views/notifications.html",
            data: { pageTitle: 'Notifications and tooltips' }
        })
        .state('ui.helper_classes', {
            url: "/helper_classes",
            templateUrl: "views/helper_classes.html",
            data: { pageTitle: 'Helper css classes' }
        })
        .state('ui.badges_labels', {
            url: "/badges_labels",
            templateUrl: "views/badges_labels.html",
            data: { pageTitle: 'Badges and labels and progress' }
        })
        .state('ui.video', {
            url: "/video",
            templateUrl: "views/video.html",
            data: { pageTitle: 'Responsible Video' }
        })
        .state('ui.draggable', {
            url: "/draggable",
            templateUrl: "views/draggable.html",
            data: { pageTitle: 'Draggable panels' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ui.sortable',
                            files: ['js/plugins/ui-sortable/sortable.js']
                        }
                    ]);
                }
            }
        })
        .state('grid_optionss', {
            url: "/grid_options",
            templateUrl: "views/grid_options.html",
            data: { pageTitle: 'Grid options' }
        })
        .state('miscellaneous', {
            abstract: true,
            url: "/miscellaneous",
            templateUrl: "views/common/content.html",
        })
        .state('miscellaneous.google_maps', {
            url: "/google_maps",
            templateUrl: "views/google_maps.html",
            data: { pageTitle: 'Google maps' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ui.event',
                            files: ['js/plugins/uievents/event.js']
                        },
                        {
                            name: 'ui.map',
                            files: ['js/plugins/uimaps/ui-map.js']
                        },
                    ]);
                }
            }
        })
        .state('miscellaneous.datamaps', {
            url: "/datamaps",
            templateUrl: "views/datamaps.html",
            data: { pageTitle: 'Datamaps' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/d3/d3.min.js', 'js/plugins/topojson/topojson.js', 'js/plugins/datamaps/datamaps.all.min.js']
                        },
                        {
                            name: 'datamaps',
                            files: ['js/plugins/angular-datamaps/angular-datamaps.min.js']
                        },
                    ]);
                }
            }
        })
        .state('miscellaneous.socialbuttons', {
            url: "/socialbuttons",
            templateUrl: "views/socialbuttons.html",
            data: { pageTitle: 'Social buttons' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/bootstrapSocial/bootstrap-social.css']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.code_editor', {
            url: "/code_editor",
            templateUrl: "views/code_editor.html",
            data: { pageTitle: 'Code Editor' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            files: ['css/plugins/codemirror/codemirror.css', 'css/plugins/codemirror/ambiance.css', 'js/plugins/codemirror/codemirror.js', 'js/plugins/codemirror/mode/javascript/javascript.js']
                        },
                        {
                            name: 'ui.codemirror',
                            files: ['js/plugins/ui-codemirror/ui-codemirror.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.modal_window', {
            url: "/modal_window",
            templateUrl: "views/modal_window.html",
            data: { pageTitle: 'Modal window' }
        })
        .state('miscellaneous.chat_view', {
            url: "/chat_view",
            templateUrl: "views/chat_view.html",
            data: { pageTitle: 'Chat view' }
        })
        .state('miscellaneous.nestable_list', {
            url: "/nestable_list",
            templateUrl: "views/nestable_list.html",
            data: { pageTitle: 'Nestable List' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ui.tree',
                            files: ['css/plugins/uiTree/angular-ui-tree.min.css', 'js/plugins/uiTree/angular-ui-tree.min.js']
                        },
                    ]);
                }
            }
        })
        .state('miscellaneous.notify', {
            url: "/notify",
            templateUrl: "views/notify.html",
            data: { pageTitle: 'Notifications for angularJS' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'cgNotify',
                            files: ['css/plugins/angular-notify/angular-notify.min.css', 'js/plugins/angular-notify/angular-notify.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.timeline_2', {
            url: "/timeline_2",
            templateUrl: "views/timeline_2.html",
            data: { pageTitle: 'Timeline version 2' }
        })
        .state('miscellaneous.forum_view', {
            url: "/forum_view",
            templateUrl: "views/forum_view.html",
            data: { pageTitle: 'Forum - general view' }
        })
        .state('miscellaneous.forum_post_view', {
            url: "/forum_post_view",
            templateUrl: "views/forum_post_view.html",
            data: { pageTitle: 'Forum - post view' }
        })
        .state('miscellaneous.diff', {
            url: "/diff",
            templateUrl: "views/diff.html",
            data: { pageTitle: 'Text Diff' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/diff_match_patch/javascript/diff_match_patch.js']
                        },
                        {
                            name: 'diff-match-patch',
                            files: ['js/plugins/angular-diff-match-patch/angular-diff-match-patch.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.pdf_viewer', {
            url: "/pdf_viewer",
            templateUrl: "views/pdf_viewer.html",
            data: { pageTitle: 'PDF viewer' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/pdfjs/pdf.js']
                        },
                        {
                            name: 'pdf',
                            files: ['js/plugins/pdfjs/angular-pdf.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.sweet_alert', {
            url: "/sweet_alert",
            templateUrl: "views/sweet_alert.html",
            data: { pageTitle: 'Sweet alert' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/sweetalert/sweetalert.min.js', 'css/plugins/sweetalert/sweetalert.css']
                        },
                        {
                            name: 'oitozero.ngSweetAlert',
                            files: ['js/plugins/sweetalert/angular-sweetalert.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.idle_timer', {
            url: "/idle_timer",
            templateUrl: "views/idle_timer.html",
            data: { pageTitle: 'Idle timer' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'cgNotify',
                            files: ['css/plugins/angular-notify/angular-notify.min.css', 'js/plugins/angular-notify/angular-notify.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.live_favicon', {
            url: "/live_favicon",
            templateUrl: "views/live_favicon.html",
            data: { pageTitle: 'Live favicon' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/tinycon/tinycon.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.spinners', {
            url: "/spinners",
            templateUrl: "views/spinners.html",
            data: { pageTitle: 'Spinners' }
        })
        .state('miscellaneous.spinners_usage', {
            url: "/spinners_usage",
            templateUrl: "views/spinners_usage.html",
            data: { pageTitle: 'Spinners usage' }
        })
        .state('miscellaneous.validation', {
            url: "/validation",
            templateUrl: "views/validation.html",
            data: { pageTitle: 'Validation' }
        })
        .state('miscellaneous.agile_board', {
            url: "/agile_board",
            templateUrl: "views/agile_board.html",
            data: { pageTitle: 'Agile board' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ui.sortable',
                            files: ['js/plugins/ui-sortable/sortable.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.masonry', {
            url: "/masonry",
            templateUrl: "views/masonry.html",
            data: { pageTitle: 'Masonry' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/masonry/masonry.pkgd.min.js']
                        },
                        {
                            name: 'wu.masonry',
                            files: ['js/plugins/masonry/angular-masonry.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.toastr', {
            url: "/toastr",
            templateUrl: "views/toastr.html",
            data: { pageTitle: 'Toastr' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            insertBefore: '#loadBefore',
                            name: 'toaster',
                            files: ['js/plugins/toastr/toastr.min.js', 'css/plugins/toastr/toastr.min.css']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.i18support', {
            url: "/i18support",
            templateUrl: "views/i18support.html",
            data: { pageTitle: 'i18support' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            insertBefore: '#loadBefore',
                            name: 'toaster',
                            files: ['js/plugins/toastr/toastr.min.js', 'css/plugins/toastr/toastr.min.css']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.truncate', {
            url: "/truncate",
            templateUrl: "views/truncate.html",
            data: { pageTitle: 'Truncate' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/dotdotdot/jquery.dotdotdot.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.password_meter', {
            url: "/password_meter",
            templateUrl: "views/password_meter.html",
            data: { pageTitle: 'Password meter' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/pwstrength/pwstrength-bootstrap.min.js', 'js/plugins/pwstrength/zxcvbn.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.clipboard', {
            url: "/clipboard",
            templateUrl: "views/clipboard.html",
            data: { pageTitle: 'Clipboard' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/ngclipboard/clipboard.min.js']
                        },
                        {
                            name: 'ngclipboard',
                            files: ['js/plugins/ngclipboard/ngclipboard.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.text_spinners', {
            url: "/text_spinners",
            templateUrl: "views/text_spinners.html",
            data: { pageTitle: 'Text spinners' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/textSpinners/spinners.css']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.loading_buttons', {
            url: "/loading_buttons",
            templateUrl: "views/loading_buttons.html",
            data: { pageTitle: 'Loading buttons' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            name: 'angular-ladda',
                            files: ['js/plugins/ladda/spin.min.js', 'js/plugins/ladda/ladda.min.js', 'css/plugins/ladda/ladda-themeless.min.css', 'js/plugins/ladda/angular-ladda.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.tour', {
            url: "/tour",
            templateUrl: "views/tour.html",
            data: { pageTitle: 'Tour' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            insertBefore: '#loadBefore',
                            files: ['js/plugins/bootstrap-tour/bootstrap-tour.min.js', 'css/plugins/bootstrap-tour/bootstrap-tour.min.css']
                        },
                        {
                            name: 'bm.bsTour',
                            files: ['js/plugins/angular-bootstrap-tour/angular-bootstrap-tour.min.js']
                        }
                    ]);
                }
            }
        })
        .state('miscellaneous.tree_view', {
            url: "/tree_view",
            templateUrl: "views/tree_view.html",
            data: { pageTitle: 'Tree view' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/jsTree/style.min.css', 'js/plugins/jsTree/jstree.min.js']
                        },
                        {
                            name: 'ngJsTree',
                            files: ['js/plugins/jsTree/ngJsTree.min.js']
                        }
                    ]);
                }
            }
        })
        .state('tables', {
            abstract: true,
            url: "/tables",
            templateUrl: "views/common/content.html"
        })
        .state('tables.static_table', {
            url: "/static_table",
            templateUrl: "views/table_basic.html",
            data: { pageTitle: 'Static table' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            files: ['css/plugins/iCheck/custom.css', 'js/plugins/iCheck/icheck.min.js']
                        }
                    ]);
                }
            }
        })
        .state('tables.data_tables', {
            url: "/data_tables",
            templateUrl: "views/table_data_tables.html",
            data: { pageTitle: 'Data Tables' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            serie: true,
                            files: ['js/plugins/dataTables/datatables.min.js', 'css/plugins/dataTables/datatables.min.css']
                        },
                        {
                            serie: true,
                            name: 'datatables',
                            files: ['js/plugins/dataTables/angular-datatables.min.js']
                        },
                        {
                            serie: true,
                            name: 'datatables.buttons',
                            files: ['js/plugins/dataTables/angular-datatables.buttons.min.js']
                        }
                    ]);
                }
            }
        })
        .state('tables.foo_table', {
            url: "/foo_table",
            templateUrl: "views/foo_table.html",
            data: { pageTitle: 'Foo Table' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/footable/footable.all.min.js', 'css/plugins/footable/footable.core.css']
                        },
                        {
                            name: 'ui.footable',
                            files: ['js/plugins/footable/angular-footable.js']
                        }
                    ]);
                }
            }
        })
        .state('tables.nggrid', {
            url: "/nggrid",
            templateUrl: "views/nggrid.html",
            data: { pageTitle: 'ng Grid' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'ngGrid',
                            files: ['js/plugins/nggrid/ng-grid-2.0.3.min.js']
                        },
                        {
                            insertBefore: '#loadBefore',
                            files: ['js/plugins/nggrid/ng-grid.css']
                        }
                    ]);
                }
            }
        })
        .state('commerce', {
            abstract: true,
            url: "/commerce",
            templateUrl: "views/common/content.html",
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/footable/footable.all.min.js', 'css/plugins/footable/footable.core.css']
                        },
                        {
                            name: 'ui.footable',
                            files: ['js/plugins/footable/angular-footable.js']
                        }
                    ]);
                }
            }
        })
        .state('commerce.products_grid', {
            url: "/products_grid",
            templateUrl: "views/ecommerce_products_grid.html",
            data: { pageTitle: 'E-commerce grid' }
        })
        .state('commerce.product_list', {
            url: "/product_list",
            templateUrl: "views/ecommerce_product_list.html",
            data: { pageTitle: 'E-commerce product list' }
        })
        .state('commerce.orders', {
            url: "/orders",
            templateUrl: "views/ecommerce_orders.html",
            data: { pageTitle: 'E-commerce orders' }
        })
        .state('commerce.product', {
            url: "/product",
            templateUrl: "views/ecommerce_product.html",
            data: { pageTitle: 'Product edit' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/summernote/summernote.css', 'css/plugins/summernote/summernote-bs3.css', 'js/plugins/summernote/summernote.min.js']
                        },
                        {
                            name: 'summernote',
                            files: ['css/plugins/summernote/summernote.css', 'css/plugins/summernote/summernote-bs3.css', 'js/plugins/summernote/summernote.min.js', 'js/plugins/summernote/angular-summernote.min.js']
                        }
                    ]);
                }
            }

        })
        .state('commerce.product_details', {
            url: "/product_details",
            templateUrl: "views/ecommerce_product_details.html",
            data: { pageTitle: 'E-commerce Product detail' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/slick/slick.css', 'css/plugins/slick/slick-theme.css', 'js/plugins/slick/slick.min.js']
                        },
                        {
                            name: 'slick',
                            files: ['js/plugins/slick/angular-slick.min.js']
                        }
                    ]);
                }
            }
        })
        .state('commerce.payments', {
            url: "/payments",
            templateUrl: "views/ecommerce_payments.html",
            data: { pageTitle: 'E-commerce payments' }
        })
        .state('commerce.cart', {
            url: "/cart",
            templateUrl: "views/ecommerce_cart.html",
            data: { pageTitle: 'Shopping cart' }
        })
        .state('gallery', {
            abstract: true,
            url: "/gallery",
            templateUrl: "views/common/content.html"
        })
        .state('gallery.basic_gallery', {
            url: "/basic_gallery",
            templateUrl: "views/basic_gallery.html",
            data: { pageTitle: 'Lightbox Gallery' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/blueimp/jquery.blueimp-gallery.min.js', 'css/plugins/blueimp/css/blueimp-gallery.min.css']
                        }
                    ]);
                }
            }
        })
        .state('gallery.bootstrap_carousel', {
            url: "/bootstrap_carousel",
            templateUrl: "views/carousel.html",
            data: { pageTitle: 'Bootstrap carousel' }
        })
        .state('gallery.slick_gallery', {
            url: "/slick_gallery",
            templateUrl: "views/slick.html",
            data: { pageTitle: 'Slick carousel' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['css/plugins/slick/slick.css', 'css/plugins/slick/slick-theme.css', 'js/plugins/slick/slick.min.js']
                        },
                        {
                            name: 'slick',
                            files: ['js/plugins/slick/angular-slick.min.js']
                        }
                    ]);
                }
            }
        })
        .state('css_animations', {
            url: "/css_animations",
            templateUrl: "views/css_animation.html",
            data: { pageTitle: 'CSS Animations' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            reconfig: true,
                            serie: true,
                            files: ['js/plugins/rickshaw/vendor/d3.v3.js', 'js/plugins/rickshaw/rickshaw.min.js']
                        },
                        {
                            reconfig: true,
                            name: 'angular-rickshaw',
                            files: ['js/plugins/rickshaw/angular-rickshaw.js']
                        }
                    ]);
                }
            }

        })
        .state('landing', {
            url: "/landing",
            templateUrl: "views/login.html",
            data: { pageTitle: 'Landing page', specialClass: 'landing-page' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            files: ['js/plugins/wow/wow.min.js']
                        }
                    ]);
                }
            }
        })

        .state('admin', {
            abstract: true,
            url: "/admin",
            templateUrl: "views/common/content.html"
        })
        .state('admin.user_approvals', {
            url: "/user_approvals",
            templateUrl: "views/admin_pending_users.html",
            controller: 'pendingUsersAdminCtrl',
            data: { pageTitle: 'Liberação de Usuários' }
        })
        .state('admin.usuarios', {
            url: "/usuarios",
            templateUrl: "views/admin_users_management.html?v=1.0.5",
            controller: 'userManagementAdminCtrl',
            data: { pageTitle: 'Usu\u00e1rios' }
        })
        .state('admin.ministerio', {
            url: "/ministerio",
            templateUrl: "views/admin_ministerio_regional.html?v=1.0.2",
            controller: 'ministerioRegionalAdminCtrl',
            data: { pageTitle: 'Minist\u00e9rio' }
        })
        .state('admin.user_management', {
            url: "/user_management",
            templateUrl: "views/admin_users_management.html?v=1.0.2",
            controller: 'userManagementAdminCtrl',
            data: { pageTitle: 'Usuários' }
        })
        .state('admin.user_menagement', {
            url: "/user_menagement",
            templateUrl: "views/admin_users_management.html?v=1.0.2",
            controller: 'userManagementAdminCtrl',
            data: { pageTitle: 'Gerenciamento de Usuários' }
        })
        .state('admin.congregacoes', {
            url: "/congregacoes",
            templateUrl: "views/admin_congregacoes.html?v=1.0.1",
            controller: 'congregacoesAdminCtrl',
            data: { pageTitle: 'Congregações' }
        })
        .state('admin.search_results', {
            url: "/search_results",
            templateUrl: "views/admin_congregacoes.html?v=1.0.1",
            controller: 'congregacoesAdminCtrl',
            data: { pageTitle: 'Congregações' }
        })
        .state('admin.santa_ceia', {
            url: "/santa_ceia",
            templateUrl: "views/admin_santa_ceia.html?v=1.0.7",
            controller: 'santaCeiaAdminCtrl',
            data: { pageTitle: 'Santa Ceia' },
            resolve: {
                loadPlugin: function ($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        {
                            name: 'angles',
                            files: ['js/plugins/chartJs/angles.js', 'js/plugins/chartJs/Chart.min.js']
                        },
                        {
                            name: 'angular-peity',
                            files: ['js/plugins/peity/jquery.peity.min.js', 'js/plugins/peity/angular-peity.js']
                        },
                        {
                            serie: true,
                            name: 'angular-flot',
                            files: ['js/plugins/flot/jquery.flot.js', 'js/plugins/flot/jquery.flot.time.js', 'js/plugins/flot/jquery.flot.tooltip.min.js', 'js/plugins/flot/jquery.flot.spline.js', 'js/plugins/flot/jquery.flot.resize.js', 'js/plugins/flot/jquery.flot.pie.js', 'js/plugins/flot/curvedLines.js', 'js/plugins/flot/angular-flot.js',]
                        }
                    ]);
                }
            }
        })



        .state('outlook', {
            url: "/outlook",
            templateUrl: "views/outlook.html",
            data: { pageTitle: 'Outlook view', specialClass: 'fixed-sidebar' }
        })
        .state('off_canvas', {
            url: "/off_canvas",
            templateUrl: "views/off_canvas.html",
            data: { pageTitle: 'Off canvas menu', specialClass: 'canvas-menu' }
        });


}
angular
    .module('inspinia')
    .config(config)
    .run(function ($rootScope, $state, AuthService, $window, $document) {
        $rootScope.$state = $state;
        $rootScope.currentUserResolved = false;

        // Restaura a sessÃ£o do Supabase ao carregar a pÃ¡gina
        function normalizeAccessKey(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function resolveRouteAccessRoleId(user) {
            var sourceUser = user || $rootScope.currentUser || {};
            var parsedRoleId = parseInt(sourceUser.role_id || sourceUser.access_level_id, 10);
            var normalizedRole = normalizeAccessKey(
                sourceUser.role_name ||
                sourceUser.role ||
                sourceUser.access_level_name ||
                sourceUser.cargo
            );
            var roleByName = {
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

            if (!isNaN(parsedRoleId)) {
                return parsedRoleId;
            }

            if (normalizedRole.indexOf('master') !== -1) return 1;
            if (normalizedRole.indexOf('admin') !== -1) return 2;
            if (normalizedRole.indexOf('coordenador') !== -1 || normalizedRole.indexOf('coordinator') !== -1) return 3;

            return roleByName[normalizedRole] || null;
        }

        function hasGlobalSectorAccess() {
            var currentUser = $rootScope.currentUser || {};
            var currentSector = normalizeAccessKey(currentUser.sector || AuthService.getCurrentUserSector());
            return currentSector === 'global';
        }

        function hasFullSystemAccess() {
            var roleId = resolveRouteAccessRoleId($rootScope.currentUser);
            return roleId === 1 || roleId === 2 || hasGlobalSectorAccess();
        }

        function resolveAuthorizedHomeState() {
            var sector = normalizeAccessKey(AuthService.getCurrentUserSector());

            if (hasFullSystemAccess()) {
                return 'dashboards.dashboard_2';
            }

            switch (sector) {
                case 'administrativo':
                    return 'admin.congregacoes';
                case 'musicalizacao':
                    return 'musicalizacao.dashboard';
                case 'ebi':
                    return 'ebi.dashboard';
                case 'visitas':
                    return 'visitas.dashboard';
                case 'darpe':
                    return 'darpe.musicos';
                case 'gem':
                    return 'forms.basic_form';
                case 'musica':
                    return 'music.static_table';
                case 'rjm':
                    return 'rjm.dashboard';
                default:
                    return 'app.profile';
            }
        }

        function resolveProtectedSectorByState(stateName) {
            if (!stateName) {
                return null;
            }

            if (stateName.indexOf('admin.') === 0) {
                return 'administrativo';
            }

            if (stateName.indexOf('musicalizacao.') === 0) {
                return 'musicalizacao';
            }

            if (stateName.indexOf('ebi.') === 0) {
                return 'ebi';
            }

            if (stateName.indexOf('visitas.') === 0) {
                return 'visitas';
            }

            if (stateName.indexOf('darpe.') === 0) {
                return 'darpe';
            }

            if (stateName.indexOf('forms.') === 0) {
                return 'gem';
            }

            if (stateName.indexOf('music.') === 0) {
                return 'musica';
            }

            if (stateName.indexOf('rjm.') === 0) {
                return 'rjm';
            }

            if (/^dashboards\.dashboard_(2|3|4|4_1|5)$/.test(stateName) || stateName.indexOf('tables.') === 0) {
                return 'global';
            }

            return null;
        }

        function canAccessState(stateName) {
            var requiredSector = resolveProtectedSectorByState(stateName);
            var currentSector = normalizeAccessKey(($rootScope.currentUser && $rootScope.currentUser.sector) || AuthService.getCurrentUserSector());

            if (!requiredSector) {
                return true;
            }

            if (hasFullSystemAccess()) {
                return true;
            }

            if (requiredSector === 'global') {
                return false;
            }

            return currentSector === requiredSector;
        }

        function enforceStateAccess(stateName, event) {
            var fallbackState;

            if (!$rootScope.currentUserResolved || !$rootScope.currentUser) {
                return false;
            }

            if (canAccessState(stateName)) {
                return false;
            }

            fallbackState = resolveAuthorizedHomeState();

            if (event) {
                event.preventDefault();
            }

            if (fallbackState && stateName !== fallbackState && $state.current.name !== fallbackState) {
                $state.go(fallbackState);
            }
            return true;
        }

        AuthService.refreshCurrentUserProfile({
            redirectOnAccessChange: false
        }).then(function () {
            enforceStateAccess($state.current && $state.current.name);
        }).catch(function () {
            $rootScope.currentUserResolved = true;
        });

        function refreshAccessProfileOnResume() {
            AuthService.refreshCurrentUserProfile({
                redirectOnAccessChange: true
            }).then(function () {
                enforceStateAccess($state.current && $state.current.name);
            }).catch(angular.noop);
        }

        $window.addEventListener('focus', refreshAccessProfileOnResume);
        $document[0].addEventListener('visibilitychange', function () {
            if ($document[0].visibilityState === 'visible') {
                refreshAccessProfileOnResume();
            }
        });

        // Protege as rotas - verificaÃ§Ã£o SOMENTE sÃ­ncrona (localStorage)
        // para evitar loop de navegaÃ§Ã£o causado por chamadas async dentro de $stateChangeStart
        $rootScope.$on('$stateChangeStart', function (event, toState) {
            if (typeof $window.cleanupBootstrapModalState === 'function') {
                $window.cleanupBootstrapModalState();
            }

            var isPublicState = toState.name === 'login' ||
                                toState.name === 'register' ||
                                toState.name === 'forgot_password' ||
                                toState.name === 'landing';

            if (isPublicState) return; // Sempre permite pÃ¡ginas pÃºblicas

            var sessionKey = 'sb-sqamxlhfazulrisiptud-auth-token';
            var hasCurrentUser = !!$rootScope.currentUser;
            var hasLocalSession = !!localStorage.getItem(sessionKey);
            var hasSessionStorageSession = !!sessionStorage.getItem(sessionKey);

            if (!hasCurrentUser && !hasLocalSession && !hasSessionStorageSession) {
                event.preventDefault();
                $state.go('login');
                return;
            }

            if (hasCurrentUser && enforceStateAccess(toState.name, event)) {
                return;
            }
        });

        $rootScope.$on('$stateChangeSuccess', function (event, toState) {
            if (typeof $window.cleanupBootstrapModalState === 'function') {
                $window.cleanupBootstrapModalState();
            }

            var isPublicState = toState.name === 'login' ||
                                toState.name === 'register' ||
                                toState.name === 'forgot_password' ||
                                toState.name === 'landing';

            if (isPublicState) {
                return;
            }

            AuthService.trackPageAccess(
                toState.name,
                toState.data && toState.data.pageTitle ? toState.data.pageTitle : null
            ).catch(angular.noop);
        });
    });

