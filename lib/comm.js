// Copyright 2004-present Facebook. All Rights Reserved.

// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

function sendFileNotFound(res, filename, err) {
  console.log('fnf: ' + filename);
   (typeof Log !== 'undefined') && Log.http('404 - ' + filename);
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('404 Not Found: ' + filename + ' (' + err + ')\n');
  res.end();
}

function fullFileName(filename) {
  return process.cwd() + (filename[0] == '/' ? '' : '/') + filename;
}

function expandMetatags(req) {
  var useragent = req.headers['user-agent'];
  if (/iPhone/i.test(useragent)) {
    return '<meta name="viewport" content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0"/>\n' +
      '<meta name="apple-mobile-web-app-capable" content="yes" />\n' +
      '<meta name="apple-touch-fullscreen" content="yes" />\n' +
      '<meta name="apple-mobile-web-app-status-bar-style" content="black" />\n';
  }
  else if (/iPad/i.test(useragent)) {
    return '<meta name="viewport" content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0"/>\n' +
      '<meta name="apple-mobile-web-app-capable" content="yes" />\n' +
      '<meta name="apple-touch-fullscreen" content="yes" />\n' +
      '<meta name="apple-mobile-web-app-status-bar-style" content="black" />\n';
  }
  else if (/iPod/i.test(useragent)) {
    return '<meta name="viewport" content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0"/>\n' +
      '<meta name="apple-mobile-web-app-capable" content="yes" />\n' +
      '<meta name="apple-touch-fullscreen" content="yes" />\n' +
      '<meta name="apple-mobile-web-app-status-bar-style" content="black" />\n';
  }
  else if (/Android/i.test(useragent)) {
    return '<meta name="viewport" content="width=device-width,height=device-height, target-densitydpi=device-dpi, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>\n';
  }
  return '';
}

function getAppInfo(path,fb_app_info) {
  for(var i in fb_app_info) {
    if (fb_app_info[i].id && path.indexOf(i) >= 0) {
      return fb_app_info[i];
    }
  }
  return fb_app_info;
}

function expandSHTML(req, file, filename, options) { //FIXMEBRUCE - should make this async
  var split = file.split('\n');
  var result = '';
  for(var i in split) {
    var s = split[i];
    var ret = s.match(/\s*#include\s+[\'\"](.*)[\'\"]/);
    if (ret) {
      var name = ret[1];
      var asplit = name.split('$');
      if (asplit.length === 2 && asplit[0] === 'app') {
        var app_info = getAppInfo(filename,options.fb_app_info);
        var aval = app_info && app_info[asplit[1]];
        if (typeof aval !== 'undefined') {
          if (typeof aval === 'string') {
            aval = '"' + aval + '"';
          }
          result += '<script type="text/javascript">var fb_app_' + asplit[1] + '=' + aval + ';</script>';
        }
      } else if (name == 'app_id') {
        var app_info = getAppInfo(filename,options.fb_app_info);
        result += '<script type="text/javascript">var fb_app_id='+(app_info ? app_info.id : 0)+';</script>\n';
      } else {
        name = ret[1];
        var info = options.fb_app_info;
        if (info && info[name]) {
          result += info[name];
        } else {
          try {
            result += fs.readFileSync(fullFileName(name),'binary');
          } catch (e) {
            console.log('fnf: ' + fullFileName(name));
          }
        }
      }
    } else {
      ret = s.match(/\s*#metatags/);
      if (ret) {
        var tmp = expandMetatags(req);
        result += tmp;
      } else {
        result += s+'\n';
      }
    }
  }
  return result;
}

function sendFile(req, res, filename, options) {
  options = options || {};
  var fullname = fullFileName(filename);
  fs.readFile(fullname, 'binary', function(err, file) {
    if (err) {
      if (options.cb) {
          options.cb(res, filename);
      } else {
        sendFileNotFound(res, filename, err);
      }
    } else {
      var extension = path.extname(filename);
      var header = {};
      switch (extension) {
        case '.js':
          header['Content-Type'] = 'text/javascript';
          break;
        case '.css':
          header['Content-Type'] = 'text/css';
          break;
        case '.shtml':
          file = expandSHTML(req, file, filename, options);
          break;
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
          header['Expires'] = 'Sun, 17 Jan 2038 19:14:07 GMT';
          header['Cache-Control'] = 'max-age=3600';
          break;
      }
      if (typeof Log !== 'undefined') {
        Log.http('200 - ' + filename);
      }
      res.writeHead(200, header);
      res.write(file, 'binary');
      res.end();
    }
  });
}

function toClient(user, cmd) {
  user.commands.push(cmd);
}

exports.sendFileNotFound = sendFileNotFound;
exports.sendFile = sendFile;
exports.toClient = toClient;
exports.expandSHTML = expandSHTML;
