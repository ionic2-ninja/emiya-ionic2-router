#Emiya Ionic2 Router

##How to install
```
npm install --save emiya-ionic2-router
cordova plugin add cordova-plugin-app-version (optional but strongly recommanded)
```


## Features

* config the route in one place
* support url route just like what ionic1 did
* support id route
* support onpopstate event in browser(pop by clicking back button)
* support android hardware back button hook to customize app exit behavior
* intelligently route between (login/non-login/login-required/normal/guide/home) pages
* provide push/pop event,support event prevention
* support pop behavior customization for each page
* manage page access based on [Token](https://github.com/ionic2-ninja/emiya-angular2-token)
* support app backgroud auto kill and auto restart

##[>>>demo here<<<](https://github.com/ionic2-ninja/ionic2-demo)



## Usage


##### route configuration

```
//import all the componets you want to route 
import {TabsPage} from '../pages/TabsPage/TabsPage';
import {PwdLoginPage} from '../pages/PwdLoginPage/PwdLoginPage';
import {MyFavourPage} from '../pages/MyPraisePage/MyFavourPage';
import {AgreementPage} from '../pages/AgreementPage/AgreementPage';
import {WelCome} from '../pages/WelCome/WelCome';
import {HomePage} from '../pages/HomePage/HomePage';
import {FindPage} from '../pages/FindPage/FindPage';

export const Routes = {
   //homepage example
  'Tabs': {//identity for page
    page: TabsPage, //component of this page
    params: {index:1}, //optional,default page params(see ionic2/NavParams for more)
    options: {duration:0},  //optional,nav options(see ionic2 doc/navcontroller for more)
    done: function(ev){do something..},  //optional,callback after push complete
    root: true,  //is it homepage?true or false,must be unique,default is false
    url: '/tabs',  //url schema for this page(must be unique,support restful style,like /tabs/:uuid/:name),leave it null  equal to set url to "/{{pageIdentity}}"
    enable: true  //is this page enabled?true or false,default is true
    title: 'Homepage', //optional,title for this page,default is "/{{pageIdentity}}"(for now is just a descrition)
  },
  
  //login page example
  'PwdLogin': {
    page: PwdLoginPage,
    reverse: true, //optional,true or false(default),use together with option [tokens]
    tokens: ['token', 'uuid'],  //when option [reverse] = false,to access this page we need 2 tokens which call 'token' & 'uuid',the other way,we can only access the page when these 2 tokens inexist. 
    tokensLocation: ['local', 'local'], //optional,local(default)/session,the location of the token
    next: {//optional,this only works when option [reverse]=true and [tokens] has been set.Router will try to redirect to the page you config here when : ((try to access the page without meet the token condition)||(login success))&&((the router can not determine the proper next target page)||(next.force==true)) 
      name: 'TabsPage', //next page's id
      params: null,
      options: null,
      done: null,
      force:false  //optional,true or false(default),set to true tells the Router page config here has a higher prior then the target page which determine by router
    },
    url: '/PwdLoginPage'，
    title: 'Password Login'
  },

  //login-required page example
  'MyFavour': {
    page: MyFavourPage,
    params: null,
    options: null,
    done: null,
    tokens: ['token', 'uuid'],
    redirect: { //Router will redirect to the page you config here when you try to access the page without meet the token condition
      name: 'PwdLoginPage',
      params: null,
      options: null,
      done: null
    },
    url: '/myFavour/:userid/:catagory',
    title: 'MyFavour'
  },

   //normal page example
  'Agreement': {
    page: AgreementPage,
    url: '/agreementPage',
    title: 'user_agreement',
    pop: { //optional,when user try to pop from this page but there is no previous page in the navStack,router will redirect(fake pop animation) to page config here
      name: 'TabsPage',
      params: null,
      options: null,
      done: null,
      force:false //optional,true or false(default),set to true means always pop to the page config here 
    }
  },


  //guide page example
  'WelCome': {
    page: WelComePage,
    url: '/weleome',
    pop: {
      name: 'TabsPage',
      params: null,
      options: null,
      done: null
    },
    guide: { //mean it is a guide page
      always: false, //optional,true or false(default).when true,guide page will show each time you open app,when false,it only show when app first installed or updated
      duration: 6000 //optional,will leave guide page automatically after 6000 ms,default is never leave automatically
    },
    title: 'welcome',
  },


  //minimal config example
  'homeIndexTab': {
    page: HomePage,
  }

}
```

### load Router Globally
```
import {Router} from 'emiya-ionic2-router'

@NgModule({
 providers: [Router]
})
```


### load configuration

```
import {Router} from 'emiya-ionic2-router';
import {Routes} from 'Routes';

@Component({
  template: `<ion-nav></ion-nav>`
})
export class MyApp {

constructor(platform: Platform, router: Router,) {
    let result=router.load(Routes); //load config
    let result=router.load(Routes,'Hello World',10000); //load route config and appversion info
    result.then((ev)=>{}).catch((err)=>{}) //it's a promise which tell you whether the first page is being pushed successfully or not
    platform.ready().then(() => {
      StatusBar.styleDefault();
      Splashscreen.hide();
    });
  }
}
```

#####Important: router.load() will load home/first page automatically,so DO NOT set it in any other place!


### how to push&pop

```
import {Router} from 'emiya-ionic2-router';
import {MyFavour} from '../pages/MyFavourPage/MyFavourPage';

export class TabsPage {

constructor(router: Router) {
    //push via id
    router.push('MyFavour',{index:2,userid:'user001',catagory:'cata002'},{duration:500},(hasCompleted, isAsync, enteringName, leavingName, direction)=>{//stuff when completed})
    
    //push via url
    router.push('/myFavour/user001/cata002',{index:2},{duration:500})
    .then((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    .catch((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    
    //push via component
    router.push(MyFavourPage,{index:2,userid:'user001',catagory:'cata002'},{duration:500})
    
    //pop
    router.pop().then((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    .catch((hasCompleted, isAsync, enteringName, leavingName, direction)=>{})
    
    router.pop({duration:0},(hasCompleted, isAsync, enteringName, leavingName, direction)=>{//stuff when completed})
    
    router.pop({duration:0})
    
    router.popSafe() //pop will fail when there is another page transition happening,it's useful for user-click pop event to avoid some transition bugs
    
  }
}
```

### How to set and delete token

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
#####more can be found [emiya-angular2-token](https://github.com/ionic2-ninja/emiya-angular2-token)

### route event listen&intercept example
```
import {Router} from 'emiya-ionic2-router';
import {Event} from 'emiya-angular2-event';

export class MyApp {

constructor(router: Router) {
    //push event
    let pushListenr=Event.subscribe('push',(ev,data)=>{})
    //pop event
    Event.subscribe('pop',(ev,data)=>{})
    
    //app exit event
    Event.subscribe('appWillExit',(ev,data)=>{})
    
    //unlisten to event
    pushListenr.unsubscribe()
  }
}
```

##### event parameters

* ev
```
preventDefault():prevent the operation
stopPropagation()：stop the event to propagate
defaultPrevented：default is false,preventDefault() will set it to true
propagationPrevented：default is false,stopPropagation() will set it to true
```

* data
```
fromPage:current page
toPage：the page will transit to
callParams：the original params of push&pop operation
callerName：the name of method which trigger this event
instance：the method which trigger this event
canPush：if the push operation is permitted by router
canGoBack：if the pop operation is permitted by router
```


### customize app exit behavior
```
import {Router} from 'emiya-ionic2-router';

export class MyApp {

constructor(router: Router) {
    router.setExitHook(()=>{
     return true //true will exit app,otherwise prevent it
    },101 /*optional,hook prior，default is 101，only work in android runtime*/)
  }
}
```

### global status code

* -200 operation is prevented
* -210 operation is not permitted because of another page transition
* -220 app exit is prevented
* -230 next()can not found a proper next page
* -240 try to push a page which is disabled
* -250 can not found page config
* -260 can not found page config
* -270 can not found redirect page config
* -280 can not found redirect page config
* -300 app exited
* -310 attempt to enter a token inrequired page with token alreay existed
* -400 fail to push first page because it's overrided by another transition 

* false throw by ionic2&angular2 stock api
* true success


### Api Referrences(to be continued..)
```
setBackgroundTimeout(number?) //unit is ms,app will kill itself after run in background for {{number}} ms,default value is -1(never kill itself)
```

```
setResumeTimeout(number?) //unit is ms,app will reload and navigate to homepage when it stay in background for over {{number}} ms and resume to frontend,default value is -1(never reload)
```
