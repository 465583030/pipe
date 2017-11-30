/**
 * @fileoverview service work.
 *
 * @author <a href="http://vanessa.b3log.org">Liyuan Li</a>
 * @version 0.1.0.0, Nov 30, 2017
 */

import config from '../pipe.json'

const version = config.StaticResourceVersion;
const staticServePath = config.Server;
const imgServePath = 'https://img.hacpai.com/';
const servePath = config.StaticServer || config.Server;
/**
 * @description add offline cache
 */
self.addEventListener('activate', event => {
  // delete all caches
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(keyList.map(function (key) {
        if (key !== 'pipe-html' && key !== 'pipe-image' &&
          key !== 'pipe-static-' + version) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// 请求截取
self.addEventListener('fetch', event => {
  if (event.request.headers.get('accept').indexOf('text/html') === 0 // document
    || (
      event.request.headers.get('accept') === '*/*' &&
      event.request.url.indexOf('/js/') === -1 && !event.request.url.endsWith('.js')
    ) // get rid of some static accept header is '*/*'
    || (
      event.request.headers.get('accept').indexOf('application/json') === 0 &&
      event.request.url.indexOf(config.Server + '/api') === 0
    ) // api
  ) {
    // 动态资源
    event.respondWith(
      // 动态资源需要每次进行更新
      fetch(event.request).then(function (response) {
        // 站点以外的需求不缓存
        if (event.request.url.indexOf(servePath) === -1) {
          return response;
        }
        return caches.open('pipe-html').then(function (cache) {
          // 更新动态资源的缓存
          if (event.request.method !== 'POST' && event.request.method !== 'DELETE' &&
            event.request.method !== 'PUT') {
            // cache is unsupported POST
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(function () {
        // 动态资源需离线后从缓存中获取
        return caches.match(event.request);
      })
    );
  } else {
    // 静态资源
    event.respondWith(
      caches.match(event.request).then(response => {
        // 指定的静态资源直接从缓存中获取
        return response ||
          // 没有指定的静态资源从服务器拉取
          fetch(event.request).then(function (fetchResponse) {
            if (event.request.url.indexOf(imgServePath) > -1) {
              // 对用户头像、图片进行缓存
              return caches.open('pipe-image').then(function (cache) {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
            } else if (event.request.url.indexOf(staticServePath) > -1) {
              // 对 css, js, image 进行缓存
              return caches.open('pipe-static-' + version).then(function (cache) {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
              });
            } else {
              return fetchResponse;
            }
          }).catch(function () {
            // 静态资源获取失败
            console.log(`fetch ${event.request.url} error`)
          });
      })
    )
  }
});