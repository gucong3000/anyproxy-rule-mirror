const path = require('path').posix;
const request = require('request');
const mime = require('mime-types');
const fs = require('fs-extra');
const util = require('util');
const nugget = util.promisify(require('nugget'));
const registry = 'registry.npm.taobao.org';
const hostMap = {
  // github
  'raw.githubusercontent.com': 'raw.github.cnpmjs.org',
  'raw.github.com': 'raw.github.cnpmjs.org',
  'github.com': 'github.com.cnpmjs.org',

  // npm registry
  'registry.npmjs.com': registry,
  'registry.npmjs.org': registry,
  // 'www.npmjs.com': 'npm.taobao.org',

  // google
  'ajax.googleapis.com': 'ajax.googleapis.cnpmjs.org',
  'fonts.googleapis.com': 'fonts.googleapis.cnpmjs.org',
  'fonts.gstatic.com': 'fonts.gstatic.cnpmjs.org',
  'themes.googleusercontent.com': 'themes.googleusercontent.cnpmjs.org',
};

const protocolMap = {
  'fonts.useso.com': 'http',
  'ajax.useso.com': 'http',
};

const urlMap = {};

function updateUrlMap (categories, update) {
  Object.keys(categories).forEach(name => {
    const dist = (categories[name].disturl || categories[name]);
    urlMap[dist.replace(/^\w+:\/+/, '')] = path.join('npm.taobao.org/mirrors', name);
  });
  return update && fs.writeFile(require.resolve('./categories.json'), JSON.stringify(urlMap, 0, '\t'));
}

request('https://raw.github.cnpmjs.org/cnpm/mirrors/master/config/index.js', function (error, response, body) {
  if (error || response.statusCode !== 200) {
    updateUrlMap(require('./categories.json'));
    return;
  }
  let categories = body.match(/(?<=(\n\s+)categories:\s*)\{[\s\S]+\1+\}(?=,\n)/)[0];
  // eslint-disable-next-line no-eval
  categories = eval.call(0, `(${categories})`);
  updateUrlMap(categories, true);
});

// function replaceUrl (requestOptions) {
//   let result;
//   if (urlMap.find(mapFn => {
//     result = mapFn(requestOptions.hostname, requestOptions.path);
//     return result;
//   })) {
//     return Object.assign(requestOptions, result);
//   }
// }

module.exports = {
  async summary () {
    return require('./package.json').description;
  },
  async beforeSendRequest (requestDetail) {
    let req = requestDetail.requestOptions;
    if (!/^(HEAD|GET)$/.test(req.method)) {
      return;
    }
    if (hostMap[req.hostname]) {
      req.hostname = hostMap[req.hostname];
    } else {
      let url = path.join(req.hostname, req.path);
      const urlPrefix = Object.keys(urlMap).find(
        urlPrefix => url.startsWith(urlPrefix)
      );

      if (urlPrefix) {
        const reqOpts = (urlMap[urlPrefix] + url.slice(urlPrefix.length)).match(/(^[^/]+)(.*)$/);
        req.hostname = reqOpts[1];
        req.path = reqOpts[2];
      } else {
        return;
      }
    }
    requestDetail.protocol = protocolMap[req.hostname] || 'https';
    console.log(requestDetail.url + ` => ${requestDetail.protocol}://${req.hostname}${req.path}`);
    if (/^(.+?\.(?:rar|zip|7z|tar|gz|tgz|node|pdb))(?:\?.+)?$/i.test(req.path)) {
      let resLocalFile = await resFileByCache(`${requestDetail.protocol}://${req.hostname}${req.path}`);
      if (!resLocalFile) {
        resLocalFile = await resFileByCache(requestDetail.url);
      }
      if (resLocalFile) {
        return resLocalFile;
      }
    }
    req.headers.host = req.hostname;
    req.port = requestDetail.protocol === 'https' ? 443 : 80;
    return requestDetail;
  },
};

const localFs = new WeakMap();
function resFileByCache (url) {
  if (!localFs.has(url)) {
    localFs.set(url, download(url));
  }
  return localFs.get(url);
}

async function download (url) {
  const dist = url.replace(/^\w+:\/+/, '');
  const localFileExist = await fs.exists(dist);
  if (!localFileExist) {
    await fs.ensureDir(path.dirname(dist));
    await nugget(url, {
      target: dist + '.tmp',
      quiet: false,
      resume: true,
      strictSSL: false,
    });

    await fs.move(dist + '.tmp', dist);
  }
  const body = await fs.readFile(dist);
  if (!body) {
    return;
  }
  return {
    statusCode: 200,
    header: {
      'Content-Type': mime.lookup(dist),
    },
    body,
  };
}
