const request = require('request');
const AnyProxy = require('anyproxy');
const options = {
  port: 8001,
  rule: require('../'),
  forceProxyHttps: true,
  silent: true,
};

const proxyServer = new AnyProxy.ProxyServer(options);

proxyServer.on('ready', () => {
  setTimeout(() => {
    request('http://registry.npmjs.com/npm', {
      proxy: 'http://127.0.0.1:8001',
    });
    request('http://alinode.aliyun.com/dist/new-alinode/alinode.json', {
      proxy: 'http://127.0.0.1:8001',
    });
    request('http://raw.githubusercontent.com/cnpm/mirrors/master/config/index.js', {
      proxy: 'http://127.0.0.1:8001',
    });
    request('http://github.com/websockets/utf-8-validate/releases/download/v4.0.0/utf-8-validate-v4.0.0-electron-v46-darwin-x64.tar.gz', {
      proxy: 'http://127.0.0.1:8001',
    });

    request('http://fonts.googleapis.com/css?family=Open+Sans:300,400,600&subset=latin,latin-ext', {
      proxy: 'http://127.0.0.1:8001',
    });

    request('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js?ver=3.4.2', {
      proxy: 'http://127.0.0.1:8001',
    });

    // request('https://registry.npmjs.org/npm/-/npm-1.1.25.tgz', {
    //   proxy: 'http://127.0.0.1:8001',
    // });
  }, 1000);
});
proxyServer.on('error', console.error);
proxyServer.start();

[
  'unhandledRejection',
  'uncaughtException',
  'rejectionHandled',
].forEach(event => {
  process.on(event, console.error);
});
