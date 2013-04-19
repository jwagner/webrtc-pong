/*
 * Resource Loading
 * ================
 *
 * Usage:
 *
 * loader = new Loader('resources/');
 * loader.loadBundle('all').then(function(){
 *     console.log(loader.resources['foo/bar.baz']);
 * });
 *
 *
 * Bundle Description
 * ------------------
 * 
 * {
 *     resources: [
 *       resource description,
 *       ...
 *     ]
 * }
 *
 * Resource Description
 * --------------------
 *
 * {
 *    name: 'foo/bar.json', // required
 *    type: 'text' | 'json' | 'arraybuffer' | 'blob',  // required
 *    id: 'usuallysha1(content)' // optional, used for cache control
 *    size: 123 // optional, used for pending bytes
 * }
 *
 */

var _ = require('underscore'),
    q = require('q');

function XHR2Fetcher(root){
    this.pendingBytes = 0;
    this.root = root || 'resources/';
}
XHR2Fetcher.prototype = {
    fetch: function(description){
        var xhr = new XMLHttpRequest(),
            // 4294967296 should be enough
            cacheKey = (description.id || '').substring(0, 8),
            url = this.root + description.name + '?' + cacheKey,
            deferred = q.defer();

        var loaded = 0;
        function progress(e){
            if(description.size){
                this.pendingBytes -= (e.loaded-loaded);
                loaded = e.loaded;
            }
        }

        xhr.open('GET', url, true); 
        if(description.type) {
            xhr.responseType = description.type;
            if(description.type === 'json' && xhr.responseType === ''){
                xhr.responseType = 'text';
            }
        }
        xhr.onload = function(e) {
            progress.call(this, {loaded: description.size});
            // emulate json support in chrome
            if(xhr.responseType === 'text' && description.type == 'json'){
                deferred.resolve(JSON.parse(xhr.response));
            }
            else {
                deferred.resolve(xhr.response);
            }
        }.bind(this);
        xhr.onprogress = function(e) {
            progress.call(this, e);
        }.bind(this);
        xhr.onerror = function(e){
            progress.call(this, {loaded: description.size});
            deferred.reject({message: xhr.statusText, xhr: xhr});
        }.bind(this);
        if(description.size){
            this.pendingBytes += description.size;
        }
        xhr.send();
        return deferred.promise;
    }
};
exports.XHR2Fetcher = XHR2Fetcher;

function Loader(fetcher){
    this.fetcher = fetcher || new XHR2Fetcher();
    // name -> object
    this.resources = {};
    // id -> promise
    this.resourcePromisesById = {};
    // name -> promise
    this.bundles = {};
    this.onerror = function(){};
}
Loader.prototype = {
    loadBundle: function(name) {
        if(!(name in this.bundles)){
            this.bundles[name] = this.fetcher.fetch({
                name: 'bundles/' + name + '.json',
                type: 'json',
                id: 'rnd' + Math.floor(Math.random()*1e9)
            }).then(function(bundleDescription) {
                return bundleDescription.resources.map(this.loadResource.bind(this));
            }.bind(this)).all(); 
        }
        return this.bundles[name];
    },
    loadResource: function(description) {
        if(!(description.id in this.resourcePromisesById)){
            this.resourcePromisesById[description.id] = this.fetcher.fetch(description);
        }
        return this.resourcePromisesById[description.id]
            .then(function(value){
                this.resources[description.name] = value;
            }.bind(this));


    } 
};
exports.Loader = Loader;

function Manager(resources) {
    this.resources = resources;
    this.values = {};
    this.promises = {};
}
exports.Manager = Manager;
Manager.prototype = {
    prefix: '',
    postfix: '',
    getFullname: function(name) {
        return this.prefix + name + this.postfix;
    },
    process: function(input, success, error) {
        _.defer(function(){
            if(input) success(input);
            else error(input);
        });
    },
    get: function(name, callback) {
        if(!this.values.hasOwnProperty(name)){
            this.getPromise(name).then(callback).done();
        }
        // fast path
        else {
            callback(this.values[name]);
        }
    }, 
    getPromise: function(name) {
        if(!this.values.hasOwnProperty(name)){
            var deferred = q.defer(),
                fullname = this.getFullname(name),
                resource = this.resources[fullname];
            this.promises[name] = deferred.promise;
            if(!resource){
                deferred.reject('file not found ' + fullname);
            }
            else {
                this.process(resource,
                    function(value) {
                        this.values[name] = value;
                        deferred.resolve(value);
                    }.bind(this),
                    function(error){
                        deferred.reject(error);
                    }
                );
            }
        }
        return this.promises[name];
    } 
};

