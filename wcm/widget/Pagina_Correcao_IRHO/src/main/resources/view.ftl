<div id="PaginaCorrecao_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide" data-params="Pagina_Correcao_IRHO.instance()">

    <#-- AS CREDENCIAIS OAUTH AGORA SÃO OFUSCADAS DIRETAMENTE NO JAVASCRIPT -->

    <div id="oauth_config_${instanceId}" style="display:none;"></div>


    <div class="row">
        <div class="col-xs-12 text-center" style="margin-bottom: 20px;">
            <img src="/Pagina_Candidato_IRHO/resources/images/LOGO-COMPLETA.png" style="max-width: 200px;">
            <h3>Regularização de Pendências - Admissão</h3>
        </div>
    </div>

    <div id="loading_${instanceId}" style="display:none; text-align:center;">
        <i class="fluigicon fluigicon-refresh fluigicon-xl fluigicon-animate"></i> <br/> Processando...
    </div>

    <div id="mainContent_${instanceId}" class="container">
        
        <div class="row">
            <div class="col-md-12">
                <div class="alert alert-warning" role="alert" style="background-color: #fff3cd; color: #856404; border-color: #ffeeba;">
                    <h4><i class="fluigicon fluigicon-exclamation-sign"></i> <strong>Atenção: Motivo da Devolução</strong></h4>
                    <p style="font-size: 16px; white-space: pre-wrap;" id="lblParecerRH_${instanceId}">Carregando motivo...</p>
                </div>
            </div>
        </div>

        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title">Sua Resposta</h3>
            </div>
            <div class="panel-body">
                <div class="form-group">
                    <label for="txtRespostaCandidato">Descreva a correção ou adicione observações para o RH:</label>
                    <textarea class="form-control" rows="4" id="txtRespostaCandidato_${instanceId}" placeholder="Ex: Segue em anexo o documento atualizado conforme solicitado..."></textarea>
                </div>
            </div>
        </div>

        <div class="panel panel-default">
            <div class="panel-heading">
                <h3 class="panel-title">Anexar Documentos Faltantes</h3>
            </div>
            <div class="panel-body">
                <div class="row">
                    <div class="col-md-12">
                        <p class="help-block">Caso o RH tenha solicitado novos documentos, anexe-os abaixo.</p>
                        <div class="form-group">
                            <label class="btn btn-primary btn-file">
                                <i class="fluigicon fluigicon-paperclip"></i> Selecionar Arquivos
                                <input type="file" id="fileupload_${instanceId}" name="files" multiple style="display: none;">
                            </label>
                        </div>
                        <ul id="listaAnexos_${instanceId}" class="list-group" style="margin-top: 10px;"></ul>
                    </div>
                </div>
            </div>
        </div>

        <div class="row" style="margin-top: 20px; margin-bottom: 40px;">
            <div class="col-md-12 text-center">
                <button type="button" class="btn btn-success btn-lg btn-block" data-enviar-correcao>
                    <i class="fluigicon fluigicon-checked"></i> ENVIAR CORREÇÃO
                </button>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript" src="/Pagina_Correcao_IRHO/resources/js/oauth-1.0a.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.min.js"></script>
<script type="text/javascript" src="/Pagina_Correcao_IRHO/resources/js/Pagina_Correcao_IRHO.js"></script>