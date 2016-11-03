/**
 * Created by ruimin on 16/9/19.
 */

'use strict';

import {App, Platform} from 'ionic-angular';
import {Injectable} from '@angular/core';
import {Token} from 'emiya-angular2-token'
import {Utils} from 'emiya-js-utils'
import {Event} from 'emiya-angular2-event'
import {
    EVENT_PREVENTED,
    OTHER_TRANSITION,
    EXIT_APP_PREVENTED,
    NO_NEXT_PAGE,
    PAGE_FORBIDDEN,
    ROUTER_CONFIG_NOTFOUND_0,
    ROUTER_CONFIG_NOTFOUND_1,
    REDIRECT_CONFIG_NOTFOUND_0,
    REDIRECT_CONFIG_NOTFOUND_1,
    APP_EXIT,
    PUSH_OVERRIDE
} from './StatusCode'

const DEBUG = true;
const PUSH_BASE_STATE = false
//const PUSH_ANIMATE = {animation: "md-transition"};
const PUSH_ANIMATE = {updateUrl: false};
const POP_ANIMATE = {updateUrl: false};
const CLEANUP_ANIMATE = {animate: false, duration: 0, updateUrl: false};
const FAKE_POP_ANIMATION = {direction: 'back', updateUrl: false}

interface NextPage {
    srcName: string,
    srcPage: any,
    name: string;
    page: any;
    params: any,
    options: any;
    done: Function,
}

@Injectable()
export class Router {
    private static decorators = [
        {type: Injectable},
    ];
    private static ctorParameters = [
        {type: App,},
        {type: Platform,},
    ];

    private token = Token
    private config;
    private banRouter;
    private nextPage: NextPage;
    private utils = Utils
    private tokenListener
    private ignorePopCount = 0
    private exitCallback
    public tokenHookEnable = true
    private backButtonCallback
    private pushStateParam = null
    private pauseOnpopstate = false
    private rootOverride = false
    private rootOverrideMonitor
    private appVersionSetByManul = false
    private packageName: any = ' ';
    private packageVersion: any = ' ';
    private defaultBackButtonPrior = 101

    constructor(private app: App, private platform: Platform) {
        this.enableOnpopstate()

        this.registerBackButtonAction()

        this.rootOverrideMonitor = this.app.viewWillEnter.subscribe((ev)=> {
            this.rootOverride = true
            this.rootOverrideMonitor.unsubscribe()
            this.rootOverrideMonitor = null
        })

        this.viewInterceptor()
    }

    private registerBackButtonAction(backButtonPrior = this.defaultBackButtonPrior) {
        if (this.backButtonCallback)
            this.backButtonCallback()
        this.backButtonCallback = this.platform.registerBackButtonAction(()=> {
            this.pop()
        }, this.utils.notNull(backButtonPrior) ? backButtonPrior : this.defaultBackButtonPrior)
    }

    private changeBackButtonPrior(prior) {
        if (this.utils.notNull(prior) || !this.backButtonCallback) {
            if (this.backButtonCallback) {
                this.backButtonCallback()
                this.backButtonCallback = null
            }
            this.registerBackButtonAction(prior)
        }
    }

    private loadRootPage() {
        return new Promise((resolve, reject)=> {


            //console.log(root)
            //console.log(this.platform.version())
            this.platform.ready().then(() => {
                let defaultP = new Promise((resolve, reject)=> {
                    resolve(' ')
                }), p0 = defaultP, p1 = defaultP;

                if (this.appVersionSetByManul == false && window['cordova'] && window['cordova'].getAppVersion) {
                    p0 = window['cordova'].getAppVersion.getVersionCode()
                    p1 = window['cordova'].getAppVersion.getPackageName()
                }

                let hander = (result, isPass = 0) => {

                    if (this.appVersionSetByManul == false && isPass == 0) {
                        this.packageName = result[1]
                        this.packageVersion = result[0]
                    }

                    let root = this.getRootPage()

                    if (this.rootOverride != false) {
                        reject(PUSH_OVERRIDE)
                        return
                    }
                    this.app.getRootNav().setRoot(root.page, root.params, root.options).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        //if (root.doNotReplaceState != true)
                        //console.log(this.app.getRootNav().last())
                        this.pushState(root.doNotReplaceState != true)
                        if (this.utils.notNull(root.duration)) {
                            let timer, monitor
                            timer = setTimeout(()=> {
                                if (monitor) {
                                    monitor.unsubscribe()
                                    monitor = null
                                }
                                timer = null
                                this.next()
                            }, root.duration)

                            //alert()

                            monitor = this.app.viewWillEnter.subscribe((ev)=> {
                                if (timer) {
                                    clearTimeout(timer)
                                    timer = null
                                }
                                monitor.unsubscribe()
                                monitor = null
                            })

                        }
                        if (root.done)
                            try {
                                root.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                        resolve(hasCompleted)
                    }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        if (root.done)
                            try {
                                root.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                        reject(hasCompleted)
                    })

                }

                Promise.all([p0, p1]).then((result)=> {
                    hander(result)
                }).catch((data)=> {
                    hander(null, 1)
                });

            }).catch((data)=>reject(data));
        })


