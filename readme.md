#Emiya Ionic2 Router

####English readme will come soon

##How to install
```
npm install --save emiya-ionic2-router
```


## Features

####集成与路由相关的各种功能，包括以下:

* 统一配置的路由表
* 基于url的页面路由
* 浏览器后退及android hardware back button事件监视支持，并提供应用退出回调接口
* 智能管理页面路由(需要登录的页面/不需要登录页面/登录页/首次引导页 的互相切换管理)
* 提供push/pop类型操作的事件接口，可以实现事件监听及拦截操作
* 支持页面后退行为(pop)的强制指定配置

### 路由表配置

```
import {TabsPage} from '../pages/TabsPage/TabsPage';
import {PwdLoginPage} from '../pages/PwdLoginPage/PwdLoginPage';
import {MyPraisePage} from '../pages/MyPraisePage/MyPraisePage';
import {AgreementPage} from '../pages/AgreementPage/AgreementPage';
import {WelCome} from '../pages/WelCome/WelCome';
import {HomePage} from '../pages/HomePage/HomePage';
import {FindPage} from '../pages/FindPage/FindPage';

export const Routes = {
   //主页配置例子
  'Tabs': {//页面的唯一标识
    page: TabsPage, //页面的对应的component
    params: {index:1}, //页面初始化的默认参数,该参数随后可通过ionic2提供的NavParams服务取得
    options: {duration:0},  //跳转页面时的默认选项,具体参数请参考ionic2文档的navcontroller的option部分
    done: null,  //跳转页面时的回调function
    root: true,  //是否是主页(唯一)
    url: '/tabs',  //页面的url标识(唯一,支持restful风歌,如/tabs/:uuid/:name)，如果不配置则默认页面url标识为 /{页面唯一标识}
    enable: true  //该页面是否启用
    title: '主页', //页面title
  },
  //登陆页配置例子
  'PwdLogin': {
    page: PwdLoginPage,
    params: null,
    options: null,
    done: null,
    tokens: ['token', 'uuid'],  //该页面所关联的token
    tokensLocation: ['local', 'local'], //该页面所关联token的存放位置，默认就是local(本地存储)，可选为session(回话存储)
    reverse: true, //true表示当页面所关联的token存在时，该页面不允许进入，默认false
    next: { //在不满足进入该页面token条件的情况下尝试进入该页面时抑或是当前页面是该页面时token条件满足了的情况下导向的下一个页面(非必要配置项，配置该选项时reverse参数必须为true)
      name: 'NewsdetailPage', //下一个页面唯一标识
      params: null,
      options: null,
      done: null,
      force:false  //true表示该配置优先及高于router内部动态管理的目标页面配置，false则表示该配置仅在router内部自动管理的目标页面配置未找到时才生效
    },
    url: '/PwdLoginPage'，
    title: '密码登陆页'
  },

  //需要已登录状态页面的配置例子
  'MyPraise': {
    page: MyPraisePage,
    params: null,
    options: null,
    done: null,
    tokens: ['token', 'uuid'],
    redirect: { //在不满足进入该页面token条件的情况下尝试进入该页面时导向的下一个页面(配置该选项时reverse参数必须为false，或者不配置)
      name: 'CodeLoginPage',
      params: null,
      options: null,
      done: null
    },
    url: '/myPraise',
    title: '我的点赞'
  },

   //普通页面的配置例子
  'Agreement': {
    page: AgreementPage,
    url: '/agreementPage',
    title: '用户协议',
    pop: { //当用户在此页面点击返回按钮时且当前页面栈里找不到上一级页面时的指定跳转页面（非必须配置）
      name: 'TabsPage',
      params: null,
      options: null,
      done: null,
      force:false //true表示无论页面栈里有没有上一级页面都强制跳向配置页，默认为false
    }
  },


  //首次引导页配置例子
  'WelCome': {
    page: WelComePage,
    url: '/weleome',
    pop: {
      name: 'TabsPage',
      params: null,
      options: null,
      done: null
    },
    guide: { //该选项表示该页是首次引导页
      always: false, //true表示每次进入app均显示此页，默认false
      duration: 6000 //表示在6000毫秒后自动跳向主页，默认不自动跳转
    },
    title: '欢迎',
  },


  //最小化路由配置例子
  'homeIndexTab': {
    page: HomePage,
  },
  'homeIndexTab': {
    page: FindPage,，
    url:'/findIndex'
  }

}
```

