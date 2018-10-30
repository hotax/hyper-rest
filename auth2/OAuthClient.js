var __options;

function AuthClient(authServer, options){
    this.authServer = authServer;
    this.options = options;
    this.clientState = __options.clientStateFactory()
}

AuthClient.prototype.sendAuthorizationRequest = function (redirect) {
    var state = this.clientState.generate();
    var url = __options.authRequestUriBuilder(this.authServer.authorizationEndpointUri, this.options.id, this.options.redirectUri, state);
    return redirect(url);
}

AuthClient.prototype.attachTo = function (app, callbackUri) {
    var encodedCredentials = __options.encodeCredentials(this.options.id, this.options.secret);
    var sender = __options.authCodeGrantRequestFactory(this.authServer.tokenEndpointUri, encodedCredentials, this.options.redirectUri);
    __options.callbackFactory(app, callbackUri, {
        createHttpError: __options.createHttpError,
        clientState: this.clientState,
        authCodeGrantRequestSender: sender
    });
}

const createClient = function (authServer, options) {
    return new AuthClient(authServer, options);
}

const clientFactory = function (options) {
    __options = options;
    return {
        create: createClient
    }
}

module.exports = clientFactory;