        // setTimeout(()=>{
        //   this.app.getRootNav().push(root.page, root.params, root.options, root.done)
        // },4000)
    }

    public getRootPage() {
        //alert(this.utils.getUrlParam('?0=123&1=http://218.17.240.226:4012/group1/M00/00/14/rBEADVfRFAyAYzwyAAAMPb9q4kk633.jpg'))
        let params = this.utils.getUrlParam(window.location.href.indexOf('#') >= 0 ? window.location.hash : window.location.search), path = this.utils.getUrlPath(window.location.hash), target

        //alert(JSON.stringify(params))

        for (let c in this.config) {
            if (this.utils.matchUrlPath(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + c), path) == true) {
                target = this.utils.deepCopy(this.config[c])
                target.params = this.utils.mergeObject(params, target.params)
                target.doNotReplaceState = true
                //target.name = this.config[c].id
                //target.name=c
                //alert(JSON.stringify(target.params))
                break
            }
        }


        if (!target) {
            for (let c in this.config) {
                let _tmp = this.utils.matchUrlSchema(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + c), path)
                if (_tmp['result'] == true) {
                    target = this.utils.deepCopy(this.config[c])
                    target.params = this.utils.mergeObject(_tmp['restful'], params, target.params)
                    target.doNotReplaceState = true
                    //target.name = this.config[c].id
                    //target.name=c
                    //alert(JSON.stringify(target.params))
                    break
                }
            }
        }

        if (target && target.root != true) {
            window.localStorage.setItem(this.packageName, this.packageVersion)
            if (target.guide) {
                for (let d in this.config) {
                    if (this.config[d].root == true) {
                        this.nextPage = {
                            srcName: target.id,
                            srcPage: target.page,
                            name: this.config[d].id,
                            page: this.config[d].page,
                            params: this.config[d].params,
                            options: this.config[d].options,
                            done: this.config[d].done,
                        }
                        break
                    }
                }


                if (this.utils.notBlankStr(target.guide.duration) && target.guide.duration >= 0) {
                    target.duration = target.guide.duration
                    // setTimeout(()=> {
                    //   this.next()
                    // }, this.config[c].guide.duration)
                }
            }
            return target
        }


        for (let c in this.config) {
            if (this.config[c].guide) {
                //alert(JSON.stringify(this.config[c]))
                if (window.localStorage.getItem(this.packageName) != this.packageVersion || this.config[c].guide.always == true) {

                    window.localStorage.setItem(this.packageName, this.packageVersion)
                    for (let d in this.config) {
                        if (this.config[d].root == true) {
                            this.nextPage = {
                                srcName: this.config[c].id,
                                srcPage: this.config[c].page,
                                name: d,
                                page: this.config[d].page,
                                params: this.utils.mergeObject(params, this.config[d].params),
                                options: this.config[d].options,
                                done: this.config[d].done,
                            }
                            break
                        }
                    }

                    let _tmp = this.utils.deepCopy(this.config[c])

                    if (this.utils.notBlankStr(this.config[c].guide.duration) && this.config[c].guide.duration >= 0) {
                        _tmp.duration = this.config[c].guide.duration
                        // setTimeout(()=> {
                        //   this.next()
                        // }, this.config[c].guide.duration)
                    }

                    //let _page = this.utils.deepCopy(this.config[c]);
                    //_page.name=c

                    // if (target && target.name == _page.name) {
                    //   _page.params = this.utils.mergeObject(params, _page.params)
                    //   alert(JSON.stringify(_page.params))
                    // }

                    return _tmp
                }
            }
        }

        for (let c in this.config) {

            if (this.config[c].root == true) {
                window.localStorage.setItem(this.packageName, this.packageVersion)
                let _page = this.utils.deepCopy(this.config[c]);
                _page.params = this.utils.mergeObject(params, _page.params)
                _page.doNotReplaceState = (target != null)
                //alert(JSON.stringify(target))
                return _page
            }
        }

    }

    private enableOnpopstate() {
        window.onpopstate = ()=> {
            if (this.pauseOnpopstate == true)
                return
            if (this.ignorePopCount > 0)
                --this.ignorePopCount
            else {
                this.pop(null, null, true).catch((err)=> {
                    this.debug(err)
                })
            }
        }
    }

    private unlistenOnpopstate() {
        window.onpopstate = null
    }

    private disableOnpopstate() {
        ++this.ignorePopCount
    }

    public setVersion(name: string, increment: number) {
        this.packageName = name;
        this.packageVersion = increment;
        this.appVersionSetByManul = true
    }

    public load(config) {
        this.config = []
        this.banRouter = []
        config = this.utils.deepCopy(config)
        let _config = []
        for (let c in config) {
            config[c].id = c
            _config.push(config[c]);
        }
        config = _config
        for (let c in config) {
            if (config[c].enable != false)
                this.config.push(this.utils.deepCopy(config[c]))
            else
                this.banRouter.push(this.utils.deepCopy(config[c]))
        }
        console.log(this.config)
        //this.config = config;
        this.loadRootPage()
    }

    public getBannedPageConfig(name) {
        for (let c in this.banRouter) {
            if ((typeof name == 'string' && this.banRouter[c].id == name) || (name instanceof this.banRouter[c].page) || name === this.banRouter[c].page)
                return this.banRouter[c]
        }
    }

    public checkIfBanned(name) {
        return !(!this.getBannedPageConfig(name))
    }

    public setExitHook(cb, prior) {
        this.exitCallback = cb
        this.changeBackButtonPrior(prior)
    }

    private getPage(name) {
        for (let c in this.config) {
            if ((typeof name == 'string' && this.config[c].id == name) || (name instanceof this.config[c].page) || name === this.config[c].page)
                return this.config[c].page
        }
        if (typeof name != 'string')
            return name
    }

    public getPageConfig(name) {
        for (let c in this.config) {
            if ((typeof name == 'string' && this.config[c].id == name) || (name instanceof this.config[c].page) || name === this.config[c].page)
                return this.config[c]
        }
    }

    public setNextPage(_config) {
        if (this.checkIfBanned(_config.name) != true && this.checkIfBanned(_config.page) != true) {
            this.config = this.utils.deepCopy(_config)
            return true
        }
        return false
    }

    private cleanupPopStack(srcPage = null, cleanAll = false) {

        let currentConfig = this.getPageConfig(this.app.getRootNav().last().instance)

        if (currentConfig && currentConfig.root == true)
            cleanAll = true

        if (cleanAll != true) {
            let start = -1, nav = this.app.getRootNav(), length = nav.length();
            for (let c = 0; c < length - 1; ++c) {
                if (nav.getByIndex(c).instance instanceof currentConfig.page) {
                    start = c
                    break
                }
            }
            //console.log(start)
            if (start >= 0) {
                //alert(0)
                nav.remove(start, length - start - 1, CLEANUP_ANIMATE)
                return length - start - 1
            }
            else if (this.utils.notNull(srcPage)) {
                start = -1
                for (let c = 0; c < length - 1; ++c) {
                    if (nav.getByIndex(c).instance instanceof srcPage) {
                        start = c
                        break
                    }
                }
                if (start >= 0) {
                    //alert(start+"/"+(length - start - 2))

                    nav.remove(start + 1, length - start - 2, CLEANUP_ANIMATE)
                    return length - start - 2
                }
            }
        } else {
            //alert(srcName)
            //alert(2)
            this.app.getRootNav().remove(0, this.app.getRootNav().length() - 1, CLEANUP_ANIMATE)
            return this.app.getRootNav().length() - 1
        }
        return 0
    }

    private popStack(srcPage = null) {

        let start = -1, nav = this.app.getRootNav(), length = nav.length();
        for (let c = 0; c < length - 1; ++c) {
            if (nav.getByIndex(c).instance instanceof srcPage) {
                start = c
                break
            }
        }
        if (start >= 0) {
            //alert(start+"/"+(length - start - 2))

            return nav.remove(start + 1, length - start - 1, CLEANUP_ANIMATE)
        }
        return new Promise((resolve, reject)=> {
            resolve(0)
        })
    }

    private viewInterceptor() {
        this.app.viewWillEnter.subscribe((ev)=> {
            //console.log(123, ev)
            //console.log(ev)

            //if (this.getPageConfig(ev.name))
            if (this.canPush(ev.instance).status == false || this.checkIfBanned(ev.instance) == true) {
                //alert(ev.instance.constructor.name)
                this.app.getRootNav().remove(undefined, undefined, CLEANUP_ANIMATE).then(()=> {
                    this.push(ev.instance.constructor, ev.data)
                });
                // setTimeout(()=> {
                //   this.push(ev.instance.constructor, ev.data)
                // })
            }
        })
    }

    private tokenHook() {
        if (this.tokenHookEnable == false)
            return
        let pageConfig = this.getPageConfig(this.app.getRootNav().last().instance)
        if (pageConfig && pageConfig.reverse == true && pageConfig.tokens) {

            if (this.tokenListener)
                this.tokenListener.unsubscribe();
            this.tokenListener = this.token.subscribe(pageConfig.tokens, pageConfig.tokensLocation, ()=> {
                this.next()
            }, ()=> {
            }, false)
            //alert()
        } else if (pageConfig && pageConfig.reverse != true && pageConfig.tokens) {
            if (this.tokenListener)
                this.tokenListener.unsubscribe();
            this.tokenListener = this.token.subscribe(pageConfig.tokens, pageConfig.tokensLocation, ()=> {
                if (pageConfig.popOnTokenInvalid == true) {
                    if (this.app.getRootNav().canGoBack() == true)
                        this.pop()
                    else {
                        for (let c in this.config) {
                            if (this.config[c].root == true) {
                                this.push(this.config[c].page, this.config[c].params, this.config[c].options, this.config[c].done)
                                break
                            }
                        }
                    }
                }
                else
                    this.push(pageConfig.page, pageConfig.params, pageConfig.options, pageConfig.done)
            }, ()=> {
            }, true)
        } else if (this.tokenListener) {
            this.tokenListener.unsubscribe();
            this.tokenListener = null
        }
    }

    private pushState(replace = false, delay?) {
        //setTimeout(()=> {
        this.pushStateImmediate(replace)
        //}, 500)
    }

    private pushStateImmediate(replace = false) {
        let pageConfig = this.getPageConfig(this.app.getRootNav().last().instance), url = pageConfig


        if (url)
            url = url.url
        else
            url = '/' + this.app.getRootNav().last()['name']
        //alert(url)
        if (this.utils.notNull(url) && url.substr(0, 1) != '/')
            url += '/'
        else if (!this.utils.notNull(url))
            url = '/' + this.app.getRootNav().last()['name']
        //alert(url)
        //url = window.location.origin + window.location.pathname + window.location.search + '#' + url + this.utils.genUrlParams(this.app.getRootNav().last()['data'])
        let _params = this.utils.deepCopy(this.app.getRootNav().last()['data'])
        url = window.location.origin + window.location.pathname + '#' + this.utils.fillRestfulUrl(url, _params) + this.utils.genUrlParams(_params)
        //alert(url)
        if (replace == false)
            window.history.pushState({
                name: pageConfig ? pageConfig.id : this.app.getRootNav().last()['name'],
                params: this.app.getRootNav().last()['data'],
                url: url
            }, (pageConfig && this.utils.notNull(pageConfig.title)) ? pageConfig.title : this.app.getRootNav().last()['name'], url)
        else
            window.history.replaceState({
                name: pageConfig ? pageConfig.id : this.app.getRootNav().last()['name'],
                params: this.app.getRootNav().last()['data'],
                url: url
            }, (pageConfig && this.utils.notNull(pageConfig.title)) ? pageConfig.title : this.app.getRootNav().last()['name'], url)
        //alert(url)
        //alert(window.location.pathname == '/' ? '' : window.location.pathname)
    }

    public canPush(name) {
        let pageConfig = this.getPageConfig(name)
        if (!pageConfig) {
            if (typeof name != 'string') {
                return {status: true, code: -1, reason: 'Warning:router config missing'}
            } else {
                return {status: false, code: -2, reason: 'Error:can not find router config'};
            }
        }

        let needRedirect = false, isReversed = false;
        // 如果有前置需求的token
        if (pageConfig.tokens && pageConfig.tokens.length > 0) {
            if (this.token.has(pageConfig.tokens, pageConfig.tokensLocation) == true && pageConfig.reverse == true) {
                needRedirect = true;
                isReversed = true;
            } else if (this.token.has(pageConfig.tokens, pageConfig.tokensLocation) == false && (pageConfig.reverse != true || pageConfig.redirect))
                needRedirect = true;
        }

        if (needRedirect == true)
            if (isReversed == false)
                return {
                    status: false,
                    code: -3,
                    reason: 'Error:will be redirected to other view because of token check failure'
                }
            else
                return {status: false, code: -4, reason: 'Error:will be prevented because of token check failure'}
        else
            return {status: true, code: 0, reason: 'Info:ok to push'}

    }

    public push(name: any, params?: any, options: any = PUSH_ANIMATE, done?: Function, nav?): Promise<any> {
        if (typeof name == 'string' && name.indexOf('/') >= 0) {
            let _params = this.utils.getUrlParam(name), path = this.utils.getUrlPath('#' + name), found = false

            //alert(JSON.stringify(params))

            for (let c in this.config) {
                if (this.utils.matchUrlPath(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + this.config[c].id), path) == true) {
                    name = this.config[c].page
                    params = this.utils.mergeObject(_params, params)
                    found = true
                    break
                }
            }


            if (found == false) {
                for (let c in this.config) {
                    let _tmp = this.utils.matchUrlSchema(this.utils.notNull(this.config[c].url) ? this.config[c].url : ('/' + this.config[c].id), path)
                    if (_tmp['result'] == true) {
                        name = this.config[c].page
                        params = this.utils.mergeObject(_tmp['restful'], _params, params)
                        found = true
                        break
                    }
                }
            }
        }


        if (this.checkIfBanned(name) == true)
            return new Promise((resolve, reject)=> {
                reject(PAGE_FORBIDDEN)
            })


        let lastView = this.app.getRootNav().last(), pageConfig = this.getPageConfig(lastView ? lastView.instance : null), toPage = this.getPageConfig(name), toClass = this.getPage(name)

        if (Event.emit('push', {
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
                return new Promise((resolve, reject)=> {
                    reject(ROUTER_CONFIG_NOTFOUND_0)
                })
            }
            let orgOptions = this.utils.deepCopy(options)
            options = this.utils.mergeObject(options, PUSH_ANIMATE)
            if (!toPage) {
                if (toClass) {
                    this.nextPage = {
                        srcName: null,
                        srcPage: null,
                        name: null,
                        page: null,
                        params: null,
                        options: null,
                        done: null,
                    }

                    return this.app.getRootNav().push(toClass, params, options).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        let removeCount = this.cleanupPopStack()
                        this.pushState()
                        removeCount = 0
                        if (removeCount > 0) {
                            this.disableOnpopstate()
                            window.history.go(-removeCount)
                            // setTimeout(()=> {
                            //   this.enableOnpopstate()
                            // })
                        }
                        this.tokenHook()
                        if (done)
                            try {
                                done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        if (done)
                            try {
                                done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    });
                } else {
                    this.debug('路由 ' + name + ' 未配置');
                    return new Promise((resolve, reject)=> {
                        reject(ROUTER_CONFIG_NOTFOUND_1)
                    })
                }
            }

            //this.debug(name);
            let needRedirect = false, isReversed = false, isTokenReverse = false;
            // 如果有前置需求的token
            if (toPage.tokens && toPage.tokens.length > 0) {
                if (this.token.has(toPage.tokens, toPage.tokensLocation) == true && toPage.reverse == true) {
                    needRedirect = true;
                    isReversed = true;
                } else if (this.token.has(toPage.tokens, toPage.tokensLocation) == false && (toPage.reverse != true || toPage.redirect))
                    needRedirect = true;

                if (toPage.reverse == true)
                    isTokenReverse = true
            }

            if (needRedirect) {

                if (isReversed == false) {
                    if (!toPage.redirect || !toPage.redirect.name) {
                        this.debug(name + ' 不满足token时的跳转页面未配置');
                        return new Promise((resolve, reject)=> {
                            reject(REDIRECT_CONFIG_NOTFOUND_0)
                        })
                    }

                    let redirectPage = this.getPageConfig(toPage.redirect.name)

                    if (!redirectPage) {
                        this.debug(name + ' 不满足token时的跳转页面未配置2');
                        return new Promise((resolve, reject)=> {
                            reject(REDIRECT_CONFIG_NOTFOUND_1)
                        })
                    }

                    this.nextPage = {
                        srcName: pageConfig.id,
                        srcPage: pageConfig.page,
                        name: toPage.id,
                        page: toPage.page,
                        params: !params ? toPage.params : this.utils.mergeObject(params, toPage.params),
                        options: !orgOptions ? this.utils.mergeObject(this.utils.deepCopy(toPage.options), PUSH_ANIMATE) : this.utils.mergeObject(orgOptions, toPage.options, PUSH_ANIMATE),
                        done: !done ? toPage.done : (data)=> {
                            if (toPage.done)
                                try {
                                    toPage.done(data)
                                } catch (e) {
                                    this.debug(e)
                                }
                            if (done)
                                done(data)
                        },
                    };

                    let _done = !toPage.redirect.done ? redirectPage.done : (hasCompleted, isAsync, enteringName, leavingName, direction)=> {
                        if (redirectPage.done)
                            try {
                                redirectPage.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                        if (toPage.redirect.done)
                            toPage.redirect.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                    }
                    //alert(JSON.stringify(this.utils.deepCopy(this.config[this.config[name].redirect.name] ? this.config[this.config[name].redirect.name].options : {})))
                    return this.app.getRootNav().push(redirectPage.page,
                        !toPage.redirect.params ? redirectPage.params : this.utils.mergeObject(toPage.redirect.params, redirectPage.params),
                        !toPage.redirect.options ? this.utils.mergeObject(this.utils.deepCopy(redirectPage ? redirectPage.options : {}), PUSH_ANIMATE) : this.utils.mergeObject(this.utils.deepCopy(toPage.redirect.options), this.utils.mergeObject(this.utils.deepCopy(redirectPage ? redirectPage.options : {}), PUSH_ANIMATE), PUSH_ANIMATE)
                    ).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        let removeCount = this.cleanupPopStack()
                        this.pushState()
                        removeCount = 0
                        if (removeCount > 0) {
                            this.disableOnpopstate()
                            window.history.go(-removeCount)
                            // setTimeout(()=> {
                            //   this.enableOnpopstate()
                            // })
                        }
                        this.tokenHook()
                        if (_done)
                            try {
                                _done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        if (_done)
                            try {
                                _done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    });

                } else {
                    this.debug(name + ' 不满足进入该页面所需条件');
                    return this.next()
                    // return new Promise((resolve, reject)=> {
                    //   reject(-290)
                    // })
                }

            } else {

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
                        done: undefined,
                    };
                    //alert(JSON.stringify(this.nextPage))
                }
                //console.log(this.getPage(name))
                //alert(123)
                //alert(JSON.stringify(this.config[name] ? this.utils.mergeObject(options, this.config[name].options, PUSH_ANIMATE) : this.utils.mergeObject(options, PUSH_ANIMATE)))
                return this.app.getRootNav().push(toClass,
                    toPage ? this.utils.mergeObject(params, toPage.params) : params,
                    toPage ? this.utils.mergeObject(options, toPage.options, PUSH_ANIMATE) : this.utils.mergeObject(options, PUSH_ANIMATE)).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    let removeCount = this.cleanupPopStack()
                    this.pushState()
                    removeCount = 0
                    if (removeCount > 0) {
                        this.disableOnpopstate()
                        window.history.go(-removeCount)
                        // setTimeout(()=> {
                        //   this.enableOnpopstate()
                        // })
                    }
                    this.tokenHook()
                    if (toPage && toPage.done)
                        try {
                            toPage.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (toPage && toPage.done)
                        try {
                            toPage.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                })

            }
        } else {
            return new Promise((resolve, reject)=> {
                reject(EVENT_PREVENTED)
            })
        }
    }

    private returnErrorCode(code) {
        return new Promise((resolve, reject)=> {
            reject(code)
        })
    }

    public getGoBackPage(): any {
        let className, currentPageConfig = this.getPageConfig(this.app.getRootNav().last().instance)

        if ((this.app.getRootNav().canGoBack() == false && (!currentPageConfig || currentPageConfig.root != true)) || (currentPageConfig && currentPageConfig.pop && currentPageConfig.pop.name && currentPageConfig.pop.force == true)) {

            let popPage;
            if (currentPageConfig && currentPageConfig.pop && currentPageConfig.pop.name) {
                popPage = currentPageConfig.pop
                popPage.id = popPage.name
                popPage.page = this.getPage(currentPageConfig.pop.name)
            }
            else
                popPage = this.getRootPageConfig()
            return {name: popPage.id, params: popPage.params, component: popPage.page}
        }
        else if ((!currentPageConfig || currentPageConfig.root != true) && this.app.getRootNav().canGoBack() == true) {

            let lastPageConfig = this.getPageConfig(this.app.getRootNav().getPrevious(this.app.getRootNav().last()).instance)

            return {
                name: lastPageConfig ? lastPageConfig.id : this.app.getRootNav().getPrevious(this.app.getRootNav().last()).name,
                params: this.app.getRootNav().getPrevious(this.app.getRootNav().last()) ? this.app.getRootNav().getPrevious(this.app.getRootNav().last())['data'] : null,
                view: this.app.getRootNav().getPrevious(this.app.getRootNav().last()),
                component: this.app.getRootNav().getPrevious(this.app.getRootNav().last())['component']
            }
        }
        else {
            return {name: null, params: null, component: null}
        }
        //alert(JSON.stringify(this.utils.mergeObject(options, POP_ANIMATE)))
    }

    public canGoBack=()=> {
        return this.getGoBackPage().name != null
    }

    public getRootPageConfig() {
        for (let c in this.config)
            if (this.config[c].root = true)
                return this.config[c]
    }

    public pop(options: any = POP_ANIMATE, done: Function = null, doNotGoHistory = false): Promise<any> {
        let popOptions = this.utils.mergeObject(options, POP_ANIMATE), lastPage = this.getGoBackPage(), currentPage = this.getPageConfig(this.app.getRootNav().last().instance)
        let event = {
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
        }
        if (Event.emit('pop', event).defaultPrevented == false) {
            let className


            if ((this.app.getRootNav().canGoBack() == false && (!currentPage || currentPage.root != true)) || (currentPage && currentPage.pop && currentPage.pop.name && currentPage.pop.force == true)) {
                //alert()
                let popPage;
                if (currentPage && currentPage.pop && currentPage.pop.name) {
                    popPage = currentPage.pop
                    popPage.page = this.getPage(currentPage.pop.name)
                }
                else
                    popPage = this.getRootPageConfig()
                return this.app.getRootNav().push(popPage.page, popPage.params, FAKE_POP_ANIMATION).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    this.tokenHook()
                    this.cleanupPopStack(null, true)
                    this.pushState(true)
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    //window.history.pushCurrentState()
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                });
            }
            else if ((!currentPage || currentPage.root != true) && this.app.getRootNav().canGoBack() == true) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().getPrevious(this.app.getRootNav().last()).instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }

                return this.app.getRootNav().pop(popOptions).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    this.tokenHook()
                    if (doNotGoHistory == false) {
                        this.disableOnpopstate()
                        //window.history.go(-1)
                        this.pushState(true)
                        // setTimeout(()=> {
                        //   this.enableOnpopstate()
                        // })

                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    //window.history.pushCurrentState()
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                });

            }
            else {
                if (!this.exitCallback || this.exitCallback(event) == true) {
                    //window.history.go(-history.length-1)

                    this.platform.exitApp()
                    //alert()
                    //window.location.href='about:blank'
                    //window.open('', '_self').close();
                    //this.pauseOnpopstate = true
                    this.pushState(true)
                    //alert(history.length)
                    // for (let c = 0; c <= history.length + 1; ++c) {
                    //   //this.disableOnpopstate()
                    //   history.go(-1)
                    //   //console.log(1)
                    // }

                    return new Promise((resolve, reject)=> {
                        //this.pauseOnpopstate = false
                        reject(APP_EXIT)
                    })
                } else {
                    return new Promise((resolve, reject)=> {
                        reject(EXIT_APP_PREVENTED)
                    })
                }
            }
            //alert(JSON.stringify(this.utils.mergeObject(options, POP_ANIMATE)))


        }
        else {
            return new Promise((resolve, reject)=> {
                reject(EVENT_PREVENTED)
            })
        }

    }

    public popSafe(options: any = POP_ANIMATE, done: Function = null, doNotGoHistory = false): Promise<any> {
        if (this.app.getRootNav().isTransitioning(true) == false)
            return this.pop(options, done, doNotGoHistory)
        else {
            return new Promise((resolve, reject)=> {
                reject(OTHER_TRANSITION)
            })
        }
    }

    public popToRootPage(options: any = POP_ANIMATE, done: Function = null): Promise < any > {
        let popOptions = this.utils.mergeObject(options, POP_ANIMATE)
        let firstPage = this.getPageConfig(this.app.getRootNav().first().instance), currentPage = this.getPageConfig(this.app.getRootNav().last().instance)
        let toPage, toPrams, toView, toComponent;
        if ((this.app.getRootNav().canGoBack() == true && (!firstPage || firstPage.root == true)) || (this.app.getRootNav().canGoBack() == false && firstPage && firstPage.root == true)) {
            toPage = firstPage.id
            toPrams = this.app.getRootNav().first()['data']
            toView = this.app.getRootNav().first()
            toComponent = this.app.getRootNav().first()['component']
        } else {
            for (let c in this.config) {
                if (this.config[c].root == true) {
                    toPage = this.config[c].id
                    toPrams = this.config[c].params
                    toComponent = this.config[c].page
                }
            }
        }
        if (Event.emit('pop', {
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
            }).defaultPrevented == false
        ) {
            if ((this.app.getRootNav().canGoBack() == true && (!firstPage || firstPage.root == true)) || (this.app.getRootNav().canGoBack() == false && firstPage && firstPage.root == true)) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().first().instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }

                return this.app.getRootNav().popToRoot(popOptions).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    this.tokenHook()
                    if ((this.app.getRootNav().length() - 1) > 0) {
                        this.disableOnpopstate()
                        //window.history.go(-(this.app.getRootNav().length() - 1))
                        this.pushState(true)
                        //this.enableOnpopstate()
                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    //window.history.pushCurrentState()
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                });

            } else {
                for (let c in this.config) {
                    if (this.config[c].root == true) {
                        return this.app.getRootNav().push(this.config[c].page, this.config[c].params, FAKE_POP_ANIMATION).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                            this.tokenHook()
                            this.cleanupPopStack(null, true)
                            this.pushState(true)
                            if (done)
                                try {
                                    done(hasCompleted, isAsync, enteringName, leavingName, direction)
                                } catch (e) {
                                    this.debug(e)
                                }
                            //window.history.pushCurrentState()
                        }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                            if (done)
                                try {
                                    done(hasCompleted, isAsync, enteringName, leavingName, direction)
                                } catch (e) {
                                    this.debug(e)
                                }
                        });
                    }
                }

                return new Promise((resolve, reject)=> {
                    reject(EVENT_PREVENTED)
                })

            }


        }
        else {
            return new Promise((resolve, reject)=> {
                reject(EVENT_PREVENTED)
            })
        }
    }

    public popToRoot(options: any = POP_ANIMATE, done: Function = null): Promise < any > {
        let popOptions = this.utils.mergeObject(options, POP_ANIMATE), currentPage = this.getPageConfig(this.app.getRootNav().last().instance), firstPage = this.getPageConfig(this.app.getRootNav().first().instance)
        if (Event.emit('pop', {
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
            }).defaultPrevented == false
        ) {
            if (this.app.getRootNav().canGoBack() == true) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && this.app.getRootNav().first().instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }

                return this.app.getRootNav().popToRoot(popOptions).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    this.tokenHook()
                    if ((this.app.getRootNav().length() - 1) > 0) {
                        this.disableOnpopstate()
                        //window.history.go(-(this.app.getRootNav().length() - 1))
                        this.pushState(true)
                        //this.enableOnpopstate()
                    }
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                    //window.history.pushCurrentState()
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (done)
                        try {
                            done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                });

            }


        }
        else {
            return new Promise((resolve, reject)=> {
                reject(EVENT_PREVENTED)
            })
        }
    }

    public popTo(view: any, options: any = PUSH_ANIMATE, done: Function = null): Promise < any > {
        let popOptions = this.utils.mergeObject(options, POP_ANIMATE), currentPage = this.getPageConfig(this.app.getRootNav().last().instance), viewPage = this.getPageConfig(view.instance)
        if (Event.emit('pop', {
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
            }).defaultPrevented == false
        ) {
            if (this.app.getRootNav().canGoBack() == true && view) {
                if (this.nextPage && this.utils.notNull(this.nextPage.srcPage) && view.instance instanceof this.nextPage.srcPage) {
                    this.nextPage = null;
                }
            }
            let c = 0
            for (; c < this.app.getRootNav().length(); ++c) {
                if (this.app.getRootNav().getByIndex(c).instance === view.instance)
                    break
            }

            let removeCount = this.app.getRootNav().length() - 1 - c

            return this.app.getRootNav().popTo(view, this.utils.mergeObject(options, POP_ANIMATE)).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                this.tokenHook()
                if (removeCount > 0) {
                    this.disableOnpopstate()
                    //window.history.go(-removeCount)
                    this.pushState(true)
                    //this.enableOnpopstate()
                }
                if (done)
                    try {
                        done(hasCompleted, isAsync, enteringName, leavingName, direction)
                    } catch (e) {
                        this.debug(e)
                    }
            }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                if (done)
                    try {
                        done(hasCompleted, isAsync, enteringName, leavingName, direction)
                    } catch (e) {
                        this.debug(e)
                    }
            });
        }
        else {
            return new Promise((resolve, reject)=> {
                reject(EVENT_PREVENTED)
            })
        }
    }

    private canGoBackWithPermission() {

        for (let c = this.app.getRootNav().length() - 2; c >= 0; --c) {
            let name = this.getPageConfig(this.app.getRootNav().getByIndex(c).instance)
            if ((name && name.reverse != true) || !name) {
                return true
            }
        }

        return false
    }

    private getBackViewWithPermission() {
        for (let c = this.app.getRootNav().length() - 2; c >= 0; --c) {
            let name = this.getPageConfig(this.app.getRootNav().getByIndex(c).instance)
            if ((name && name.reverse != true) || !name)
                return this.app.getRootNav().getByIndex(c)
        }

        return null
    }

    public getNextPage() {
        let currentPage = this.getPageConfig(this.app.getRootNav().last().instance)
        //alert(this.app.getRootNav().last()['name'])
        if (this.nextPage && (!currentPage || !currentPage.next || (currentPage.next.force != true))/*&& this.utils.notNull(this.nextPage.page)*/) {
            return this.utils.deepCopy(this.nextPage)
        } else {
            if (currentPage && currentPage.next) {
                let nextConfig = this.getPageConfig(currentPage.next.name)
                let _done = !currentPage.next.done ? (nextConfig ? nextConfig.done : null) :
                    (data)=> {
                        if ((nextConfig ? nextConfig.done : null))
                            try {
                                (nextConfig ? nextConfig.done : null)(data)
                            } catch (e) {
                                this.debug(e)
                            }
                        if (currentPage.next.done)
                            currentPage.next.done(data)
                    }
                return {
                    srcName: null,
                    srcPage: null,
                    name: currentPage.next.name,
                    page: this.getPage(currentPage.next.name),
                    params: !currentPage.next.params ? (nextConfig ? nextConfig.params : null) : this.utils.mergeObject(currentPage.next.params, (nextConfig ? nextConfig.params : null)),
                    options: !currentPage.next.options ? (nextConfig ? this.utils.mergeObject(this.utils.deepCopy(nextConfig.options), PUSH_ANIMATE) : PUSH_ANIMATE) : this.utils.mergeObject(currentPage.next.options, (nextConfig ? this.utils.mergeObject(this.utils.deepCopy(nextConfig.options), PUSH_ANIMATE) : PUSH_ANIMATE), PUSH_ANIMATE),
                    done: (data)=> {
                        if (_done)
                            try {
                                _done(data)
                            } catch (e) {
                                this.debug(e)
                            }
                    },
                }
            }
            else {
                for (let c in this.config) {
                    if (this.config[c].root == true) {
                        return {
                            srcName: null,
                            srcPage: null,
                            name: this.config[c].id,
                            page: this.config[c].page,
                            params: this.config[c].params,
                            options: this.utils.mergeObject(this.utils.deepCopy(this.config[c].options), PUSH_ANIMATE),
                            done: (data)=> {
                                if (this.config[c].done)
                                    try {
                                        this.config[c].done(data)
                                    } catch (e) {
                                        this.debug(e)
                                    }
                            },
                        }
                    }
                }
            }
        }
    }

    public next(config = null): Promise < any > {
        if (config) {
            if (!this.setNextPage(config))
                return new Promise((resolve, reject)=> {
                    reject(PAGE_FORBIDDEN)
                })
        }
        let _getNext = this.getNextPage()

        let lastView = this.app.getRootNav().last(), currentPage = this.getPageConfig(lastView ? lastView.instance : null)

        if (_getNext) {
            if (Event.emit('push', {
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
                return new Promise((resolve, reject)=> {
                    reject(EVENT_PREVENTED)
                })
        }


        if (this.nextPage && (!currentPage || !currentPage.next || (currentPage.next.force != true))/*&& this.utils.notNull(this.nextPage.page)*/) {
            let _nextPage = this.nextPage;
            this.nextPage = null;
            //alert(JSON.stringify(this.nextPage))
            //alert(JSON.stringify(this.nextPage))
            //alert(_nextPage.page)
            if (_nextPage.page)
                return this.app.getRootNav().push(_nextPage.page, _nextPage.params, _nextPage.options).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    let removeCount = this.cleanupPopStack(_nextPage.srcPage)
                    //alert(_nextPage.srcName)
                    this.pushState()
                    removeCount = 0
                    if (removeCount > 0) {
                        this.disableOnpopstate()
                        window.history.go(-removeCount)
                        // setTimeout(()=> {
                        //   this.enableOnpopstate()
                        // }, 0)
                    }
                    this.tokenHook()

                    if (_nextPage.done)
                        try {
                            _nextPage.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                    if (_nextPage.done)
                        try {
                            _nextPage.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                        } catch (e) {
                            this.debug(e)
                        }
                })
            else {
                //alert(_nextPage.srcName)
                return this.popStack(_nextPage.srcPage).then(()=> {
                    this.pushState(true)
                    this.tokenHook()
                })
            }
        } else {
            this.nextPage = null;
            if (currentPage && currentPage.next) {
                let nextConfig = this.getPageConfig(currentPage.next.name)
                let _done = !currentPage.next.done ? (nextConfig ? nextConfig.done : null) :
                    (hasCompleted, isAsync, enteringName, leavingName, direction)=> {
                        if ((nextConfig ? nextConfig.done : null))
                            try {
                                (nextConfig ? nextConfig.done : null)(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                        if (currentPage.next.done)
                            currentPage.next.done(hasCompleted, isAsync, enteringName, leavingName, direction)
                    }
                return this.app.getRootNav().push(
                    this.getPage(currentPage.next.name),
                    !nextConfig.next.params ? (nextConfig ? nextConfig.params : null) : this.utils.mergeObject(currentPage.next.params, (nextConfig ? nextConfig.params : null)),
                    !nextConfig.next.options ? (nextConfig ? this.utils.mergeObject(this.utils.deepCopy(nextConfig.options), PUSH_ANIMATE) : PUSH_ANIMATE) : this.utils.mergeObject(currentPage.next.options, (nextConfig ? this.utils.mergeObject(this.utils.deepCopy(nextConfig.options), PUSH_ANIMATE) : PUSH_ANIMATE), PUSH_ANIMATE))
                    .then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        let removeCount = this.cleanupPopStack()
                        this.pushState()
                        removeCount = 0
                        if (removeCount > 0) {
                            this.disableOnpopstate()
                            window.history.go(-removeCount)
                            // setTimeout(()=> {
                            //   this.enableOnpopstate()
                            // })
                        }
                        this.tokenHook()
                        if (_done)
                            try {
                                _done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                        if (_done)
                            try {
                                _done(hasCompleted, isAsync, enteringName, leavingName, direction)
                            } catch (e) {
                                this.debug(e)
                            }
                    })
            }
            else {
                for (let c in this.config) {
                    if (this.config[c].root == true) {
                        return this.app.getRootNav().push(this.config[c].page, this.config[c].params, this.utils.mergeObject(this.utils.deepCopy(this.config[c].options), PUSH_ANIMATE)).then((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                            this.cleanupPopStack(undefined, true)
                            let removeCount = this.cleanupPopStack()
                            this.pushState()
                            removeCount = 0
                            if (removeCount > 0) {
                                this.disableOnpopstate()
                                window.history.go(-removeCount)
                                // setTimeout(()=> {
                                //   this.enableOnpopstate()
                                // })
                            }
                            this.tokenHook()
                            if (this.config[c].done)
                                try {
                                    this.config[c].done(hasCompleted, isAsync, enteringName, leavingName, direction)
                                } catch (e) {
                                    this.debug(e)
                                }
                        }).catch((hasCompleted?, isAsync?, enteringName?, leavingName?, direction?)=> {
                            if (this.config[c].done)
                                try {
                                    this.config[c].done(hasCompleted, isAsync, enteringName, leavingName, direction)
                                } catch (e) {
                                    this.debug(e)
                                }
                        })
                    }
                }
            }
        }

        return new Promise((resolve, reject)=> {
            reject(NO_NEXT_PAGE)
        })

    }

    private debug(arg1) {
        if (DEBUG) {
            console.debug(arg1)
        }
    }
}
