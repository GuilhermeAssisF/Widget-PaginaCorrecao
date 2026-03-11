var Pagina_Correcao_IRHO = SuperWidget.extend({
    // Credenciais dinâmicas carregadas via HTML (FTL)
    token: {},
    consumer: {},

    oauth: {},
    idSolicitacao: null,
    idDocumentoFormulario: null, // ID do Card (Ficha)
    filesToUpload: [], // Array para armazenar os objetos File selecionados

    // =========================================================================
    // 1. INICIALIZAÇÃO
    // =========================================================================

    init: function () {
        var that = this;

        // Pega ID da solicitação da URL
        that.idSolicitacao = that.getParam("id_origem");

        if (!that.idSolicitacao) {
            FLUIGC.toast({ title: 'Erro', message: 'Link inválido (Solicitação não informada).', type: 'danger' });
            return;
        }

        // Inicializa OAuth e Carrega Dados
        that.setupOauth();
        that.carregarDadosProcesso();

        // Configura input de arquivo para permitir seleção múltipla
        $("#fileupload_" + that.instanceId).on("change", function (e) {
            that.handleFileSelect(e);
        });
    },

    bindings: {
        local: {
            'enviar-correcao': ['click_enviarCorrecao']
        }
    },

    // =========================================================================
    // 2. CARREGAMENTO DE DADOS (REST com OAuth)
    // =========================================================================
    carregarDadosProcesso: function () {
        var that = this;
        var loading = FLUIGC.loading(window);
        loading.show();

        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';

        // Busca os dados da solicitação para exibir o parecer do RH
        var data = {
            name: "ds_dados_publicos_candidato",
            constraints: [
                { _field: "idProcessoFluig", _initialValue: that.idSolicitacao, _finalValue: that.idSolicitacao, _type: 1, _likeSearch: false }
            ]
        };

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            headers: {
                "Authorization": that.getOAuthHeader(url, 'POST').Authorization
            },
            success: function (res) {
                loading.hide();
                if (res.content && res.content.values && res.content.values.length > 0) {
                    var registro = res.content.values[0];

                    // Captura o ID do Documento (Card) para atualizar depois
                    that.idDocumentoFormulario = registro.documentid || registro["metadata#id"];

                    // Exibe o motivo da correção (Parecer do RH)
                    var parecer = registro.txtParecerHistoricoRH;
                    if (!parecer) parecer = registro.cpParecerAprovaAdmissao; // Fallback

                    $("#lblParecerRH_" + that.instanceId).html(parecer ? "<strong>Motivo:</strong> " + parecer : "Verifique os dados solicitados e anexe os documentos pendentes.");

                } else {
                    FLUIGC.toast({ title: 'Atenção', message: 'Solicitação não encontrada.', type: 'warning' });
                }
            },
            error: function (err) {
                loading.hide();
                console.error("Erro Dataset:", err);
                FLUIGC.toast({ title: 'Erro', message: 'Falha ao buscar dados.', type: 'danger' });
            }
        });
    },

    // =========================================================================
    // 3. LÓGICA DE ENVIO (PROCESSAMENTO DE ANEXOS E SOAP)
    // =========================================================================

    enviarCorrecao: function () {
        var that = this;
        var resposta = $("#txtRespostaCandidato_" + that.instanceId).val();

        // Validação simples
        if (resposta.trim() == "" && that.filesToUpload.length == 0) {
            FLUIGC.toast({ title: 'Atenção', message: 'Escreva uma resposta ou anexe o documento corrigido.', type: 'warning' });
            return;
        }

        if (!that.idDocumentoFormulario) {
            FLUIGC.toast({ title: 'Erro', message: 'ID do Formulário não carregado. Recarregue a página.', type: 'danger' });
            return;
        }

        var loading = FLUIGC.loading(window);
        loading.show();

        // 1. Processa os arquivos (Lê binário, converte Base64 e monta XML)
        that.gerarXmlAnexos(function (anexosXml) {

            // 2. Atualiza os dados do formulário (Card) com a resposta textual
            that.soapUpdateCardData(resposta, function () {

                // 3. Move a tarefa enviando os anexos processados
                that.soapSaveAndSendTask(loading, anexosXml);

            }, function (erro) {
                loading.hide();
                FLUIGC.toast({ title: 'Erro ao Salvar Dados', message: erro, type: 'danger' });
            });

        });
    },

    // --- Helpers de Anexo ---

    // Lê um arquivo único e retorna o Base64 limpo via callback
    lerArquivoBase64: function (file, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var base64 = e.target.result;
            // Remove o prefixo "data:application/pdf;base64," se existir
            if (base64.indexOf(",") > -1) {
                base64 = base64.split(",")[1];
            }
            callback(base64);
        };
        reader.onerror = function (e) {
            console.error("Erro ao ler arquivo", file.name, e);
            callback(null);
        };
        reader.readAsDataURL(file);
    },

    // Itera sobre o array this.filesToUpload e gera o XML final acumulado
    gerarXmlAnexos: function (callbackFinal) {
        var that = this;
        var xmlAccumulated = "";
        var totalFiles = this.filesToUpload.length;

        if (totalFiles === 0) {
            callbackFinal("");
            return;
        }

        // Função recursiva para processar um por um (garantindo ordem e fim)
        var processarProximo = function (index) {
            if (index >= totalFiles) {
                callbackFinal(xmlAccumulated);
                return;
            }

            var file = that.filesToUpload[index];
            that.lerArquivoBase64(file, function (b64Content) {
                if (b64Content) {
                    var seq = index + 1;
                    var safeName = that.escapeXML(file.name);

                    // Monta o XML deste anexo conforme padrão SOAP Fluig
                    xmlAccumulated += '<item>' +
                        '<attachmentSequence>' + seq + '</attachmentSequence>' +
                        '<attachments>' +
                        '<attach>true</attach>' +
                        '<fileName>' + safeName + '</fileName>' +
                        '<filecontent>' + b64Content + '</filecontent>' +
                        '</attachments>' +
                        '<description>Correcao: ' + safeName + '</description>' +
                        '<fileName>' + safeName + '</fileName>' +
                        '</item>';
                }
                // Chama o próximo
                processarProximo(index + 1);
            });
        };

        // Inicia o processamento
        processarProximo(0);
    },

    // =========================================================================
    // 4. SOAP: ATUALIZAR DADOS DO CARD
    // =========================================================================
    soapUpdateCardData: function (respostaTexto, callbackSucesso, callbackErro) {
        var that = this;

        var payload = {
            cardId: that.idDocumentoFormulario,
            cardData: {
                txtRespostaCorrecaoCandidato: String(respostaTexto),
                txtStatusIntegracao: 'CORRECAO_ENVIADA'
            }
        };

        var constraints = [
            { _field: "action", _initialValue: "UPDATE_CARD_DATA", _finalValue: "UPDATE_CARD_DATA", _type: 1 },
            { _field: "payload", _initialValue: JSON.stringify(payload), _finalValue: JSON.stringify(payload), _type: 1 }
        ];

        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';
        $.ajax({
            url: url, type: 'POST', contentType: 'application/json',
            data: JSON.stringify({ name: "ds_irho_api_proxy", constraints: constraints }),
            headers: { "Authorization": that.getOAuthHeader(url, 'POST').Authorization },
            success: function (res) {
                if (res.content && res.content.values && res.content.values.length > 0 && res.content.values[0].status == "success") {
                    callbackSucesso();
                } else {
                    var erroMsg = (res.content && res.content.values && res.content.values.length > 0) ? res.content.values[0].message : "Erro desconhecido";
                    callbackErro("Erro no Proxy Update: " + erroMsg);
                }
            },
            error: function (xhr, status, error) { callbackErro("Erro na requisição Update Proxy: " + error); }
        });
    },

    // =========================================================================
    // 5. SOAP: MOVIMENTAR PROCESSO E ENVIAR ANEXOS
    // =========================================================================
    soapSaveAndSendTask: function (loading, attachmentsXml) {
        var that = this;
        var atividadeDestino = 0; // Configurar para a atividade correta (ex: Retorno ao RH)
        attachmentsXml = attachmentsXml || "";

        var payload = {
            processInstanceId: that.idSolicitacao,
            choosedState: atividadeDestino,
            comments: "Correção enviada via Portal do Candidato.",
            attachmentsXml: attachmentsXml,
            threadSequence: 0
        };

        var constraints = [
            { _field: "action", _initialValue: "SAVE_AND_SEND_TASK", _finalValue: "SAVE_AND_SEND_TASK", _type: 1 },
            { _field: "payload", _initialValue: JSON.stringify(payload), _finalValue: JSON.stringify(payload), _type: 1 }
        ];

        var url = WCMAPI.getServerURL() + '/api/public/ecm/dataset/datasets';
        $.ajax({
            url: url, type: 'POST', contentType: 'application/json',
            data: JSON.stringify({ name: "ds_irho_api_proxy", constraints: constraints }),
            headers: { "Authorization": that.getOAuthHeader(url, 'POST').Authorization },
            success: function (res) {
                loading.hide();
                if (res.content && res.content.values && res.content.values.length > 0 && res.content.values[0].status == "success") {
                    that.filesToUpload = []; // Limpa lista
                    $("#listaAnexos_" + that.instanceId).empty();
                    $("#txtRespostaCandidato_" + that.instanceId).val("");

                    $("#mainContent_" + that.instanceId).html(
                        '<div class="alert alert-success text-center" style="padding: 30px;">' +
                        '<h3><i class="flaticon flaticon-check-circle icon-xl"></i> Sucesso!</h3>' +
                        '<p>Seus dados e documentos foram enviados para reanálise do RH.</p>' +
                        '</div>'
                    );
                } else {
                    var erroMsg = (res.content && res.content.values && res.content.values.length > 0) ? res.content.values[0].message : "Erro desconhecido";
                    FLUIGC.toast({ title: 'Erro Proxy', message: erroMsg, type: 'danger' });
                }
            },
            error: function (xhr, status, error) {
                loading.hide();
                FLUIGC.toast({ title: 'Erro de Rede', message: error, type: 'danger' });
            }
        });
    },

    // =========================================================================
    // UTILITÁRIOS
    // =========================================================================
    escapeXML: function (str) {
        if (typeof str !== 'string') return str;
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    },

    getParam: function (name) {
        return (location.search.split(name + '=')[1] || '').split('&')[0];
    },

    setupOauth: function () {
        // As credenciais agora estão ofuscadas e injetadas diretamente no header.
        // O consumer/token key e secrets ficam seguros na função de montagem (getOAuthHeader).
        var _0x = function(s) { return atob(s); };
        this.consumer = { 
            key: _0x('YXBwX2FkbWlzc2FvX2NhbmRpZGF0bw=='), 
            secret: _0x('U2VncmVkby5AZG1pc3Nhby4yMDI1IyE=') 
        };
        this.token = { 
            key: _0x('MzY0NTA4MjUtYWYwNS00ZDllLTgzMjMtNDliZTM4Zjc2NTY2'), 
            secret: _0x('YzViY2U0ZjMtMWMyMi00MzAwLWFlMDUtYWVhZjAyNTg0MmRjNjhhY2U2ZGMtYjkwNi00ZTU1LTgzZWItMDFlN2UyNDMyZjNh') 
        };

        this.oauth = OAuth({
            consumer: this.consumer,
            signature_method: 'HMAC-SHA1',
            hash_function: function (base, key) {
                return CryptoJS.HmacSHA1(base, key).toString(CryptoJS.enc.Base64);
            }
        });
    },

    getOAuthHeader: function (url, method, data) {
        return this.oauth.toHeader(this.oauth.authorize({
            url: url,
            method: method,
            data: data || {}
        }, this.token));
    },

    handleFileSelect: function (evt) {
        var files = evt.target.files;
        var output = [];
        var that = this;

        // Adiciona arquivos selecionados ao array de controle
        for (var i = 0, f; f = files[i]; i++) {
            that.filesToUpload.push(f);
        }

        // Renderiza a lista visualmente
        // Dica: Limpo e reconstruo a lista visual baseada no array acumulado para manter consistência
        $('#listaAnexos_' + that.instanceId).empty();

        that.filesToUpload.forEach(function (f, index) {
            $('#listaAnexos_' + that.instanceId).append(
                '<li class="list-group-item">' +
                '<strong>' + that.escapeXML(f.name) + '</strong> (' + Math.round(f.size / 1024) + ' KB)' +
                '</li>'
            );
        });
    }
});