/**
 * Created by EmiyaLee
 */
'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ionic_angular_1 = require("ionic-angular");
var core_1 = require("@angular/core");
var emiya_angular2_token_1 = require("emiya-angular2-token");
var emiya_js_utils_1 = require("emiya-js-utils");
var emiya_angular2_event_1 = require("emiya-angular2-event");
var StatusCode_1 = require("./StatusCode");
var DEBUG = true;
var PUSH_BASE_STATE = false;
//const PUSH_ANIMATE = {animation: "md-transition"};
var PUSH_ANIMATE = { updateUrl: false };
var POP_ANIMATE = { updateUrl: false };
var CLEANUP_ANIMATE = { animate: false, duration: 0, updateUrl: false };
var FAKE_POP_ANIMATION = { direction: 'back', updateUrl: false };
var Router = (function () {
    function Router(app, platform) {
        var _this = this;
        this.app = app;
        this.platform = platform;
        this.token = emiya_angular2_token_1.Token;
        this.utils = emiya_js_utils_1.Utils;
        this.ignorePopCount = 0;
        this.tokenHookEnable = true;
        this.pushStateParam = null;
        this.pauseOnpopstate = false;
        this.rootOverride = false;
        this.appVersionSetByManul = false;
        this.packageName = ' ';
        this.packageVersion = ' ';
        this.defaultBackButtonPrior = 101;
        this.canGoBack = function () {
            return _this.getGoBackPage().name != null;
        };
        this.enableOnpopstate();
        this.registerBackButtonAction();
        this.rootOverrideMonitor = this.app.viewWillEnter.subscribe(function (ev) {
            _this.rootOverride = true;
            _this.rootOverrideMonitor.unsubscribe();
            _this.rootOverrideMonitor = null;
        });
        this.viewInterceptor();
    }
    Router.prototype.registerBackButtonAction = function (backButtonPrior) {
        var _this = this;
        if (backButtonPrior === void 0) { backButtonPrior = this.defaultBackButtonPrior; }
        if (this.backButtonCallback)
            this.backButtonCallback();
        this.backButtonCallback = this.platform.registerBackButtonAction(function () {
            _this.pop();
        }, this.utils.notNull(backButtonPrior) ? backButtonPrior : this.defaultBackButtonPrior);
    };
    Router.prototype.changeBackButtonPrior = function (prior) {
        if (this.utils.notNull(prior) || !this.backButtonCallback) {
            if (this.backButtonCallback) {
                this.backButtonCallback();
                this.backButtonCallback = null;
            }
            this.registerBackButtonAction(prior);
        }
    };
    Router.prototype.loadRootPage = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            //console.log(root)
            //console.log(this.platform.version())
            _this.platform.ready().then(function () {
                var defaultP = new Promise(function (resolve, reject) {
                    resolve(' ');
                }), p0 = defaultP, p1 = defaultP;
                if (_this.appVersionSetByManul == false && window['cordova'] && window['cordova'].getAppVersion) {
                    p0 = window['cordova'].getAppVersion.getVersionCode();
                    p1 = window['cordova'].getAppVersion.getPackageName();
                }
                var hander = function (result, isPass) {
                    if (isPass === void 0) { isPass = 0; }
                    if (_this.appVersionSetByManul == false && isPass == 0) {
                        _this.packageName = result[1];
                        _this.packageVersion = result[0];
                    }
                    var root = _this.getRootPage();
                    if (_this.rootOverride != false) {
                        reject(StatusCode_1.PUSH_OVERRIDE);
                        return;
                    }
                    _this.app.getRootNav().setRoot(root.page, root.params, root.options).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        //if (root.doNotReplaceState != true)
                        //console.log(this.app.getRootNav().last())
                        _this.pushState(root.doNotReplaceState != true);
                        if (_this.utils.notNull(root.duration)) {
                            var timer_1, monitor_1;
                            timer_1 = setTimeout(function () {
                                if (monitor_1) {
                                    monitor_1.unsubscribe();
                                    monitor_1 = null;
                                }
                                timer_1 = null;
                                _this.next();
                            }, root.duration);
                            //alert()
                            monitor_1 = _this.app.viewWillEnter.subscribe(function (ev) {
                                if (timer_1) {
                                    clearTimeout(timer_1);
                                    timer_1 = null;
                                }
                                monitor_1.unsubscribe();
                                monitor_1 = null;
                            });
                        }
                        if (root.done)
                            try {
                                root.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                        resolve(hasCompleted);
                    })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        if (root.done)
                            try {
                                root.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                        reject(hasCompleted);
                    });
                };
                Promise.all([p0, p1]).then(function (result) {
                    hander(result);
                })["catch"](function (data) {
                    hander(null, 1);
                });
            })["catch"](function (data) { return reject(data); });
        });
        // setTimeout(()=>{
        //   this.app.getRootNav().push(root.page, root.params, root.options, root.done)
        // },4000)
    };
    Router.prototype.getRootPage = function () {
        //alert(this.utils.getUrlParam('?0=123&1=http://218.17.240.226:4012/group1/M00/00/14/rBEADVfRFAyAYzwyAAAMPb9q4kk633.jpg'))
        var params = this.utils.getUrlParam(window.location.href.indexOf('#') >= 0 ? window.location.hash : window.location.search), path = this.utils.getUrlPath(window.location.hash), target;
        //alert(JSON.stringify(params))
        for (var c in this.config) {
            if (this.utils.matchUrlPath(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + c), path) == true) {
                target = this.utils.deepCopy(this.config[c]);
                target.params = this.utils.mergeObject(params, target.params);
                target.doNotReplaceState = true;
                //target.name = this.config[c].id
                //target.name=c
                //alert(JSON.stringify(target.params))
                break;
            }
        }
        if (!target) {
            for (var c in this.config) {
                var _tmp = this.utils.matchUrlSchema(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + c), path);
                if (_tmp['result'] == true) {
                    target = this.utils.deepCopy(this.config[c]);
                    target.params = this.utils.mergeObject(_tmp['restful'], params, target.params);
                    target.doNotReplaceState = true;
                    //target.name = this.config[c].id
                    //target.name=c
                    //alert(JSON.stringify(target.params))
                    break;
                }
            }
        }
        if (target && target.root != true) {
            window.localStorage.setItem(this.packageName, this.packageVersion);
            if (target.guide) {
                for (var d in this.config) {
                    if (this.config[d].root == true) {
                        this.nextPage = {
                            srcName: target.id,
                            srcPage: target.page,
                            name: this.config[d].id,
                            page: this.config[d].page,
                            params: this.config[d].params,
                            options: this.config[d].options,
                            done: this.config[d].done
                        };
                        break;
                    }
                }
                if (this.utils.notBlankStr(target.guide.duration) && target.guide.duration >= 0) {
                    target.duration = target.guide.duration;
                }
            }
            return target;
        }
        for (var c in this.config) {
            if (this.config[c].guide) {
                //alert(JSON.stringify(this.config[c]))
                if (window.localStorage.getItem(this.packageName) != this.packageVersion || this.config[c].guide.always == true) {
                    window.localStorage.setItem(this.packageName, this.packageVersion);
                    for (var d in this.config) {
                        if (this.config[d].root == true) {
                            this.nextPage = {
                                srcName: this.config[c].id,
                                srcPage: this.config[c].page,
                                name: d,
                                page: this.config[d].page,
                                params: this.utils.mergeObject(params, this.config[d].params),
                                options: this.config[d].options,
                                done: this.config[d].done
                            };
                            break;
                        }
                    }
                    var _tmp = this.utils.deepCopy(this.config[c]);
                    if (this.utils.notBlankStr(this.config[c].guide.duration) && this.config[c].guide.duration >= 0) {
                        _tmp.duration = this.config[c].guide.duration;
                    }
                    //let _page = this.utils.deepCopy(this.config[c]);
                    //_page.name=c
                    // if (target && target.name == _page.name) {
                    //   _page.params = this.utils.mergeObject(params, _page.params)
                    //   alert(JSON.stringify(_page.params))
                    // }
                    return _tmp;
                }
            }
        }
        for (var c in this.config) {
            if (this.config[c].root == true) {
                window.localStorage.setItem(this.packageName, this.packageVersion);
                var _page = this.utils.deepCopy(this.config[c]);
                _page.params = this.utils.mergeObject(params, _page.params);
                _page.doNotReplaceState = (target != null);
                //alert(JSON.stringify(target))
                return _page;
            }
        }
    };
    Router.prototype.enableOnpopstate = function () {
        var _this = this;
        window.onpopstate = function () {
            if (_this.pauseOnpopstate == true)
                return;
            if (_this.ignorePopCount > 0)
                --_this.ignorePopCount;
            else {
                _this.pop(null, null, true)["catch"](function (err) {
                    _this.debug(err);
                });
            }
        };
    };
    Router.prototype.unlistenOnpopstate = function () {
        window.onpopstate = null;
    };
    Router.prototype.disableOnpopstate = function () {
        ++this.ignorePopCount;
    };
    Router.prototype.setVersion = function (name, increment) {
        this.packageName = name;
        this.packageVersion = increment;
        this.appVersionSetByManul = true;
    };
    Router.prototype.load = function (config) {
        this.config = [];
        this.banRouter = [];
        config = this.utils.deepCopy(config);
        var _config = [];
        for (var c in config) {
            config[c].id = c;
            _config.push(config[c]);
        }
        config = _config;
        for (var c in config) {
            if (config[c].enable != false)
                this.config.push(this.utils.deepCopy(config[c]));
            else
                this.banRouter.push(this.utils.deepCopy(config[c]));
        }
        console.log(this.config);
        //this.config = config;
        this.loadRootPage();
    };
    Router.prototype.getBannedPageConfig = function (name) {
        for (var c in this.banRouter) {
            if ((typeof name == 'string' && this.banRouter[c].id == name) || (name instanceof this.banRouter[c].page) || name === this.banRouter[c].page)
                return this.banRouter[c];
        }
    };
    Router.prototype.checkIfBanned = function (name) {
        return !(!this.getBannedPageConfig(name));
    };
    Router.prototype.setExitHook = function (cb, prior) {
        this.exitCallback = cb;
        this.changeBackButtonPrior(prior);
    };
    Router.prototype.getPage = function (name) {
        for (var c in this.config) {
            if ((typeof name == 'string' && this.config[c].id == name) || (name instanceof this.config[c].page) || name === this.config[c].page)
                return this.config[c].page;
        }
        if (typeof name != 'string')
            return name;
    };
    Router.prototype.getPageConfig = function (name) {
        for (var c in this.config) {
            if ((typeof name == 'string' && this.config[c].id == name) || (name instanceof this.config[c].page) || name === this.config[c].page)
                return this.config[c];
        }
    };
    Router.prototype.setNextPage = function (_config) {
        if (this.checkIfBanned(_config.name) != true && this.checkIfBanned(_config.page) != true) {
            this.config = this.utils.deepCopy(_config);
            return true;
        }
        return false;
    };
    Router.prototype.cleanupPopStack = function (srcPage, cleanAll) {
        if (srcPage === void 0) { srcPage = null; }
        if (cleanAll === void 0) { cleanAll = false; }
        var currentConfig = this.getPageConfig(this.app.getRootNav().last().instance);
        if (currentConfig && currentConfig.root == true)
            cleanAll = true;
        if (cleanAll != true) {
            var start = -1, nav = this.app.getRootNav(), length_1 = nav.length();
            for (var c = 0; c < length_1 - 1; ++c) {
                if (nav.getByIndex(c).instance instanceof currentConfig.page) {
                    start = c;
                    break;
                }
            }
            //console.log(start)
            if (start >= 0) {
                //alert(0)
                nav.remove(start, length_1 - start - 1, CLEANUP_ANIMATE);
                return length_1 - start - 1;
            }
            else if (this.utils.notNull(srcPage)) {
                start = -1;
                for (var c = 0; c < length_1 - 1; ++c) {
                    if (nav.getByIndex(c).instance instanceof srcPage) {
                        start = c;
                        break;
                    }
                }
                if (start >= 0) {
                    //alert(start+"/"+(length - start - 2))
                    nav.remove(start + 1, length_1 - start - 2, CLEANUP_ANIMATE);
                    return length_1 - start - 2;
                }
            }
        }
        else {
            //alert(srcName)
            //alert(2)
            this.app.getRootNav().remove(0, this.app.getRootNav().length() - 1, CLEANUP_ANIMATE);
            return this.app.getRootNav().length() - 1;
        }
        return 0;
    };
    Router.prototype.popStack = function (srcPage) {
        if (srcPage === void 0) { srcPage = null; }
        var start = -1, nav = this.app.getRootNav(), length = nav.length();
        for (var c = 0; c < length - 1; ++c) {
            if (nav.getByIndex(c).instance instanceof srcPage) {
                start = c;
                break;
            }
        }
        if (start >= 0) {
            //alert(start+"/"+(length - start - 2))
            return nav.remove(start + 1, length - start - 1, CLEANUP_ANIMATE);
        }
        return new Promise(function (resolve, reject) {
            resolve(0);
        });
    };
    Router.prototype.viewInterceptor = function () {
        var _this = this;
        this.app.viewWillEnter.subscribe(function (ev) {
            //console.log(123, ev)
            //console.log(ev)
            //if (this.getPageConfig(ev.name))
            if (_this.canPush(ev.instance).status == false || _this.checkIfBanned(ev.instance) == true) {
                //alert(ev.instance.constructor.name)
                _this.app.getRootNav().remove(undefined, undefined, CLEANUP_ANIMATE).then(function () {
                    _this.push(ev.instance.constructor, ev.data);
                });
            }
        });
    };
    Router.prototype.tokenHook = function () {
        var _this = this;
        if (this.tokenHookEnable == false)
            return;
        var pageConfig = this.getPageConfig(this.app.getRootNav().last().instance);
        if (pageConfig && pageConfig.reverse == true && pageConfig.tokens) {
            if (this.tokenListener)
                this.tokenListener.unsubscribe();
            this.tokenListener = this.token.subscribe(pageConfig.tokens, pageConfig.tokensLocation, function () {
                _this.next();
            }, function () {
            }, false);
        }
        else if (pageConfig && pageConfig.reverse != true && pageConfig.tokens) {
            if (this.tokenListener)
                this.tokenListener.unsubscribe();
            this.tokenListener = this.token.subscribe(pageConfig.tokens, pageConfig.tokensLocation, function () {
                if (pageConfig.popOnTokenInvalid == true) {
                    if (_this.app.getRootNav().canGoBack() == true)
                        _this.pop();
                    else {
                        for (var c in _this.config) {
                            if (_this.config[c].root == true) {
                                _this.push(_this.config[c].page, _this.config[c].params, _this.config[c].options, _this.config[c].done);
                                break;
                            }
                        }
                    }
                }
                else
                    _this.push(pageConfig.page, pageConfig.params, pageConfig.options, pageConfig.done);
            }, function () {
            }, true);
        }
        else if (this.tokenListener) {
            this.tokenListener.unsubscribe();
            this.tokenListener = null;
        }
    };
    Router.prototype.pushState = function (replace, delay) {
        if (replace === void 0) { replace = false; }
        //setTimeout(()=> {
        this.pushStateImmediate(replace);
        //}, 500)
    };
    Router.prototype.pushStateImmediate = function (replace) {
        if (replace === void 0) { replace = false; }
        var pageConfig = this.getPageConfig(this.app.getRootNav().last().instance), url = pageConfig;
        if (url)
            url = url.url;
        else
            url = '/' + pageConfig.id;
        //alert(url)
        if (this.utils.notNull(url) && url.substr(0, 1) != '/')
            url += '/';
        else if (!this.utils.notNull(url))
            url = '/' + this.app.getRootNav().last()['name'];
        //alert(url)
        //url = window.location.origin + window.location.pathname + window.location.search + '#' + url + this.utils.genUrlParams(this.app.getRootNav().last()['data'])
        var _params = this.utils.deepCopy(this.app.getRootNav().last()['data']);
        url = window.location.origin + window.location.pathname + '#' + this.utils.fillRestfulUrl(url, _params) + this.utils.genUrlParams(_params);
        //alert(url)
        if (replace == false)
            window.history.pushState({
                name: pageConfig ? pageConfig.id : this.app.getRootNav().last()['name'],
                params: this.app.getRootNav().last()['data'],
                url: url
            }, (pageConfig && this.utils.notNull(pageConfig.title)) ? pageConfig.title : pageConfig.id, url);
        else
            window.history.replaceState({
                name: pageConfig ? pageConfig.id : this.app.getRootNav().last()['name'],
                params: this.app.getRootNav().last()['data'],
                url: url
            }, (pageConfig && this.utils.notNull(pageConfig.title)) ? pageConfig.title : pageConfig.id, url);
        //alert(url)
        //alert(window.location.pathname == '/' ? '' : window.location.pathname)
    };
    Router.prototype.canPush = function (name) {
        var pageConfig = this.getPageConfig(name);
        if (!pageConfig) {
            if (typeof name != 'string') {
                return { status: true, code: -1, reason: 'Warning:router config missing' };
            }
            else {
                return { status: false, code: -2, reason: 'Error:can not find router config' };
            }
        }
        var needRedirect = false, isReversed = false;
        // 如果有前置需求的token
        if (pageConfig.tokens && pageConfig.tokens.length > 0) {
            if (this.token.has(pageConfig.tokens, pageConfig.tokensLocation) == true && pageConfig.reverse == true) {
                needRedirect = true;
                isReversed = true;
            }
            else if (this.token.has(pageConfig.tokens, pageConfig.tokensLocation) == false && (pageConfig.reverse != true || pageConfig.redirect))
                needRedirect = true;
        }
        if (needRedirect == true)
            if (isReversed == false)
                return {
                    status: false,
                    code: -3,
                    reason: 'Error:will be redirected to other view because of token check failure'
                };
            else
                return { status: false, code: -4, reason: 'Error:will be prevented because of token check failure' };
        else
            return { status: true, code: 0, reason: 'Info:ok to push' };
    };
    Router.prototype.push = function (name, params, options, done, nav) {
        var _this = this;
        if (options === void 0) { options = PUSH_ANIMATE; }
        if (typeof name == 'string' && name.indexOf('/') >= 0) {
            var _params = this.utils.getUrlParam(name), path = this.utils.getUrlPath('#' + name), found = false;
            //alert(JSON.stringify(params))
            for (var c in this.config) {
                if (this.utils.matchUrlPath(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + this.config[c].id), path) == true) {
                    name = this.config[c].page;
                    params = this.utils.mergeObject(_params, params);
                    found = true;
                    break;
                }
            }
            if (found == false) {
                for (var c in this.config) {
                    var _tmp = this.utils.matchUrlSchema(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + this.config[c].id), path);
                    if (_tmp['result'] == true) {
                        name = this.config[c].page;
                        params = this.utils.mergeObject(_tmp['restful'], _params, params);
                        found = true;
                        break;
                    }
                }
            }
        }
        if (this.checkIfBanned(name) == true)
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.PAGE_FORBIDDEN);
            });
        var lastView = this.app.getRootNav().last(), pageConfig = this.getPageConfig(lastView ? lastView.instance : null), toPage = this.getPageConfig(name), toClass = this.getPage(name);
        if (emiya_angular2_event_1.Event.emit('push', {
            fromPage: {
                view: lastView,
                name: pageConfig ? pageConfig.id : (lastView ? lastView['name'] : null),
                params: lastView ? lastView['data'] : null,
                component: lastView ? lastView['component'] : null
            },
            toPage: {
                component: toPage ? toPage.page : name,
                view: null,
                name: toPage ? toPage.id : null,
                params: toPage ? toPage.params : null
            },
            callParams: {
                name: name,
                params: toPage ? this.utils.mergeObject(params, toPage.params) : params,
                options: toPage ? this.utils.mergeObject(options, toPage.options, PUSH_ANIMATE) : this.utils.mergeObject(options, PUSH_ANIMATE),
                done: done,
                nav: nav
            },
            callerName: 'push',
            instance: this.push.bind(this),
            canPush: this.canPush(name)
        }).defaultPrevented == false) {
            if (!toClass) {
                this.debug('路由未指定');
                return new Promise(function (resolve, reject) {
                    reject(StatusCode_1.ROUTER_CONFIG_NOTFOUND_0);
                });
            }
            var orgOptions = this.utils.deepCopy(options);
            options = this.utils.mergeObject(options, PUSH_ANIMATE);
            if (!toPage) {
                if (toClass) {
                    this.nextPage = {
                        srcName: null,
                        srcPage: null,
                        name: null,
                        page: null,
                        params: null,
                        options: null,
                        done: null
                    };
                    return this.app.getRootNav().push(toClass, params, options).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        var removeCount = _this.cleanupPopStack();
                        _this.pushState();
                        removeCount = 0;
                        if (removeCount > 0) {
                            _this.disableOnpopstate();
                            window.history.go(-removeCount);
                        }
                        _this.tokenHook();
                        if (done)
                            try {
                                done(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                    })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        if (done)
                            try {
                                done(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                    });
                }
                else {
                    this.debug('路由 ' + name + ' 未配置');
                    return new Promise(function (resolve, reject) {
                        reject(StatusCode_1.ROUTER_CONFIG_NOTFOUND_1);
                    });
                }
            }
            //this.debug(name);
            var needRedirect = false, isReversed = false, isTokenReverse = false;
            // 如果有前置需求的token
            if (toPage.tokens && toPage.tokens.length > 0) {
                if (this.token.has(toPage.tokens, toPage.tokensLocation) == true && toPage.reverse == true) {
                    needRedirect = true;
                    isReversed = true;
                }
                else if (this.token.has(toPage.tokens, toPage.tokensLocation) == false && (toPage.reverse != true || toPage.redirect))
                    needRedirect = true;
                if (toPage.reverse == true)
                    isTokenReverse = true;
            }
            if (needRedirect) {
                if (isReversed == false) {
                    if (!toPage.redirect || !toPage.redirect.name) {
                        this.debug(name + ' 不满足token时的跳转页面未配置');
                        return new Promise(function (resolve, reject) {
                            reject(StatusCode_1.REDIRECT_CONFIG_NOTFOUND_0);
                        });
                    }
                    var redirectPage_1 = this.getPageConfig(toPage.redirect.name);
                    if (!redirectPage_1) {
                        this.debug(name + ' 不满足token时的跳转页面未配置2');
                        return new Promise(function (resolve, reject) {
                            reject(StatusCode_1.REDIRECT_CONFIG_NOTFOUND_1);
                        });
                    }
                    this.nextPage = {
                        srcName: pageConfig.id,
                        srcPage: pageConfig.page,
                        name: toPage.id,
                        page: toPage.page,
                        params: !params ? toPage.params : this.utils.mergeObject(params, toPage.params),
                        options: !orgOptions ? this.utils.mergeObject(this.utils.deepCopy(toPage.options), PUSH_ANIMATE) : this.utils.mergeObject(orgOptions, toPage.options, PUSH_ANIMATE),
                        done: !done ? toPage.done : function (data) {
                            if (toPage.done)
                                try {
                                    toPage.done(data);
                                }
                                catch (e) {
                                    _this.debug(e);
                                }
                            if (done)
                                done(data);
                        }
                    };
                    var _done_1 = !toPage.redirect.done ? redirectPage_1.done : function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        if (redirectPage_1.done)
                            try {
                                redirectPage_1.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                        if (toPage.redirect.done)
                            toPage.redirect.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                    };
                    //alert(JSON.stringify(this.utils.deepCopy(this.config[this.config[name].redirect.name] ? this.config[this.config[name].redirect.name].options : {})))
                    return this.app.getRootNav().push(redirectPage_1.page, !toPage.redirect.params ? redirectPage_1.params : this.utils.mergeObject(toPage.redirect.params, redirectPage_1.params), !toPage.redirect.options ? this.utils.mergeObject(this.utils.deepCopy(redirectPage_1 ? redirectPage_1.options : {}), PUSH_ANIMATE) : this.utils.mergeObject(this.utils.deepCopy(toPage.redirect.options), this.utils.mergeObject(this.utils.deepCopy(redirectPage_1 ? redirectPage_1.options : {}), PUSH_ANIMATE), PUSH_ANIMATE)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        var removeCount = _this.cleanupPopStack();
                        _this.pushState();
                        removeCount = 0;
                        if (removeCount > 0) {
                            _this.disableOnpopstate();
                            window.history.go(-removeCount);
                        }
                        _this.tokenHook();
                        if (_done_1)
                            try {
                                _done_1(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                    })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        if (_done_1)
                            try {
                                _done_1(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                    });
                }
                else {
                    this.debug(name + ' 不满足进入该页面所需条件');
                    return this.next();
                }
            }
            else {
                // if (isReversed == false)
                //   this.nextPage = {
                //     srcName: null,
                //     name: null,
                //     page: null,
                //     params: null,
                //     options: null,
                //     done: null,
                //   };
                if (isTokenReverse == true && !this.nextPage) {
                    this.nextPage = {
                        srcName: pageConfig.id,
                        srcPage: pageConfig.page,
                        name: undefined,
                        page: undefined,
                        params: undefined,
                        options: undefined,
                        done: undefined
                    };
                }
                //console.log(this.getPage(name))
                //alert(123)
                //alert(JSON.stringify(this.config[name] ? this.utils.mergeObject(options, this.config[name].options, PUSH_ANIMATE) : this.utils.mergeObject(options, PUSH_ANIMATE)))
                return this.app.getRootNav().push(toClass, toPage ? this.utils.mergeObject(params, toPage.params) : params, toPage ? this.utils.mergeObject(options, toPage.options, PUSH_ANIMATE) : this.utils.mergeObject(options, PUSH_ANIMATE)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    var removeCount = _this.cleanupPopStack();
                    _this.pushState();
                    removeCount = 0;
                    if (removeCount > 0) {
                        _this.disableOnpopstate();
                        window.history.go(-removeCount);
                    }
                    _this.tokenHook();
                    if (toPage && toPage.done)
                        try {
                            toPage.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (toPage && toPage.done)
                        try {
                            toPage.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
        }
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.EVENT_PREVENTED);
            });
        }
    };
    Router.prototype.returnErrorCode = function (code) {
        return new Promise(function (resolve, reject) {
            reject(code);
        });
    };
    Router.prototype.getGoBackPage = function () {
        var className, currentPageConfig = this.getPageConfig(this.app.getRootNav().last().instance);
        if ((this.app.getRootNav().canGoBack() == false && (!currentPageConfig || currentPageConfig.root != true)) || (currentPageConfig && currentPageConfig.pop && currentPageConfig.pop.name && currentPageConfig.pop.force == true)) {
            var popPage = void 0;
            if (currentPageConfig && currentPageConfig.pop && currentPageConfig.pop.name) {
                popPage = currentPageConfig.pop;
                popPage.id = popPage.name;
                popPage.page = this.getPage(currentPageConfig.pop.name);
            }
            else
                popPage = this.getRootPageConfig();
            return { name: popPage.id, params: popPage.params, component: popPage.page };
        }
        else if ((!currentPageConfig || currentPageConfig.root != true) && this.app.getRootNav().canGoBack() == true) {
            var lastPageConfig = this.getPageConfig(this.app.getRootNav().getPrevious(this.app.getRootNav().last()).instance);
            return {
                name: lastPageConfig ? lastPageConfig.id : this.app.getRootNav().getPrevious(this.app.getRootNav().last()).name,
                params: this.app.getRootNav().getPrevious(this.app.getRootNav().last()) ? this.app.getRootNav().getPrevious(this.app.getRootNav().last())['data'] : null,
                view: this.app.getRootNav().getPrevious(this.app.getRootNav().last()),
                component: this.app.getRootNav().getPrevious(this.app.getRootNav().last())['component']
            };
        }
        else {
            return { name: null, params: null, component: null };
        }
        //alert(JSON.stringify(this.utils.mergeObject(options, POP_ANIMATE)))
    };
    Router.prototype.getRootPageConfig = function () {
        for (var c in this.config)
            if (this.config[c].root = true)
                return this.config[c];
    };
    Router.prototype.pop = function (options, done, doNotGoHistory) {
        var _this = this;
        if (options === void 0) { options = POP_ANIMATE; }
        if (done === void 0) { done = null; }
        if (doNotGoHistory === void 0) { doNotGoHistory = false; }
        var popOptions = this.utils.mergeObject(options, POP_ANIMATE), lastPage = this.getGoBackPage(), currentPage = this.getPageConfig(this.app.getRootNav().last().instance);
        var event = {
            fromPage: {
                view: this.app.getRootNav().last(),
                name: currentPage ? currentPage.id : this.app.getRootNav().last()['name'],
                params: this.app.getRootNav().last()['data'],
                component: this.app.getRootNav().last()['component']
            },
            toPage: {
                component: lastPage.component,
                view: lastPage.view,
                name: lastPage.name,
                params: lastPage.params
            },
            callParams: {
                options: popOptions,
                done: done,
                doNotGoHistory: doNotGoHistory
            },
            callerName: 'pop',
            instance: this.pop.bind(this),
            canGoBack: this.app.getRootNav().canGoBack()
        };
        if (emiya_angular2_event_1.Event.emit('pop', event).defaultPrevented == false) {
            var className = void 0;
            if ((this.app.getRootNav().canGoBack() == false && (!currentPage || currentPage.root != true)) || (currentPage && currentPage.pop && currentPage.pop.name && currentPage.pop.force == true)) {
                //alert()
                var popPage = void 0;
                if (currentPage && currentPage.pop && currentPage.pop.name) {
                    popPage = currentPage.pop;
                    popPage.page = this.getPage(currentPage.pop.name);
                }
                else
                    popPage = this.getRootPageConfig();
                return this.app.getRootNav().push(popPage.page, popPage.params, this.utils.mergeObject(FAKE_POP_ANIMATION, popOptions)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    _this.tokenHook();
                    _this.cleanupPopStack(null, true);
                    _this.pushState(true);
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    //window.history.pushCurrentState()
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
            else if ((!currentPage || currentPage.root != true) && this.app.getRootNav().canGoBack() == true) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().getPrevious(this.app.getRootNav().last()).instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }
                return this.app.getRootNav().pop(popOptions).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    _this.tokenHook();
                    if (doNotGoHistory == false) {
                        _this.disableOnpopstate();
                        //window.history.go(-1)
                        _this.pushState(true);
                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    //window.history.pushCurrentState()
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
            else {
                if (!this.exitCallback || this.exitCallback(event) == true) {
                    //window.history.go(-history.length-1)
                    if (emiya_angular2_event_1.Event.emit('appWillExit', event).defaultPrevented == false) {
                        this.platform.exitApp();
                        //alert()
                        //window.location.href='about:blank'
                        //window.open('', '_self').close();
                        //this.pauseOnpopstate = true
                        this.pushState(true);
                        //alert(history.length)
                        // for (let c = 0; c <= history.length + 1; ++c) {
                        //   //this.disableOnpopstate()
                        //   history.go(-1)
                        //   //console.log(1)
                        // }
                        return new Promise(function (resolve, reject) {
                            //this.pauseOnpopstate = false
                            reject(StatusCode_1.APP_EXIT);
                        });
                    }
                    else
                        return new Promise(function (resolve, reject) {
                            reject(StatusCode_1.EXIT_APP_PREVENTED);
                        });
                }
                else {
                    return new Promise(function (resolve, reject) {
                        reject(StatusCode_1.EXIT_APP_PREVENTED);
                    });
                }
            }
        }
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.EVENT_PREVENTED);
            });
        }
    };
    Router.prototype.popSafe = function (options, done, doNotGoHistory) {
        if (options === void 0) { options = POP_ANIMATE; }
        if (done === void 0) { done = null; }
        if (doNotGoHistory === void 0) { doNotGoHistory = false; }
        if (this.app.getRootNav().isTransitioning(true) == false)
            return this.pop(options, done, doNotGoHistory);
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.OTHER_TRANSITION);
            });
        }
    };
    Router.prototype.popToRootPage = function (options, done) {
        var _this = this;
        if (options === void 0) { options = POP_ANIMATE; }
        if (done === void 0) { done = null; }
        var popOptions = this.utils.mergeObject(options, POP_ANIMATE);
        var firstPage = this.getPageConfig(this.app.getRootNav().first().instance), currentPage = this.getPageConfig(this.app.getRootNav().last().instance);
        var toPage, toPrams, toView, toComponent;
        if ((this.app.getRootNav().canGoBack() == true && (!firstPage || firstPage.root == true)) || (this.app.getRootNav().canGoBack() == false && firstPage && firstPage.root == true)) {
            toPage = firstPage.id;
            toPrams = this.app.getRootNav().first()['data'];
            toView = this.app.getRootNav().first();
            toComponent = this.app.getRootNav().first()['component'];
        }
        else {
            for (var c in this.config) {
                if (this.config[c].root == true) {
                    toPage = this.config[c].id;
                    toPrams = this.config[c].params;
                    toComponent = this.config[c].page;
                }
            }
        }
        if (emiya_angular2_event_1.Event.emit('pop', {
            fromPage: {
                view: this.app.getRootNav().last(),
                name: currentPage.id,
                params: this.app.getRootNav().last()['data'],
                component: this.app.getRootNav().last()['component']
            },
            toPage: {
                component: toComponent,
                view: toView,
                name: toPage,
                params: toPrams
            },
            callParams: {
                options: popOptions,
                done: done
            },
            callerName: 'popToRootPage',
            instance: this.popToRootPage.bind(this),
            canGoBack: this.app.getRootNav().canGoBack()
        }).defaultPrevented == false) {
            if ((this.app.getRootNav().canGoBack() == true && (!firstPage || firstPage.root == true)) || (this.app.getRootNav().canGoBack() == false && firstPage && firstPage.root == true)) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().first().instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }
                return this.app.getRootNav().popToRoot(popOptions).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    _this.tokenHook();
                    if ((_this.app.getRootNav().length() - 1) > 0) {
                        _this.disableOnpopstate();
                        //window.history.go(-(this.app.getRootNav().length() - 1))
                        _this.pushState(true);
                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    //window.history.pushCurrentState()
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
            else {
                for (var c in this.config) {
                    if (this.config[c].root == true) {
                        return this.app.getRootNav().push(this.config[c].page, this.config[c].params, this.utils.mergeObject(FAKE_POP_ANIMATION, popOptions)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                            _this.tokenHook();
                            _this.cleanupPopStack(null, true);
                            _this.pushState(true);
                            if (done)
                                try {
                                    done(hasCompleted, isAsync, enteringName, leavingName, direction);
                                }
                                catch (e) {
                                    _this.debug(e);
                                }
                            //window.history.pushCurrentState()
                        })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                            if (done)
                                try {
                                    done(hasCompleted, isAsync, enteringName, leavingName, direction);
                                }
                                catch (e) {
                                    _this.debug(e);
                                }
                        });
                    }
                }
                return new Promise(function (resolve, reject) {
                    reject(StatusCode_1.EVENT_PREVENTED);
                });
            }
        }
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.EVENT_PREVENTED);
            });
        }
    };
    Router.prototype.popToRoot = function (options, done) {
        var _this = this;
        if (options === void 0) { options = POP_ANIMATE; }
        if (done === void 0) { done = null; }
        var popOptions = this.utils.mergeObject(options, POP_ANIMATE), currentPage = this.getPageConfig(this.app.getRootNav().last().instance), firstPage = this.getPageConfig(this.app.getRootNav().first().instance);
        if (emiya_angular2_event_1.Event.emit('pop', {
            fromPage: {
                view: this.app.getRootNav().last(),
                name: currentPage.id,
                params: this.app.getRootNav().last()['data'],
                component: this.app.getRootNav().last()['component']
            },
            toPage: {
                component: this.app.getRootNav().first()['component'],
                view: this.app.getRootNav().first(),
                name: firstPage.id,
                params: this.app.getRootNav().first()['data']
            },
            callParams: {
                options: popOptions,
                done: done
            },
            callerName: 'popToRoot',
            instance: this.popToRoot.bind(this),
            canGoBack: this.app.getRootNav().canGoBack()
        }).defaultPrevented == false) {
            if (this.app.getRootNav().canGoBack() == true) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().first().instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }
                return this.app.getRootNav().popToRoot(popOptions).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    _this.tokenHook();
                    if ((_this.app.getRootNav().length() - 1) > 0) {
                        _this.disableOnpopstate();
                        //window.history.go(-(this.app.getRootNav().length() - 1))
                        _this.pushState(true);
                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                    //window.history.pushCurrentState()
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
        }
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.EVENT_PREVENTED);
            });
        }
    };
    Router.prototype.popTo = function (view, options, done) {
        var _this = this;
        if (options === void 0) { options = PUSH_ANIMATE; }
        if (done === void 0) { done = null; }
        var popOptions = this.utils.mergeObject(options, POP_ANIMATE), currentPage = this.getPageConfig(this.app.getRootNav().last().instance), viewPage = this.getPageConfig(view.instance);
        if (emiya_angular2_event_1.Event.emit('pop', {
            fromPage: {
                view: this.app.getRootNav().last(),
                name: currentPage.id,
                params: this.app.getRootNav().last()['data'],
                component: this.app.getRootNav().last()['component']
            },
            toPage: {
                component: view['component'],
                view: view,
                name: viewPage.id,
                params: view['data']
            },
            callParams: {
                view: view,
                options: popOptions,
                done: done
            },
            callerName: 'popTo',
            instance: this.popTo.bind(this),
            canGoBack: this.app.getRootNav().canGoBack()
        }).defaultPrevented == false) {
            if (this.app.getRootNav().canGoBack() == true && view) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && view.instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }
            }
            var c = 0;
            for (; c < this.app.getRootNav().length(); ++c) {
                if (this.app.getRootNav().getByIndex(c).instance === view.instance)
                    break;
            }
            var removeCount_1 = this.app.getRootNav().length() - 1 - c;
            return this.app.getRootNav().popTo(view, this.utils.mergeObject(options, POP_ANIMATE)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                _this.tokenHook();
                if (removeCount_1 > 0) {
                    _this.disableOnpopstate();
                    //window.history.go(-removeCount)
                    _this.pushState(true);
                }
                if (done)
                    try {
                        done(hasCompleted, isAsync, enteringName, leavingName, direction);
                    }
                    catch (e) {
                        _this.debug(e);
                    }
            })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                if (done)
                    try {
                        done(hasCompleted, isAsync, enteringName, leavingName, direction);
                    }
                    catch (e) {
                        _this.debug(e);
                    }
            });
        }
        else {
            return new Promise(function (resolve, reject) {
                reject(StatusCode_1.EVENT_PREVENTED);
            });
        }
    };
    Router.prototype.canGoBackWithPermission = function () {
        for (var c = this.app.getRootNav().length() - 2; c >= 0; --c) {
            var name_1 = this.getPageConfig(this.app.getRootNav().getByIndex(c).instance);
            if ((name_1 && name_1.reverse != true) || !name_1) {
                return true;
            }
        }
        return false;
    };
    Router.prototype.getBackViewWithPermission = function () {
        for (var c = this.app.getRootNav().length() - 2; c >= 0; --c) {
            var name_2 = this.getPageConfig(this.app.getRootNav().getByIndex(c).instance);
            if ((name_2 && name_2.reverse != true) || !name_2)
                return this.app.getRootNav().getByIndex(c);
        }
        return null;
    };
    Router.prototype.getNextPage = function () {
        var _this = this;
        var currentPage = this.getPageConfig(this.app.getRootNav().last().instance);
        //alert(this.app.getRootNav().last()['name'])
        if (this.nextPage && (!currentPage || !currentPage.next || (currentPage.next.force != true)) /*&& this.utils.notNull(this.nextPage.page)*/) {
            return this.utils.deepCopy(this.nextPage);
        }
        else {
            if (currentPage && currentPage.next) {
                var nextConfig_1 = this.getPageConfig(currentPage.next.name);
                var _done_2 = !currentPage.next.done ? (nextConfig_1 ? nextConfig_1.done : null) :
                    function (data) {
                        if ((nextConfig_1 ? nextConfig_1.done : null))
                            try {
                                (nextConfig_1 ? nextConfig_1.done : null)(data);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                        if (currentPage.next.done)
                            currentPage.next.done(data);
                    };
                return {
                    srcName: null,
                    srcPage: null,
                    name: currentPage.next.name,
                    page: this.getPage(currentPage.next.name),
                    params: !currentPage.next.params ? (nextConfig_1 ? nextConfig_1.params : null) : this.utils.mergeObject(currentPage.next.params, (nextConfig_1 ? nextConfig_1.params : null)),
                    options: !currentPage.next.options ? (nextConfig_1 ? this.utils.mergeObject(this.utils.deepCopy(nextConfig_1.options), PUSH_ANIMATE) : PUSH_ANIMATE) : this.utils.mergeObject(currentPage.next.options, (nextConfig_1 ? this.utils.mergeObject(this.utils.deepCopy(nextConfig_1.options), PUSH_ANIMATE) : PUSH_ANIMATE), PUSH_ANIMATE),
                    done: function (data) {
                        if (_done_2)
                            try {
                                _done_2(data);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                    }
                };
            }
            else {
                var _loop_1 = function (c) {
                    if (this_1.config[c].root == true) {
                        return { value: {
                                srcName: null,
                                srcPage: null,
                                name: this_1.config[c].id,
                                page: this_1.config[c].page,
                                params: this_1.config[c].params,
                                options: this_1.utils.mergeObject(this_1.utils.deepCopy(this_1.config[c].options), PUSH_ANIMATE),
                                done: function (data) {
                                    if (_this.config[c].done)
                                        try {
                                            _this.config[c].done(data);
                                        }
                                        catch (e) {
                                            _this.debug(e);
                                        }
                                }
                            } };
                    }
                };
                var this_1 = this;
                for (var c in this.config) {
                    var state_1 = _loop_1(c);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            }
        }
    };
    Router.prototype.next = function (config) {
        var _this = this;
        if (config === void 0) { config = null; }
        if (config) {
            if (!this.setNextPage(config))
                return new Promise(function (resolve, reject) {
                    reject(StatusCode_1.PAGE_FORBIDDEN);
                });
        }
        var _getNext = this.getNextPage();
        var lastView = this.app.getRootNav().last(), currentPage = this.getPageConfig(lastView ? lastView.instance : null);
        if (_getNext) {
            if (emiya_angular2_event_1.Event.emit('push', {
                fromPage: {
                    view: lastView,
                    name: currentPage ? currentPage.id : (lastView ? lastView['name'] : null),
                    params: lastView ? lastView['data'] : null,
                    component: lastView ? lastView['component'] : null
                },
                toPage: {
                    component: _getNext.page,
                    name: _getNext.name,
                    params: _getNext.params,
                    view: null
                },
                callParams: {
                    srcName: _getNext.srcName,
                    srcPage: _getNext.srcPage,
                    name: _getNext.name,
                    params: _getNext.params,
                    options: _getNext.options,
                    done: _getNext.done
                },
                callerName: 'next',
                instance: this.next.bind(this),
                canPush: this.canPush(_getNext.name)
            }).defaultPrevented != false)
                return new Promise(function (resolve, reject) {
                    reject(StatusCode_1.EVENT_PREVENTED);
                });
        }
        if (this.nextPage && (!currentPage || !currentPage.next || (currentPage.next.force != true)) /*&& this.utils.notNull(this.nextPage.page)*/) {
            var _nextPage_1 = this.nextPage;
            this.nextPage = null;
            //alert(JSON.stringify(this.nextPage))
            //alert(JSON.stringify(this.nextPage))
            //alert(_nextPage.page)
            if (_nextPage_1.page)
                return this.app.getRootNav().push(_nextPage_1.page, _nextPage_1.params, _nextPage_1.options).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    var removeCount = _this.cleanupPopStack(_nextPage_1.srcPage);
                    //alert(_nextPage.srcName)
                    _this.pushState();
                    removeCount = 0;
                    if (removeCount > 0) {
                        _this.disableOnpopstate();
                        window.history.go(-removeCount);
                    }
                    _this.tokenHook();
                    if (_nextPage_1.done)
                        try {
                            _nextPage_1.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (_nextPage_1.done)
                        try {
                            _nextPage_1.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            else {
                //alert(_nextPage.srcName)
                return this.popStack(_nextPage_1.srcPage).then(function () {
                    _this.pushState(true);
                    _this.tokenHook();
                });
            }
        }
        else {
            this.nextPage = null;
            if (currentPage && currentPage.next) {
                var nextConfig_2 = this.getPageConfig(currentPage.next.name);
                var _done_3 = !currentPage.next.done ? (nextConfig_2 ? nextConfig_2.done : null) :
                    function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                        if ((nextConfig_2 ? nextConfig_2.done : null))
                            try {
                                (nextConfig_2 ? nextConfig_2.done : null)(hasCompleted, isAsync, enteringName, leavingName, direction);
                            }
                            catch (e) {
                                _this.debug(e);
                            }
                        if (currentPage.next.done)
                            currentPage.next.done(hasCompleted, isAsync, enteringName, leavingName, direction);
                    };
                return this.app.getRootNav().push(this.getPage(currentPage.next.name), !nextConfig_2.next.params ? (nextConfig_2 ? nextConfig_2.params : null) : this.utils.mergeObject(currentPage.next.params, (nextConfig_2 ? nextConfig_2.params : null)), !nextConfig_2.next.options ? (nextConfig_2 ? this.utils.mergeObject(this.utils.deepCopy(nextConfig_2.options), PUSH_ANIMATE) : PUSH_ANIMATE) : this.utils.mergeObject(currentPage.next.options, (nextConfig_2 ? this.utils.mergeObject(this.utils.deepCopy(nextConfig_2.options), PUSH_ANIMATE) : PUSH_ANIMATE), PUSH_ANIMATE))
                    .then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    var removeCount = _this.cleanupPopStack();
                    _this.pushState();
                    removeCount = 0;
                    if (removeCount > 0) {
                        _this.disableOnpopstate();
                        window.history.go(-removeCount);
                    }
                    _this.tokenHook();
                    if (_done_3)
                        try {
                            _done_3(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                    if (_done_3)
                        try {
                            _done_3(hasCompleted, isAsync, enteringName, leavingName, direction);
                        }
                        catch (e) {
                            _this.debug(e);
                        }
                });
            }
            else {
                var _loop_2 = function (c) {
                    if (this_2.config[c].root == true) {
                        return { value: this_2.app.getRootNav().push(this_2.config[c].page, this_2.config[c].params, this_2.utils.mergeObject(this_2.utils.deepCopy(this_2.config[c].options), PUSH_ANIMATE)).then(function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                                _this.cleanupPopStack(undefined, true);
                                var removeCount = _this.cleanupPopStack();
                                _this.pushState();
                                removeCount = 0;
                                if (removeCount > 0) {
                                    _this.disableOnpopstate();
                                    window.history.go(-removeCount);
                                }
                                _this.tokenHook();
                                if (_this.config[c].done)
                                    try {
                                        _this.config[c].done(hasCompleted, isAsync, enteringName, leavingName, direction);
                                    }
                                    catch (e) {
                                        _this.debug(e);
                                    }
                            })["catch"](function (hasCompleted, isAsync, enteringName, leavingName, direction) {
                                if (_this.config[c].done)
                                    try {
                                        _this.config[c].done(hasCompleted, isAsync, enteringName, leavingName, direction);
                                    }
                                    catch (e) {
                                        _this.debug(e);
                                    }
                            }) };
                    }
                };
                var this_2 = this;
                for (var c in this.config) {
                    var state_2 = _loop_2(c);
                    if (typeof state_2 === "object")
                        return state_2.value;
                }
            }
        }
        return new Promise(function (resolve, reject) {
            reject(StatusCode_1.NO_NEXT_PAGE);
        });
    };
    Router.prototype.debug = function (arg1) {
        if (DEBUG) {
            console.debug(arg1);
        }
    };
    return Router;
}());
Router.decorators = [
    { type: core_1.Injectable },
];
Router.ctorParameters = [
    { type: ionic_angular_1.App },
    { type: ionic_angular_1.Platform },
];
Router = __decorate([
    core_1.Injectable()
], Router);
exports.Router = Router;