### 路由表加载

```
import {Router} from 'emiya-ionic2-router';
import {Routes} from 'Routes';

@Component({
  template: `<ion-nav></ion-nav>`
})
export class MyApp {

constructor(platform: Platform, router: Router,) {
    router.setVersion('Hello World',10000) //在加载路由之前手动告诉router当前应用的内部版本号，（这步可忽略，此时router会自动尝试通过cordova插件 cordova-plugin-app-version去获取相应信息）
    router.load(Routes); //加载路由，
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }
}
```

### push&pop实例

```
import {Router} from 'emiya-ionic2-router';
import {MyPraisePage} from '../pages/MyPraisePage/MyPraisePage';

export class TabsPage {

constructor(router: Router) {
    //通过页面唯一标识跳转
    router.push('MyPraise',{index:2},{duration:500},(hasCompleted, isAsync, enteringName, leavingName, direction)=>{//stuff when done})
    
    //通过页面url标识跳转
    router.push('/myPraise',{index:2},{duration:500})
    .then((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    .catch((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    
    //直接通过component跳转
    router.push(MyPraisePage,{index:2},{duration:500})
    
    //后退操作
    router.pop().then((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    .catch((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    
    router.pop({duration:0},(hasCompleted, isAsync, enteringName, leavingName, direction)=>{//stuff when done})
    
    router.pop({duration:0})
    
  }
}
```

### Token的设置与删除

```
import {Router} from 'emiya-angular2-token';

export class TabsPage {

constructor() {
    //set tokon
    Token.set('uuid','fasfasjfasjlk9312jkkfasjfaskl')
    Token.set('token','fasfasjfasjlk9312jkkfasjfaskl')
    //delete token
    Token.delete('uuid')
    Token.delete('token')
    //check if token exists
    Token.has('uuid')   //true or false
    Token.has('token')
  }
}
```

### 路由事件监听&拦截实例
```
import {Router} from 'emiya-ionic2-router';
import {Event} from 'emiya-angular2-event';

export class MyApp {

constructor(router: Router) {
    //push事件监听
    let pushListenr=EventSync.subscribe('push',(ev,data)=>{})
    //pop事件监听
    EventSync.subscribe('pop',(ev,data)=>{})
    
    //事件监听取消
    pushListenr.unsubscribe()
  }
}
```

######路由事件ev参数
```
preventDefault:执行preventDefault()表示阻止事件对应操作的发生
stopPropagation：执行stopPropagation()表示阻止该事件在监视链往后的广播
defaultPrevented：preventDefault操作会设置该参数为true，默认false
propagationPrevented：stopPropagation操作会设置该参数为true，默认false
```

######路由事件data参数
```
fromPage:表示当前页面
toPage：表示将要进入的页面
callParams：事件对应的push或pop操作的相关调用参数
callerName：触发该事件的方法名称
instance：触发该事件的方法
canPush：表示该push操作是否允许（如果页面需要被重定向则为false）,此参数仅限push事件才有
canGoBack：表示该pop操作是否允许,此参数仅限pop事件才有
preventDefault:执行preventDefault()表示阻止事件对应操作的发生
stopPropagation：执行stopPropagation()
```


### 自定义退出应用行为实例
```
import {Router} from 'emiya-ionic2-router';

export class MyApp {

constructor(router: Router) {
    router.setExitHook(()=>{
     return true //返回true表示继续执行退出应用的操作，false反之
    },101 /*优先级，默认为101，仅android原生app运行环境生效*/)
  }
}
```

### 全局状态码

* -200该操作事件被阻止
* -210由于当前正在执行其他页面切换操作，因此不允许此操作
* -220应用退出操作被阻止
* -230next操作无法找到合适的目标跳转页
* -240尝试进入被禁用的页面
* -250找不到页面对应路由配置项
* -260找不到页面对应路由配置项
* -270所需token不存在时的重定向页面未配置
* -280所需token不存在时的重定向页面未配置
* -300应用退出
* -400进入应用加载首页的操作被重载

* false表示该错误由ionic2&angular2所抛出
* true表示成功


### Api Referrences(todo..)


