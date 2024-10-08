import type { OptionType, ParentExtendType } from './types';
export declare const getUnit: (prop: string | string[], opts: OptionType) => string | undefined;
export declare const createPxReplace: (opts: OptionType, viewportUnit: string | number, viewportSize: number) => (m: any, $1: string) => any;
export declare const toFixed: (number: number, precision: number) => number;
export declare const blacklistedSelector: (blacklist: string[], selector: string) => boolean | undefined;
export declare const isExclude: (reg: RegExp, file: string) => boolean;
export declare const declarationExists: (decls: ParentExtendType[], prop: string, value: string) => boolean;
export declare const validateParams: (params: string, mediaQuery: boolean) => boolean | "";
