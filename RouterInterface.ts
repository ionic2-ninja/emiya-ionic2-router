import {CanPush} from './CanPush';

export interface RouterInterface {
    setVersion(name: string, increment: number): void;
    load(config: any, name: string, increment: number): Promise<any>;
    getBannedPageConfig(name: any): any;
    checkIfBanned(name: any): boolean;
    setExitHook(cb: Function, prior: number): void;
    setNextPage(_config: any): boolean;
    canPush(name: any): CanPush;
    push(name: any, params?: any, options?: any, done?: Function): Promise<any>;
    getGoBackPage(): any;
    canGoBack(): boolean;
    getRootPageConfig(): any;
    pop(options: any, done: Function, doNotGoHistory: boolean): Promise<any>;
    popSafe(options: any, done: Function, doNotGoHistory: boolean): Promise<any>;
    popToRootPage(options: any, done: Function): Promise<any>;
    popToRoot(options: any, done: Function): Promise<any>;
    popTo(view: any, options: any, done: Function): Promise<any>;
    getNextPage(): any;
    next(config: any): Promise<any>;
    setBackgroundTimeout(timeout: number): void;
    setResumeTimeout(timeout: number): void;
}