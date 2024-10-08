import { OptionType } from './types';
import { Root } from 'postcss';
declare const postcssPxToViewport: {
    (options: OptionType): {
        postcssPlugin: string;
        Once(css: Root, { result }: {
            result: any;
        }): void;
        OnceExit(css: Root, { AtRule }: {
            AtRule: any;
        }): void;
    };
    postcss: boolean;
};
export default postcssPxToViewport;
